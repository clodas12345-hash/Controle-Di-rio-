import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import heicConvert from "heic-convert";

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

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const promptText = `Você é um assistente especializado em extrair dados de registros de motorista de aplicativo (Uber, 99, Particular, KM rodados, bateria restante %, custos de energia, despesas de carro e alimentação).
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

    const parts: any[] = [];
    if (audioBase64) {
      let cleanAudioB64 = audioBase64.includes(",") ? audioBase64.split(",")[1] : audioBase64;
      cleanAudioB64 = cleanAudioB64.replace(/[^A-Za-z0-9+/=]/g, '');
      while (cleanAudioB64.length % 4 !== 0) cleanAudioB64 += '=';
      parts.push({
        inlineData: {
          data: cleanAudioB64,
          mimeType: mimeType || "audio/webm"
        }
      });
    }
    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: { parts },
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

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
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

    // Collect unique images from payload
    const rawImages: { base64: string; mimeType: string }[] = [];
    const seenBase64 = new Set<string>();

    const addImage = (b64Str?: string, mime?: string) => {
      if (!b64Str || typeof b64Str !== 'string') return;
      let cleanMime = mime || 'image/jpeg';
      let cleanB64 = b64Str.trim();

      if (cleanB64.includes(';base64,')) {
        const parts = cleanB64.split(';base64,');
        const mimePart = parts[0].replace(/^data:/, '');
        if (mimePart) cleanMime = mimePart;
        cleanB64 = parts[1];
      } else if (cleanB64.includes(',')) {
        cleanB64 = cleanB64.split(',')[1];
      }

      // Convert URL-safe base64 if present, then sanitize strictly
      cleanB64 = cleanB64.replace(/-/g, '+').replace(/_/g, '/');
      cleanB64 = cleanB64.replace(/[^A-Za-z0-9+/=]/g, '');
      while (cleanB64.length % 4 !== 0) {
        cleanB64 += '=';
      }

      // Standardize mimeType strictly for Gemini API (never allow image/jpg)
      if (cleanMime === 'image/jpg' || cleanMime === 'image/pjpeg') cleanMime = 'image/jpeg';
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'].includes(cleanMime)) {
        cleanMime = 'image/jpeg';
      }

      // Avoid duplicates
      const hash = cleanB64.substring(0, 100) + cleanB64.length;
      if (!seenBase64.has(hash) && cleanB64.length > 50) {
        seenBase64.add(hash);
        rawImages.push({ base64: cleanB64, mimeType: cleanMime });
      }
    };

    if (files && Array.isArray(files) && files.length > 0) {
      for (const f of files) {
        if (f.imageBase64 || f.base64Data) {
          addImage(f.imageBase64 || f.base64Data, f.mimeType);
        }
      }
    } else if (images && Array.isArray(images) && images.length > 0) {
      for (const img of images) {
        if (typeof img === 'string') addImage(img);
        else if (img?.imageBase64 || img?.base64) addImage(img.imageBase64 || img.base64, img.mimeType);
      }
    } else if (photos && Array.isArray(photos) && photos.length > 0) {
      for (const p of photos) {
        if (typeof p === 'string') addImage(p);
        else if (p?.imageBase64 || p?.base64) addImage(p.imageBase64 || p.base64, p.mimeType);
      }
    } else if (image || imageBase64) {
      addImage(image || imageBase64);
    }

    // Convert any HEIC/HEIF images to JPEG before sending to Gemini,
    // since the API frequently rejects real HEIC bytes even with a valid mimeType.
    const detectFormat = (buf: Buffer): 'HEIC1' | 'HEIC2' | null => {
      // HEIC files are ISO-BMFF containers; check the "ftyp" box brand.
      if (buf.length < 12) return null;
      const brand = buf.toString('ascii', 8, 12);
      if (['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(brand)) return 'HEIC1';
      return null;
    };

    for (const item of rawImages) {
      const isHeicMime = item.mimeType === 'image/heic' || item.mimeType === 'image/heif';
      let buffer = Buffer.from(item.base64, 'base64');
      const looksHeic = isHeicMime || detectFormat(buffer) !== null;

      if (looksHeic) {
        try {
          const outputBuffer = (await heicConvert({
            buffer,
            format: 'JPEG',
            quality: 0.9,
          })) as Buffer;
          item.base64 = outputBuffer.toString('base64');
          item.mimeType = 'image/jpeg';
        } catch (convErr) {
          console.error('[server] HEIC conversion failed, sending original bytes:', convErr);
          // Fall back to declaring it as jpeg anyway; Gemini may still reject it,
          // but this avoids silently dropping the image.
          item.mimeType = 'image/jpeg';
        }
      }
    }

    const parts: any[] = [];
    for (const item of rawImages) {
      parts.push({
        inlineData: {
          mimeType: item.mimeType,
          data: item.base64,
        }
      });
    }
    parts.push({ text: systemPrompt });

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: parts,
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
