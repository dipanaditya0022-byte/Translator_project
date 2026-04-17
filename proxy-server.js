// ============================================
//  AZURE TRANSLATOR — PROXY SERVER
//  Supports local static files + /api/* proxy
// ============================================

const http  = require("http");
const https = require("https");
const fs    = require("fs");
const path  = require("path");
const url   = require("url");

const PORT       = 3000;
const AZURE_HOST = "api.cognitive.microsofttranslator.com";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
};

function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, X-ClientTraceId, X-Azure-Key, X-Azure-Region"
  );
}

function sendJson(res, status, payload) {
  setCORS(res);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function proxyAzure(req, res, azurePath) {
  let body = "";

  req.on("data", chunk => (body += chunk));
  req.on("end", () => {
    const azureKey    = (req.headers["x-azure-key"] || "").trim();
    const azureRegion = (req.headers["x-azure-region"] || "").trim();

    if (!azureKey || !azureRegion) {
      return sendJson(res, 400, {
        error: {
          code: 400,
          message: "Missing Azure key or region. Open Settings and enter both values."
        }
      });
    }

    const options = {
      hostname: AZURE_HOST,
      path: azurePath,
      method: req.method,
      headers: {
        "Ocp-Apim-Subscription-Key": azureKey,
        "Ocp-Apim-Subscription-Region": azureRegion,
        "Content-Type": "application/json; charset=UTF-8",
        "X-ClientTraceId": req.headers["x-clienttraceid"] || "",
      },
    };

    console.log(
      `[PROXY → AZURE] ${req.method} ${azurePath} | region=${azureRegion} | key=${azureKey.slice(0, 8)}...`
    );

    const azureReq = https.request(options, azureRes => {
      let responseBody = "";

      azureRes.on("data", chunk => (responseBody += chunk));
      azureRes.on("end", () => {
        console.log(`[AZURE RESPONSE] ${azureRes.statusCode}`);

        if (azureRes.statusCode >= 400) {
          console.log(`[AZURE ERROR BODY] ${responseBody}`);
        }

        setCORS(res);
        res.writeHead(azureRes.statusCode, {
          "Content-Type": azureRes.headers["content-type"] || "application/json; charset=utf-8",
        });
        res.end(responseBody);
      });
    });

    azureReq.on("error", e => {
      console.error("[AZURE REQUEST ERROR]", e.message);
      sendJson(res, 502, {
        error: {
          code: 502,
          message: `Proxy could not reach Azure: ${e.message}`,
        }
      });
    });

    if (body) azureReq.write(body);
    azureReq.end();
  });
}

// maps /css/style.css -> /style.css etc if project is flat
function resolveStaticPath(requestPath) {
  const cleanPath = requestPath === "/" ? "/index.html" : requestPath.split("?")[0];
  const cwd = process.cwd();

  const direct = path.join(cwd, cleanPath);
  if (fs.existsSync(direct) && fs.statSync(direct).isFile()) {
    return direct;
  }

  const basename = path.basename(cleanPath);
  const flat = path.join(cwd, basename);
  if (fs.existsSync(flat) && fs.statSync(flat).isFile()) {
    return flat;
  }

  return null;
}

function serveStatic(req, res) {
  const requestedPath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const fullPath = resolveStaticPath(requestedPath);

  if (!fullPath) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(`404: ${requestedPath}`);
    return;
  }

  const ext = path.extname(fullPath).toLowerCase();
  const mime = MIME[ext] || "application/octet-stream";

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(`500: Failed to read ${requestedPath}`);
      return;
    }

    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  if (req.method === "OPTIONS") {
    setCORS(res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (pathname.startsWith("/api/")) {
    const azurePath = "/" + pathname.slice(5) + (parsed.search || "");
    proxyAzure(req, res, azurePath);
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║   Azure Translator — Proxy Server       ║");
  console.log(`║   Open: http://localhost:${PORT}              ║`);
  console.log("║   Ctrl+C to stop                        ║");
  console.log("╚══════════════════════════════════════════╝\n");
});