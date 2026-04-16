// ============================================
//  AZURE TRANSLATOR PROXY SERVER
//  Run: node proxy-server.js
//  Then open: http://localhost:3000
//
//  Keys are NOT hardcoded here anymore.
//  Frontend dashboard se key & region bheja jata hai
//  X-Azure-Key aur X-Azure-Region headers mein.
// ============================================

const http  = require("http");
const https = require("https");
const fs    = require("fs");
const path  = require("path");
const url   = require("url");

// ── CONFIG ──────────────────────────────────
const PORT       = 3000;
const AZURE_HOST = "adity69.cognitiveservices.azure.com";

// ── MIME TYPES ──────────────────────────────
const MIME = {
  ".html": "text/html",
  ".css":  "text/css",
  ".js":   "application/javascript",
  ".json": "application/json",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
};

// ── CORS HEADERS ────────────────────────────
function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers",
    "Content-Type, X-ClientTraceId, X-Azure-Key, X-Azure-Region, X-Azure-ResourceId");
}

// ── PROXY TO AZURE ──────────────────────────
function proxyAzure(req, res, azurePath) {
  const azureKey        = req.headers["x-azure-key"]        || "";
  const azureRegion     = req.headers["x-azure-region"]     || "";
  const azureResourceId = req.headers["x-azure-resourceid"] || "";

  if (!azureKey || !azureRegion) {
    setCORS(res);
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      error: {
        code: "MissingCredentials",
        message: "Azure API key aur region dashboard Settings mein enter karein (⚙ button)."
      }
    }));
    return;
  }

  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {

    // Build headers — Foundry (84-char) keys need ResourceId header
    const forwardHeaders = {
      "Ocp-Apim-Subscription-Key":        azureKey.trim(),
      "Ocp-Apim-Subscription-Region":     azureRegion.trim(),
      "Ocp-Apim-Subscription-ResourceId": "/subscriptions/03a1dcff-01e1-48e3-a54a-6802d4296c59/resourceGroups/Aditya_3150/providers/Microsoft.CognitiveServices/accounts/adity69",
      "Content-Type":                     "application/json; charset=UTF-8",
      "X-ClientTraceId":                  req.headers["x-clienttraceid"] || "",
    };

    const options = {
      hostname: AZURE_HOST,
      path:     azurePath,
      method:   req.method,
      headers:  forwardHeaders,
    };

    const azureReq = https.request(options, (azureRes) => {
      setCORS(res);
      res.writeHead(azureRes.statusCode, { "Content-Type": "application/json" });
      azureRes.pipe(res);
    });

    azureReq.on("error", (e) => {
      console.error("Azure request error:", e.message);
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    });

    if (body) azureReq.write(body);
    azureReq.end();
  });
}

// ── SERVE STATIC FILES ───────────────────────
function serveStatic(req, res) {
  let filePath = req.url === "/" ? "/index.html" : req.url;
  filePath = filePath.split("?")[0];

  const fullPath = path.join(process.cwd(), filePath);
  const ext      = path.extname(fullPath);
  const mime     = MIME[ext] || "text/plain";

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found: " + filePath);
      return;
    }
    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  });
}

// ── MAIN SERVER ──────────────────────────────
const server = http.createServer((req, res) => {
  const parsed   = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // Preflight
  if (req.method === "OPTIONS") {
    setCORS(res);
    res.writeHead(204);
    res.end();
    return;
  }

  // Proxy API calls
  if (pathname.startsWith("/api/")) {
    // Foundry endpoint needs /translator/text/v3.0/... path format
    const apiPart = pathname.slice(5); // remove /api/
    const azurePath = "/translator/text/v3.0/" + apiPart + (parsed.search || "");
    console.log(`[PROXY] ${req.method} ${azurePath}`);
    proxyAzure(req, res, azurePath);
    return;
  }

  // Static files
  console.log(`[STATIC] ${pathname}`);
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║   Azure Translator Proxy Server              ║");
  console.log(`║   Running at: http://localhost:${PORT}          ║`);
  console.log("║   Keys: Enter from Dashboard ⚙ Settings      ║");
  console.log("║   Press Ctrl+C to stop                       ║");
  console.log("╚══════════════════════════════════════════════╝");
});