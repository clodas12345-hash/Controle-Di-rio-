import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Permite JSON no body das requisições
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Rota de download direto para compatibilidade com APKs Android (onde WebView bloqueia blob/data URLs)
  app.post("/api/export-backup", (req, res) => {
    try {
      const { content, fileName, mimeType } = req.body;
      if (!content || !fileName) {
        return res.status(400).json({ error: "Conteúdo e nome do arquivo são obrigatórios." });
      }

      const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      res.setHeader("Content-Disposition", `attachment; filename="${safeFileName}"`);
      res.setHeader("Content-Type", mimeType || "text/csv; charset=utf-8");
      
      // Se for CSV, garante BOM UTF-8 para Excel abrir com acentos corretos
      const finalContent = mimeType && mimeType.includes("json") 
        ? content 
        : (content.startsWith("\uFEFF") ? content : "\uFEFF" + content);

      res.send(finalContent);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
