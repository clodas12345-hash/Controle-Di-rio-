import express from "express";
import path from "path";
import fs from "fs";

process.on("uncaughtException", (err) => {
  console.error("[server] Uncaught Exception:", err);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("[server] Unhandled Rejection at:", promise, "reason:", reason);
});

const app = express();

const isProduction = process.env.NODE_ENV === "production" || process.env.PORT !== undefined || fs.existsSync(path.join(process.cwd(), "dist", "index.html"));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const getDistPath = () => {
  return fs.existsSync(path.join(process.cwd(), "dist", "index.html"))
    ? path.join(process.cwd(), "dist")
    : (typeof __dirname !== "undefined" && fs.existsSync(path.join(__dirname, "index.html"))
        ? __dirname
        : process.cwd());
};

// Health check endpoints for Cloud Run
app.get(["/health", "/api/health", "/_health"], (req, res) => {
  res.status(200).json({ status: "ok", mode: isProduction ? "production" : "development" });
});

// Smart root route: serves JSON for health probes, index.html for browser navigation
app.get("/", (req, res) => {
  const accept = req.headers.accept || "";
  if (accept.includes("text/html") && isProduction) {
    const distPath = getDistPath();
    return res.sendFile(path.join(distPath, "index.html"));
  }
  res.status(200).json({ status: "ok", mode: isProduction ? "production" : "development" });
});

app.post("/api/export-backup", (req, res) => {
  try {
    const { content, fileName, mimeType } = req.body;
    if (!content || !fileName) {
      return res.status(400).json({ error: "Conteúdo e nome do arquivo são obrigatórios." });
    }
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    res.setHeader("Content-Disposition", `attachment; filename="${safeFileName}"`);
    res.setHeader("Content-Type", mimeType || "text/csv; charset=utf-8");
    const finalContent = mimeType && mimeType.includes("json") 
      ? content 
      : (content.startsWith("\uFEFF") ? content : "\uFEFF" + content);
    res.send(finalContent);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

async function start() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = getDistPath();
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : (process.env.DEFAULT_APP_PORT ? parseInt(process.env.DEFAULT_APP_PORT, 10) : 8080);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[server] Server running on port ${PORT} (${isProduction ? 'production' : 'development'})`);
  });
}

start().catch(err => {
  console.error("[server] Startup error:", err);
  process.exit(1);
});
