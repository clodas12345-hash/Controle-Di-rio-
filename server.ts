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

app.post(["/api/extract-receipt", "/api/analyze-receipt", "/api/parse-receipt", "/api/extract-image"], async (req, res) => {
  try {
    const { files, textData, text, prompt: customPrompt, image, imageBase64, images, photos, activeContext, carProfile } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: "GEMINI_API_KEY não configurada no servidor." });
    }

    const ai = new GoogleGenAI({ apiKey });
    const systemPrompt = `Você é o assistente inteligente oficial do GKD Controle Diário, especializado na leitura e extração rigorosa de dados operacionais e financeiros para motoristas de aplicativo.

DIRETRIZES E REGRAS DE EXTRAÇÃO:
1. 📸 PAINEL DE VEÍCULOS:
   - Bateria Restante (%): Porcentagem de bateria restante (ex: 89) e autonomia estimada em km.
   - Trip A: Quilometragem parcial em km (ex: 29.1).
   - Odômetro (ODO): Quilometragem total acumulada (ex: 168786).
   - Desconsidere outras informações (velocidade média, Trip B, relógio, etc.).

2. 📱 APLICATIVO DA UBER:
   - Dia: Dia do mês correspondente ao ganho selecionado.
   - Valor: Ganho total exibido em destaque no topo da tela.
   - Quantidade de Viagens: Número de viagens realizadas.

3. 📱 APLICATIVO DA 99:
   - Valor: Se tela inicial/painel, ganho total no topo. Se tela de detalhamento ("Seus ganhos"), SOMAR rigorosamente: Valor da solicitação + Recompensa + Gorjeta + Compensação + Outro.
   - Quantidade de Viagens (Solicitações): Quantidade de solicitações/corridas realizadas.

4. 🍽️ FATURAS / EXTRATOS DE ALIMENTAÇÃO:
   - Foco EXCLUSIVO em alimentação (padarias, restaurantes, lanchonetes, bares, confeitarias, lanches, iFood).
   - DESCONSIDERAR combustível, locadoras, assinaturas de tecnologia/cloud, loterias, farmácias e compras parceladas.
   - Nomes de Pessoa Física (MEIs/pequenas barracas): considerar como alimentação APENAS se o valor for até R$ 50,00. Valores de Pessoa Física acima de R$ 50,00 devem ser desconsiderados.
   - Classifique por refeição: café da manhã (padaria/café), almoço (restaurante/PF), lanche da tarde (confeitaria/lanche), jantar (bar/pizza/noite).

5. 📱 COCKPIT COMBINADO (Veículo + 99 + Uber):
   - Extraia os dados do veículo (bateria %, Trip A, ODO), 99 (ganho, viagens) e Uber (ganho, viagens) simultaneamente.

Contexto atual: Data padrão ${activeContext?.defaultDate || new Date().toISOString().slice(0, 10)}, Veículo: ${carProfile?.modelName || 'BYD D1'}.
Texto complementar: ${textData || text || customPrompt || ''}

Retorne estritamente um objeto JSON válido (sem tags markdown, sem explicações adicionais) com a seguinte estrutura:
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

    const contents: any[] = [systemPrompt];

    // Collect all image inputs from any supported format
    const rawImages: { base64: string; mimeType?: string }[] = [];

    if (files && Array.isArray(files)) {
      for (const f of files) {
        if (f.imageBase64 || f.base64Data) {
          rawImages.push({ base64: f.imageBase64 || f.base64Data, mimeType: f.mimeType });
        }
      }
    }
    if (images && Array.isArray(images)) {
      for (const img of images) {
        if (typeof img === 'string') rawImages.push({ base64: img });
        else if (img?.imageBase64 || img?.base64) rawImages.push({ base64: img.imageBase64 || img.base64, mimeType: img.mimeType });
      }
    }
    if (photos && Array.isArray(photos)) {
      for (const p of photos) {
        if (typeof p === 'string') rawImages.push({ base64: p });
        else if (p?.imageBase64 || p?.base64) rawImages.push({ base64: p.imageBase64 || p.base64, mimeType: p.mimeType });
      }
    }
    if (image && typeof image === 'string') {
      rawImages.push({ base64: image });
    }
    if (imageBase64 && typeof imageBase64 === 'string') {
      rawImages.push({ base64: imageBase64 });
    }

    for (const item of rawImages) {
      const b64 = item.base64.includes(",") ? item.base64.split(",")[1] : item.base64;
      contents.push({
        inlineData: {
          data: b64,
          mimeType: item.mimeType || "image/jpeg"
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
