// ============================================
//  AZURE TRANSLATOR — PROXY SERVER
//  Supports 84-character Azure AI Foundry keys
//
//  HOW TO RUN:
//    node proxy-server.js
//  Then open: http://localhost:3000
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
  ".css":  "text/css",
  ".js":   "application/javascript",
  ".json": "application/json",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
};

function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-ClientTraceId, X-Azure-Key, X-Azure-Region");
}

function proxyAzure(req, res, azurePath) {
  let body = "";
  req.on("data", chunk => (body += chunk));
  req.on("end", () => {
    const azureKey    = (req.headers["x-azure-key"]    || "").trim();
    const azureRegion = (req.headers["x-azure-region"] || "").trim();

    if (!azureKey || !azureRegion) {
      setCORS(res);
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { code: 400, message: "X-Azure-Key aur X-Azure-Region headers missing hain" } }));
      return;
    }

    // Azure AI Foundry (84-char keys) needs this endpoint format
    const options = {
      hostname: AZURE_HOST,
      path:     azurePath,
      method:   req.method,
      headers: {
        "Ocp-Apim-Subscription-Key":    azureKey,
        "Ocp-Apim-Subscription-Region": azureRegion,
        "Content-Type": "application/json; charset=UTF-8",
        "X-ClientTraceId": req.headers["x-clienttraceid"] || "",
      },
    };

    console.log(`[PROXY → AZURE] ${req.method} ${azurePath.split("?")[0]}  region=${azureRegion}  key=${azureKey.substring(0,8)}...`);

    const azureReq = https.request(options, azureRes => {
      let responseBody = "";
      azureRes.on("data", chunk => (responseBody += chunk));
      azureRes.on("end", () => {
        console.log(`[AZURE RESPONSE] ${azureRes.statusCode}`);
        if (azureRes.statusCode !== 200) {
          console.log(`[AZURE ERROR] ${responseBody}`);
        }
        setCORS(res);
        res.writeHead(azureRes.statusCode, { "Content-Type": "application/json" });
        res.end(responseBody);
      });
    });

    azureReq.on("error", e => {
      console.error("[AZURE ERROR]", e.message);
      setCORS(res);
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { code: 502, message: e.message } }));
    });

    if (body) azureReq.write(body);
    azureReq.end();
  });
}

function serveStatic(req, res) {
  let filePath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const fullPath = path.join(process.cwd(), filePath);
  const ext  = path.extname(fullPath).toLowerCase();
  const mime = MIME[ext] || "text/plain";

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404: " + filePath);
      return;
    }
    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const parsed   = url.parse(req.url, true);
  const pathname = parsed.pathname;

  if (req.method === "OPTIONS") {
    setCORS(res);
    res.writeHead(204);
    res.end();
    return;
  }

  // All /api/* calls go to Azure
  if (pathname.startsWith("/api/")) {
    const azurePath = "/" + pathname.slice(5) + (parsed.search || "");
    proxyAzure(req, res, azurePath);
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║   Azure Translator — Proxy Server        ║");
  console.log(`║   Open: http://localhost:${PORT}               ║`);
  console.log("║   Ctrl+C to stop                         ║");
  console.log("╚══════════════════════════════════════════╝\n");
});
