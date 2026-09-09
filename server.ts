import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";

process.on("uncaughtException", (err) => {
  console.error("[server] Uncaught Exception:", err);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("[server] Unhandled Rejection at:", promise, "reason:", reason);
});

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : (process.env.DEFAULT_APP_PORT ? parseInt(process.env.DEFAULT_APP_PORT, 10) : 8080);

// 1. START LISTENING INSTANTLY so Cloud Run health checks never timeout on boot
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`[server] Express listening instantly on port ${PORT}`);
});

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

app.post("/api/parse-voice", async (req, res) => {
  try {
    const { text, audioBase64, mimeType, activeContext, carProfile } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: "GEMINI_API_KEY não configurada no servidor." });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Você é um assistente especializado em extrair dados de registros de motorista de aplicativo (Uber, 99, Particular, KM rodados, bateria restante %, custos de energia, despesas de carro e alimentação).
Contexto atual: Data padrão ${activeContext?.defaultDate || new Date().toISOString().slice(0, 10)}, Veículo: ${carProfile?.modelName || 'Elétrico'}.
Texto do usuário: "${text || ''}"

Retorne estritamente um objeto JSON válido (sem markdown extra, sem blocos de código) com a seguinte estrutura:
{
  "date": "${activeContext?.defaultDate || new Date().toISOString().slice(0, 10)}",
  "isDayOff": false,
  "kmRodado": 0,
  "sobrouBateria": null,
  "custoEnergia": 0,
  "app99": { "rides": 0, "earnings": 0, "bonus": 0 },
  "appUber": { "rides": 0, "earnings": 0, "bonus": 0 },
  "appParticular": { "rides": 0, "earnings": 0 },
  "recompensasExtra": 0,
  "outrasFontes": 0,
  "carExpenses": { "wash": 0, "toll": 0, "maintenance": 0, "parking": 0, "other": 0 },
  "foodExpenses": { "lunch": 0, "dinner": 0, "snacks": 0, "coffee": 0 }
}`;

    const contents: any[] = [prompt];
    if (audioBase64) {
      const base64Data = audioBase64.includes(",") ? audioBase64.split(",")[1] : audioBase64;
      contents.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType || "audio/webm"
        }
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
    });

    const rawText = response.text || "{}";
    const cleaned = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    res.json(parsed);
  } catch (e: any) {
    console.error("[server] /api/parse-voice error:", e);
    const msg = e.message || String(e);
    if (msg.includes("ResourceExhausted") || msg.includes("quota") || msg.includes("resource_exhausted")) {
      return res.status(429).json({ error: "Cota do Gemini excedida (Resource Exhausted). Por favor, aguarde o reset do limite da API ou verifique seu plano em https://ai.google.dev/gemini-api/docs/rate-limits." });
    }
    res.status(500).json({ error: msg });
  }
});

app.post("/api/extract-receipt", async (req, res) => {
  try {
    const { files, textData, activeContext, carProfile } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: "GEMINI_API_KEY não configurada no servidor." });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Você é um assistente especializado em extrair dados de recibos, faturas de cartão, painel de veículos e aplicativos de motorista (Uber, 99, Alimentação, Combustível/Bateria).
Contexto atual: Data padrão ${activeContext?.defaultDate || new Date().toISOString().slice(0, 10)}.
Dados textuais ou recibos fornecidos:
${textData || ''}

Retorne estritamente um objeto JSON (ou array sob a chave "results") contendo os dados extraídos no formato:
{
  "results": [{
    "date": "${activeContext?.defaultDate || new Date().toISOString().slice(0, 10)}",
    "isDayOff": false,
    "kmRodado": 0,
    "sobrouBateria": null,
    "custoEnergia": 0,
    "app99": { "rides": 0, "earnings": 0, "bonus": 0 },
    "appUber": { "rides": 0, "earnings": 0, "bonus": 0 },
    "appParticular": { "rides": 0, "earnings": 0 },
    "recompensasExtra": 0,
    "outrasFontes": 0,
    "carExpenses": { "wash": 0, "toll": 0, "maintenance": 0, "parking": 0, "other": 0 },
    "foodExpenses": { "lunch": 0, "dinner": 0, "snacks": 0, "coffee": 0 }
  }]
}`;

    const contents: any[] = [prompt];
    if (files && Array.isArray(files)) {
      for (const f of files) {
        if (f.imageBase64) {
          const b64 = f.imageBase64.includes(",") ? f.imageBase64.split(",")[1] : f.imageBase64;
          contents.push({
            inlineData: {
              data: b64,
              mimeType: f.mimeType || "image/jpeg"
            }
          });
        }
      }
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
    });

    const rawText = response.text || "{}";
    const cleaned = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    res.json(parsed);
  } catch (e: any) {
    console.error("[server] /api/extract-receipt error:", e);
    const msg = e.message || String(e);
    if (msg.includes("ResourceExhausted") || msg.includes("quota") || msg.includes("resource_exhausted")) {
      return res.status(429).json({ error: "Cota do Gemini excedida (Resource Exhausted). Por favor, aguarde o reset do limite da API ou verifique seu plano em https://ai.google.dev/gemini-api/docs/rate-limits." });
    }
    res.status(500).json({ error: msg });
  }
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

// Setup static or vite middleware
if (isProduction) {
  const distPath = getDistPath();
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
} else {
  import("vite").then(async ({ createServer: createViteServer }) => {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("[server] Vite dev middleware attached");
  }).catch(err => {
    console.error("[server] Failed to start Vite dev server:", err);
  });
}
