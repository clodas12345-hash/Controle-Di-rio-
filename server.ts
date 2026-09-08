import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Helper function to query Gemini with retry and fallback models to prevent transient 503/429 errors
const DEFAULT_PRIMARY_MODEL = "gemini-3.8-flash";
const DEFAULT_FALLBACK_MODELS = [
  "gemini-3.1-pro-preview",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest"
];

async function generateContentWithRetryAndFallback(
  params: any,
  primaryModel: string = DEFAULT_PRIMARY_MODEL,
  fallbackModels: string[] = DEFAULT_FALLBACK_MODELS
) {
  const modelsToTry = [primaryModel, ...fallbackModels.filter(m => m !== primaryModel)];
  
  let lastError = null;
  for (const model of modelsToTry) {
    let delay = 600;
    const maxAttempts = 2; // Fast retry per model before falling back to next available model
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`[Gemini API] Solicitando com modelo "${model}" (Tentativa ${attempt}/${maxAttempts})...`);
        const response = await ai.models.generateContent({
          ...params,
          model: model,
        });
        if (response) {
          console.log(`[Gemini API] Sucesso com modelo "${model}"!`);
          return response;
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        const status = err?.status || err?.statusCode || (errMsg.includes("503") ? 503 : (errMsg.includes("429") ? 429 : 0));
        const isQuotaExceeded = errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota") || status === 429;
        const isTransient = status === 503 ||
          errMsg.includes("UNAVAILABLE") ||
          errMsg.includes("high demand") ||
          errMsg.includes("overloaded") ||
          errMsg.includes("temporarily unavailable");
        
        console.warn(`[Gemini API] Aviso no modelo "${model}" (Tentativa ${attempt}/${maxAttempts}): ${errMsg}`);
        
        if (isQuotaExceeded) {
          // If quota is exhausted on this specific model, skip immediately to the next fallback model without retrying
          console.log(`[Gemini API] Cota do modelo "${model}" atingida. Alternando imediatamente para o próximo modelo de IA...`);
          break;
        } else if (isTransient && attempt < maxAttempts) {
          console.log(`[Gemini API] Instabilidade transitória. Aguardando ${delay}ms para tentar novamente...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay = Math.round(delay * 1.5);
        } else {
          // Break to try next model in fallback list
          break;
        }
      }
    }
  }
  throw lastError || new Error("Não foi possível conectar aos servidores de IA no momento devido à alta demanda. Por favor, tente novamente em instantes.");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // CORS middleware for WebIntoApp / WebView APK clients
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Configure body parsers with a higher limit to handle multiple high-res base64 images
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API endpoint for receipt/earnings screenshot extraction with high-precision OCR and comprehensive text parsing
  app.post("/api/extract-receipt", async (req: any, res: any) => {
    try {
      const { imageBase64, mimeType, images, files, textData, text, carProfile, activeContext, aiModel, model } = req.body;
      const chosenModel = model || aiModel || DEFAULT_PRIMARY_MODEL;
      const rawText = (textData || text || "").trim();
      let imageParts: any[] = [];
      const incomingFiles = files || images;

      if (incomingFiles && Array.isArray(incomingFiles) && incomingFiles.length > 0) {
        imageParts = incomingFiles.map((img: { imageBase64?: string; data?: string; mimeType?: string }) => {
          const b64 = (img.imageBase64 || img.data || "").replace(/^data:.*?;base64,/, "");
          return {
            inlineData: {
              mimeType: img.mimeType || 'image/jpeg',
              data: b64,
            },
          };
        });
      } else if (imageBase64 && mimeType) {
        const base64Data = imageBase64.replace(/^data:.*?;base64,/, "");
        imageParts = [{
          inlineData: {
            mimeType: mimeType,
            data: base64Data,
          },
        }];
      } else if (!rawText) {
        return res.status(400).json({ error: "Parâmetros de imagem, arquivo ou texto são obrigatórios." });
      }

      const activeContextStr = activeContext ? `
        CONTEÚDO E CONTEXTO TEMPORAL DA SESSÃO DO MOTORISTA:
        - Mês ativo selecionado no calendário do aplicativo: Mês ${activeContext.selectedMonth}
        - Ano ativo selecionado no calendário do aplicativo: Ano ${activeContext.selectedYear}
        - Data padrão / atual da visualização: ${activeContext.defaultDate || ''}
        OBSERVAÇÃO CRÍTICA DE DATA: Se a imagem ou o texto fizer referência a "Hoje", "Dia X" ou dias da semana, converta isso de forma inteligente para uma data completa no formato "YYYY-MM-DD" usando o mês ${activeContext.selectedMonth} e o ano ${activeContext.selectedYear} informados no contexto.
      ` : '';

      const carProfileStr = carProfile ? `
        PERFIL DO VEÍCULO OPERACIONAL DO MOTORISTA:
        - Tipo do veículo: ${carProfile.vehicleType} (${carProfile.vehicleType === 'eletrico' ? 'Elétrico' : 'Combustão'})
        - Capacidade de energia / bateria / tanque: ${carProfile.batteryCapacityKwh || ''} kWh ou Litros
        - Tarifa / custo unitário de carregamento ou combustível por kWh/Litro: R$ ${carProfile.kwhCostRate || ''}
        Use esses parâmetros reais para validar ou estimar cálculos de consumo e despesas de carregamento/abastecimento se o comprovante contiver esses dados.
      ` : '';

      const textPart = {
        text: `Você é um scanner OCR e analisador financeiro/operacional especializado de altíssima precisão para motoristas de aplicativo (Uber, 99, Particular, Frotas e Veículos Elétricos/Combustão).
        
        ${activeContextStr}
        ${carProfileStr}
        Examine minuciosamente todas as imagens anexadas (fotos de comprovantes, recibos, painel do carro, prints dos apps Uber/99, fotos do cockpit/telas divididas) juntamente com quaisquer textos colados (relatórios do WhatsApp, tabelas do Excel/Sheets, notas fiscais, cupons de postos, faturas de cartão, etc.).
        
        ${rawText ? `DADOS DE TEXTO / PLANILHA / MENSAGEM COPIADOS:\n${rawText}\n\n` : ''}
        
        DIRETRIZES COMPLETAS DE EXTRAÇÃO E RECONHECIMENTO DE DADOS EM PORTUGUÊS DO BRASIL:
        
        1. COCKPIT / TELAS COMBINADAS (PAINEL DO CARRO + CELULAR/TABLET COM UBER E 99):
           ATENÇÃO MÁXIMA PARA FOTOS VERTICAIS DE COCKPIT COM TELAS MÚLTIPLAS:
           Frequentemente a imagem mostra a central multimídia do veículo na parte superior E logo abaixo um celular ou tablet montado no painel executando tela dividida (99 na esquerda, GPS/Waze no centro e Uber na direita).
           Você DEVE escanear a imagem de ponta a ponta e extrair TODOS os 3 componentes conjuntamente:
           - Defina 'detectedType' = 'mixed'.
           
           * VEÍCULO (Painel Superior):
             - 'sobrouBateria' = número do percentual restante (ex: se "88% • 368 km", extraia 88).
             - 'kmRodado' = valor numérico da viagem parcial (Trip A) (ex: se "32.9 km", extraia 32.9).
             - 'tripKm' = valor numérico da viagem parcial (Trip A) (ex: 32.9).
             - 'odometro' = número do odômetro total acumulado (ODO) (ex: se "168790km" ou "168.790 km", extraia 168790).
           
           * GANHOS 99 (Lado Esquerdo da tela inferior):
             - 'app99_earnings' = ganho total exibido (ex: se "R$ 29,15", extraia 29.15).
             - 'app99_rides' = número de solicitações/corridas realizadas (ex: se "1 Solicitações" ou "1", extraia 1).
           
           * GANHOS UBER (Lado Direito da tela inferior):
             - 'appUber_earnings' = ganho total exibido no topo (ex: se "R$ 0,00", extraia 0; se "R$ 57,85", extraia 57.85).
             - 'appUber_rides' = número de viagens concluídas (ex: se "0 viagem concluída", extraia 0; se "3 viagens", extraia 3).

           - Escreva no 'documentSummary' EXATAMENTE o seguinte formato de resposta:
             Com base na foto do cockpit combinado (painel do veículo e aplicativos integrados), a leitura focada nos parâmetros de treinamento é:

             🚘 Dados do Veículo:
             * Bateria Restante (%): **[Valor]%** (Autonomia: [Valor] km)
             * Trip A: **[Valor] km**
             * Odômetro (ODO): **[Valor] km**

             💛 Ganhos da 99:
             * Valor: **R$ [Valor]**
             * Quantidade de Viagens (Solicitações): **[Valor]**

             🖤 Ganhos da Uber:
             * Valor: **R$ [Valor]**
             * Quantidade de Viagens: **[Valor]**

             *Demais dados de navegação, velocidade instantânea ou tempos secundários foram desconsiderados.*

        2. PAINEL DO VEÍCULO ISOLADO (SEM CELULAR/TABLET VISÍVEL):
           Se a foto contiver APENAS o painel de instrumentos do carro sem qualquer tela de celular com apps:
           - 'sobrouBateria' = percentual restante (ex: se "89% • 376 km", extraia 89).
           - 'kmRodado' = valor do Trip A em km (ex: se "29.1 km", extraia 29.1).
           - 'tripKm' = valor do Trip A em km (ex: 29.1).
           - 'odometro' = número do odômetro total (ODO) (ex: 168786).
           - Escreva no 'documentSummary' EXATAMENTE o seguinte formato de resposta:
             Com base na foto do painel do veículo, a leitura focada nos parâmetros de treinamento é:

             * Bateria Restante (%): **[Valor]%** (Autonomia: [Valor] km)
             * Trip A: **[Valor] km**
             * Odômetro (ODO): **[Valor] km**

             Demais informações secundárias do painel foram desconsideradas.

        3. APLICATIVO UBER ISOLADO:
           Se a foto for do app Uber:
           - 'detectedType' = 'uber'.
           - 'appUber_earnings' = ganho total exibido no topo (ex: se "R$ 64,98", extraia 64.98).
           - 'appUber_rides' = número de viagens (ex: se "3 viagens", extraia 3).
           - Dia = dia do mês ou "Hoje" correspondente.
           - Escreva no 'documentSummary' EXATAMENTE o seguinte formato de resposta (sem aspas duplas adicionais no início e no fim):
             Com base na foto do aplicativo da Uber, a leitura focada nos parâmetros de treinamento é:

             * Dia: **Dia [Valor]** ou **[Valor]**
             * Valor: **R$ [Valor]**
             * Quantidade de Viagens: **[Valor]**

             Demais informações secundárias foram desconsideradas.

        4. APLICATIVO 99 ISOLADO:
           Se a foto for do app 99:
           - 'detectedType' = '99'.
           - Ganhos:
             * Se tela inicial/painel: use o ganho destacado.
             * Se tela "Seus ganhos" detalhada: SOMA OBRIGATÓRIA de (Valor da solicitação + Recompensa + Gorjeta + Compensação + Outro).
             * Armazene a soma em 'app99_earnings'.
           - 'app99_rides' = solicitações realizadas (ex: se "11 Solicitações", extraia 11).
           - Escreva no 'documentSummary' EXATAMENTE o seguinte formato de resposta (sem aspas duplas adicionais no início e no fim):
             Com base na foto do aplicativo da 99, a leitura focada nos parâmetros de treinamento é:

             * Valor: **R$ [Valor]**
             * Quantidade de Viagens (Solicitações): **[Valor]**

             Demais informações secundárias foram desconsideradas.

        5. FATURAS DE CARTÃO / EXTRATO DE GASTOS (ALIMENTAÇÃO):
           Se for uma fatura, extrato ou recibos de despesas:
           - Foco EXCLUSIVO em gastos com ALIMENTAÇÃO (padarias, panificadoras, restaurantes, confeitarias, salgadeiras, lanchonetes, bares, pizzarias, iFood, etc.).
           - IGNORE COMPLETAMENTE compras parceladas (ex: se sob compras parceladas ou se indicar parcelamento, pule!). Foque estritamente em compras normais à vista.
           - IGNORE COMPLETAMENTE outras categorias: Gasolina/combustível, Locadora/aluguel de carros, Serviços de tecnologia/assinaturas/cloud, Loterias/jogos, Drogarias/farmácias.
           - Regra MEI (Nomes de Pessoa Física): Se o estabelecimento tiver nome de pessoa física (ex: siqueira, JOSE ANTONIO NEVES UCH), considere alimentação APENAS se o valor for de até R$ 50,00. Desconsidere se > R$ 50,00.
           - Classificação por Período / Refeição:
             * Café da Manhã: Padarias/panificadoras pela manhã (ou por padrão se for padaria, ex: PANIFICADORA PRINCESA), ou transação com valor até R$ 15,00. Armazene em 'foodExpenses_snacks' ou 'foodExpenses_coffee'.
             * Almoço: Restaurantes (ex: BAR RESTAURANTE LOPES, BAR DO PEIXE) ou comércios/Pessoas Físicas (<= R$ 50,00) ao meio-dia. Armazene em 'foodExpenses_lunch'.
             * Lanche da Tarde: Confeitarias (ex: ConfeitariaNova), salgadeiras ('SALGADEIRA SABOREAR') ou lanchonetes à tarde. Armazene em 'foodExpenses_snacks' ou 'foodExpenses_coffee'.
             * Jantar: Bares (ex: UNOSSO BAR), pizzarias ou iFood à noite. Armazene em 'foodExpenses_dinner'.
           - Escreva no 'documentSummary' EXATAMENTE o seguinte formato de resposta (sem aspas duplas adicionais no início e no fim):
             Com base na fatura do cartão, os gastos identificados com **alimentação** (incluindo microempreendedores de pequeno valor e desconsiderando transporte, combustível, aluguel de carros, drogarias, assinaturas e compras parceladas) são:

             ☕ Café da Manhã:
             * [Data] - [Descrição] - **R$ [Valor]**

             🍲 Almoço:
             * [Data] - [Descrição] - **R$ [Valor]**

             🍰 Lanche da Tarde:
             * [Data] - [Descrição] - **R$ [Valor]**

             🍔 Jantar / Lanche da Noite:
             * [Data] - [Descrição] - **R$ [Valor]**

             Faturamento Total de Alimentação: **R$ [Soma de Todos os Itens]**

             *Demais lançamentos de outras categorias e compras parceladas foram completamente ignorados.*

        6. DESPESAS FIXAS / CONTAS DO MÊS (LISTA DE TEXTO OU IMAGEM):
           Extraia todos os itens e preencha no array 'fixedExpenses'.
           REGRA CRÍTICA: NUNCA inclua despesas com ALIMENTAÇÃO ou REFEIÇÕES no array 'fixedExpenses' (elas devem ir para 'foodExpenses_...').
           REGRA CRÍTICA: NUNCA inclua despesas com valor de R$ 1,00 ou valores simbólicos/testes no array 'fixedExpenses'.
           
        7. DATA DETECTADA:
           Identifique a data correspondente e preencha 'detectedDate' no formato "YYYY-MM-DD".
           
        ATENÇÃO ABSOLUTA AOS REQUISITOS TÉCNICOS DO FORMATO JSON:
        - O retorno gerado deve ser um objeto JSON perfeitamente válido que corresponda estritamente ao schema solicitado.
        - NUNCA inclua aspas duplas não escapadas dentro de qualquer string. Se precisar citar algo, use aspas simples ou escape as aspas duplas internas obrigatoriamente como \\\".
        - NUNCA insira quebras de linha reais literais dentro de strings de valor do JSON. Todas as quebras de linha no 'documentSummary' devem ser estritamente escapadas no JSON final como \\n.
        - Certifique-se de que o objeto retornado esteja completo e não truncado.`
      };

      const ExtractedDataSchema = {
        type: Type.OBJECT,
        properties: {
          detectedType: { type: Type.STRING, description: "Tipo detectado (ex: 'daily_log', 'fixed_expenses', 'multi_day_logs', 'uber', '99', 'charging', 'fuel', 'food', 'car_expenses', 'particular', 'diaria_carro', 'mixed')" },
          detectedDate: { type: Type.STRING, description: "Data no formato YYYY-MM-DD" },
          documentSummary: { type: Type.STRING, description: "Resumo explicativo dos dados extraídos" },
          kmRodado: { type: Type.NUMBER, description: "KM percorrido no dia" },
          custoEnergia: { type: Type.NUMBER, description: "Custo com energia elétrica ou combustível" },
          sobrouBateria: { type: Type.NUMBER, description: "Percentual restante de bateria ou combustível" },
          valorKwh: { type: Type.NUMBER, description: "Tarifa do kWh ou preço por litro se detectado" },
          capacidadeBateria: { type: Type.NUMBER, description: "Capacidade da bateria ou tamanho do tanque se detectado" },
          diariaCarro: { type: Type.NUMBER, description: "Valor diário da diária do carro ou rateio diário de despesas fixas" },
          app99_rides: { type: Type.NUMBER, description: "Número de viagens 99" },
          app99_earnings: { type: Type.NUMBER, description: "Ganhos líquidos totais da 99" },
          app99_fares: { type: Type.NUMBER, description: "Valor das corridas/solicitações da 99 (sem recompensas/gorjetas)" },
          app99_bonus: { type: Type.NUMBER, description: "Recompensas ganhas na 99" },
          app99_tips: { type: Type.NUMBER, description: "Gorjetas ganhas na 99" },
          appUber_rides: { type: Type.NUMBER, description: "Número de viagens Uber" },
          appUber_earnings: { type: Type.NUMBER, description: "Ganhos líquidos Uber" },
          appUber_bonus: { type: Type.NUMBER, description: "Bônus/promoções Uber" },
          appUber_tips: { type: Type.NUMBER, description: "Gorjetas Uber" },
          odometro: { type: Type.NUMBER, description: "Hodômetro total acumulado do veículo (ODO em km)" },
          tripKm: { type: Type.NUMBER, description: "Quilômetros da viagem parcial / Trip A" },
          bateriaGasta: { type: Type.NUMBER, description: "Percentual de bateria gasta ou consumida no dia" },
          speechSummary: { type: Type.STRING, description: "Frase curta e natural em português para ser falada pelo sintetizador de voz confirmando os dados extraídos" },
          appParticular_rides: { type: Type.NUMBER, description: "Número de corridas particulares" },
          appParticular_earnings: { type: Type.NUMBER, description: "Ganhos com corridas particulares" },
          carExpenses_wash: { type: Type.NUMBER, description: "Lavagem do veículo" },
          carExpenses_toll: { type: Type.NUMBER, description: "Pedágios" },
          carExpenses_maintenance: { type: Type.NUMBER, description: "Manutenção diária / Borracharia" },
          carExpenses_parking: { type: Type.NUMBER, description: "Estacionamento" },
          carExpenses_other: { type: Type.NUMBER, description: "Outras despesas operacionais" },
          foodExpenses_lunch: { type: Type.NUMBER, description: "Almoço / Refeição principal" },
          foodExpenses_dinner: { type: Type.NUMBER, description: "Jantar / Refeição noturna" },
          foodExpenses_snacks: { type: Type.NUMBER, description: "Café da manhã / Lanches" },
          foodExpenses_coffee: { type: Type.NUMBER, description: "Café da tarde / Bebidas" },
          recompensasExtra: { type: Type.NUMBER, description: "Gorjetas em dinheiro ou metas" },
          outrasFontes: { type: Type.NUMBER, description: "Outras fontes de ganhos" },
          isDayOff: { type: Type.BOOLEAN, description: "Indica se foi dia de folga" }
        }
      };

      const FixedExpenseItemSchema = {
        type: Type.OBJECT,
        properties: {
          month: { type: Type.INTEGER, description: "Mês (1 a 12)" },
          year: { type: Type.INTEGER, description: "Ano (ex: 2026)" },
          monthName: { type: Type.STRING, description: "Nome do mês (ex: 'Agosto')" },
          description: { type: Type.STRING, description: "Descrição/Nome da despesa (ex: 'Financiamento', 'Seguro', 'IPVA')" },
          value: { type: Type.NUMBER, description: "Valor numérico da despesa" },
          installments: { type: Type.STRING, description: "Parcelas ou vencimento se houver (ex: '15/60', 'Vence dia 10')" }
        },
        required: ["description", "value"]
      };

      const response = await generateContentWithRetryAndFallback({
        contents: { parts: [...imageParts, textPart] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              results: {
                type: Type.ARRAY,
                items: ExtractedDataSchema
              },
              fixedExpenses: {
                type: Type.ARRAY,
                items: FixedExpenseItemSchema,
                description: "Lista de despesas fixas do carro com mês, descrição e valor"
              },
              fixedExpensesMonth: {
                type: Type.INTEGER,
                description: "Mês identificado para as despesas fixas (1 a 12)"
              },
              fixedExpensesYear: {
                type: Type.INTEGER,
                description: "Ano identificado para as despesas fixas"
              },
              fixedExpensesTotal: {
                type: Type.NUMBER,
                description: "Soma total das despesas fixas do mês"
              }
            }
          }
        }
      }, chosenModel);

      const resultText = response.text || "{}";
      const parsedData = JSON.parse(resultText);
      
      // Sanitization
      if (parsedData.results && Array.isArray(parsedData.results)) {
        parsedData.results.forEach((item: any) => {
          if (item.app99_bonus === undefined) item.app99_bonus = 0;
          if (item.appUber_bonus === undefined) item.appUber_bonus = 0;
          if (item.recompensasExtra === undefined) item.recompensasExtra = 0;
        });
      }
      
      res.json(parsedData);
    } catch (error: any) {
      console.error("Erro na extração do comprovante/texto:", error);
      res.status(500).json({ error: error.message || "Erro interno do servidor ao processar o comprovante ou texto." });
    }
  });

  // API endpoint for voice text/audio extraction
  app.post("/api/parse-voice", async (req: any, res: any) => {
    try {
      const { text, audioBase64, mimeType, activeContext, carProfile, aiModel, model } = req.body;
      const chosenModel = model || aiModel || DEFAULT_PRIMARY_MODEL;
      const rawText = (text || "").trim();

      let contentParts: any[] = [];

      if (audioBase64) {
        const cleanAudioB64 = audioBase64.replace(/^data:.*?;base64,/, "");
        contentParts.push({
          inlineData: {
            mimeType: mimeType || "audio/webm",
            data: cleanAudioB64,
          },
        });
      }

      if (!rawText && !audioBase64) {
        return res.status(400).json({ error: "O parâmetro text ou audioBase64 é obrigatório." });
      }

      const activeContextStr = activeContext ? `
        CONTEXTO ATUAL DO MOTORISTA:
        - Mês selecionado: ${activeContext.selectedMonth}
        - Ano selecionado: ${activeContext.selectedYear}
        - Data padrão: ${activeContext.defaultDate || ''}
      ` : '';

      const carProfileStr = carProfile ? `
        VEÍCULO: ${carProfile.vehicleType === 'eletrico' ? 'Elétrico' : 'Combustão'}, Capacidade: ${carProfile.batteryCapacityKwh || ''} kWh
      ` : '';

      const promptText = `Você é um assistente de inteligência artificial de altíssima precisão para motoristas de aplicativo (Uber, 99, Particular) e veículos elétricos/combustão.
      Sua tarefa é analisar a fala ou áudio do motorista descrevendo sua rotina e extrair com perfeição todos os dados pertinentes ao aplicativo GKD Controle Diário.
      
      ${activeContextStr}
      ${carProfileStr}
      ${rawText ? `TRANSCRIÇÃO DE FALA DO MOTORISTA:\n"${rawText}"\n` : ''}

      PARÂMETROS ESSENCIAIS A IDENTIFICAR NA FALA DO MOTORISTA:
      1. CORRIDAS E GANHOS NA 99:
         - 'app99_rides': Quantidade de corridas/viagens feitas pelo aplicativo 99.
         - 'app99_earnings': Total de dinheiro recebido na 99 (soma de tarifas + recompensas + gorjetas).
         - 'app99_fares': Valor bruto apenas das corridas, sem extras.
         - 'app99_bonus': Quanto ganhou de recompensa / missões / metas na 99.
         - 'app99_tips': Quanto ganhou de gorjeta na 99.

      2. CORRIDAS E GANHOS NA UBER:
         - 'appUber_rides': Quantidade de corridas/viagens feitas pela Uber.
         - 'appUber_earnings': Quanto de dinheiro recebeu na Uber.
         - 'appUber_bonus': Quanto ganhou de bônus, incentivos ou recompensas na Uber.
         - 'appUber_tips': Quanto ganhou de gorjeta na Uber.

      3. CORRIDAS PARTICULARES OU OUTRAS FONTES:
         - 'appParticular_rides': Corridas particulares realizadas.
         - 'appParticular_earnings': Quanto de dinheiro recebeu de particulares.
         - 'recompensasExtra': Gorjetas em dinheiro vivo ou bonificações externas.
         - 'outrasFontes': Outras entradas financeiras.

      4. QUILOMETRAGEM E PAINEL DO VEÍCULO:
         - 'kmRodado': Quantos quilômetros foram percorridos no dia (ex: "rodei 180 km", "fiz 220 km").
         - 'tripKm': Quilometragem parcial da Trip (Trip A).
         - 'odometro': Hodômetro total acumulado do carro se mencionado.

      5. BATERIA OU COMBUSTÍVEL:
         - 'sobrouBateria': Percentual de bateria restante (ex: "sobrou 35%", "terminei com 40% de bateria").
         - 'bateriaGasta': Percentual ou quantidade de bateria que foi consumida/gasta (ex: "gastei 65% de bateria").
         - 'custoEnergia': Custo em Reais com recarga elétrica, carregamento ou combustível.

      6. DESPESAS OPERACIONAIS E ALIMENTAÇÃO:
         - 'foodExpenses_lunch': Almoço / refeição principal (> R$ 15,00).
         - 'foodExpenses_dinner': Jantar / refeição da noite.
         - 'foodExpenses_coffee' / 'foodExpenses_snacks': Café, lanches ou padaria (<= R$ 15,00).
         - 'carExpenses_wash': Lavagem do carro / ducha.
         - 'carExpenses_toll': Pedágios.
         - 'carExpenses_maintenance': Manutenção, calibragem ou borracharia.
         - 'carExpenses_parking': Estacionamento.
         - 'diariaCarro': Diária ou aluguel do carro.
         REGRA CRÍTICA: Despesas de ALIMENTAÇÃO e valores de R$ 1,00 NUNCA devem ser incluídos em listas de despesas fixas mensais.

      7. DATA MENCIONADA:
         - 'detectedDate': Se o motorista disser "hoje", "ontem", "dia 15", etc., converta para "YYYY-MM-DD". Se não mencionar, retorne a data padrão de contexto.

      8. SÍNTESE EM VOZ ('speechSummary'):
         - Crie uma frase amigável, concisa e direta em português brasileiro para ser lida em voz alta pelo aplicativo confirmando exatamente as métricas entendidas.
         - Exemplo: "Comando processado com sucesso: 14 corridas na 99, 8 na Uber, total de 440 reais recebidos, 195 quilômetros percorridos e 35% de bateria restante."

      Retorne estritamente um JSON de acordo com o schema solicitado.`;

      contentParts.push({ text: promptText });

      const response = await generateContentWithRetryAndFallback({
        contents: { parts: contentParts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedDate: { type: Type.STRING },
              speechSummary: { type: Type.STRING },
              kmRodado: { type: Type.NUMBER },
              tripKm: { type: Type.NUMBER },
              odometro: { type: Type.NUMBER },
              custoEnergia: { type: Type.NUMBER },
              sobrouBateria: { type: Type.NUMBER },
              bateriaGasta: { type: Type.NUMBER },
              app99_rides: { type: Type.NUMBER },
              app99_earnings: { type: Type.NUMBER },
              app99_fares: { type: Type.NUMBER },
              app99_bonus: { type: Type.NUMBER },
              app99_tips: { type: Type.NUMBER },
              appUber_rides: { type: Type.NUMBER },
              appUber_earnings: { type: Type.NUMBER },
              appUber_bonus: { type: Type.NUMBER },
              appUber_tips: { type: Type.NUMBER },
              appParticular_rides: { type: Type.NUMBER },
              appParticular_earnings: { type: Type.NUMBER },
              carExpenses_wash: { type: Type.NUMBER },
              carExpenses_toll: { type: Type.NUMBER },
              carExpenses_maintenance: { type: Type.NUMBER },
              carExpenses_parking: { type: Type.NUMBER },
              carExpenses_other: { type: Type.NUMBER },
              foodExpenses_lunch: { type: Type.NUMBER },
              foodExpenses_dinner: { type: Type.NUMBER },
              foodExpenses_snacks: { type: Type.NUMBER },
              foodExpenses_coffee: { type: Type.NUMBER },
              diariaCarro: { type: Type.NUMBER },
              recompensasExtra: { type: Type.NUMBER },
              outrasFontes: { type: Type.NUMBER }
            }
          }
        }
      }, chosenModel);

      const resultText = response.text || "{}";
      res.json(JSON.parse(resultText));
    } catch (error: any) {
      console.error("Erro no processamento de voz:", error);
      res.status(500).json({ error: error.message || "Erro interno do servidor ao processar a voz/áudio." });
    }
  });

  // API endpoint for voice and text data search assistant
  app.post("/api/assistant-search", async (req: any, res: any) => {
    try {
      const { query, logs, selectedYear, selectedMonth, aiModel, model } = req.body;
      const chosenModel = model || aiModel || DEFAULT_PRIMARY_MODEL;
      if (!query) {
        return res.status(400).json({ error: "O parâmetro query é obrigatório." });
      }

      // Format logs for context to Gemini
      const logsSummary = (logs || []).map((l: any) => {
        const uberGross = (l.appUber?.earnings || 0) + (l.appUber?.bonus || 0);
        const app99Gross = (l.app99?.earnings || 0) + (l.app99?.bonus || 0);
        const particularGross = (l.appParticular?.earnings || 0);
        const totalGross = uberGross + app99Gross + particularGross + (l.recompensasExtra || 0) + (l.outrasFontes || 0);
        const foodTotal = (l.foodExpenses?.lunch || 0) + (l.foodExpenses?.dinner || 0) + (l.foodExpenses?.snacks || 0) + (l.foodExpenses?.coffee || 0);
        const carTotal = (l.carExpenses?.wash || 0) + (l.carExpenses?.toll || 0) + (l.carExpenses?.maintenance || 0) + (l.carExpenses?.parking || 0) + (l.carExpenses?.other || 0);
        const netProfit = totalGross - (l.custoEnergia || 0) - foodTotal - carTotal - (l.diariaCarro || 0);

        return {
          date: l.date,
          gross: totalGross,
          net: netProfit,
          uberRides: l.appUber?.rides || 0,
          uberGross,
          app99Rides: l.app99?.rides || 0,
          app99Gross,
          particularRides: l.appParticular?.rides || 0,
          particularGross,
          km: l.kmRodado || 0,
          energyCost: l.custoEnergia || 0,
          foodTotal,
          carExpensesTotal: carTotal,
          wash: l.carExpenses?.wash || 0,
          toll: l.carExpenses?.toll || 0,
          isDayOff: l.isDayOff || false,
          batteryLeft: l.sobrouBateria || 0,
        };
      });

      const systemPrompt = `Você é o Assistente Virtual e Localizador de Dados Financeiros e Operacionais do motorista de aplicativo.
Sua função é analisar o histórico de lançamentos do motorista e responder com máxima precisão às buscas por VOZ ou TEXTO.

Siga rigorosamente estas orientações:
1. Responda em Português do Brasil de forma clara, amigável e direta.
2. Seja exato em valores numéricos em Reais (R$), KM rodado, número de corridas e percentual de bateria.
3. Se a busca se referir a uma data específica (ex: "dia 15 de Julho" ou "15/07/2026"), informe os valores completos daquele dia e adicione a data no formato YYYY-MM-DD na lista 'matchingDates'.
4. Se for uma busca por totais ou estatísticas (ex: "quanto ganhei na Uber este mês", "quantos dias bati a meta de 500", "qual foi o maior ganho do ano", "quanto gastei com lavagem"), calcule o total com base nos registros e responda.
5. Em 'speechText', forneça um resumo curto e limpo (sem pontuações especiais ou markdown) perfeito para ser lido pela voz sintetizada do celular ou navegador.
6. Em 'matchingDates', retorne o array de datas relevantes no formato 'YYYY-MM-DD' para que a interface possa destacar essas células no calendário do motorista.

Busca do motorista: "${query}"
Ano Ativo no App: ${selectedYear} | Mês Ativo no App: ${selectedMonth}
Quantidade total de dias registrados no banco de dados: ${logsSummary.length}
Histórico completo dos registros:
${JSON.stringify(logsSummary)}`;

      const response = await generateContentWithRetryAndFallback({
        contents: { parts: [{ text: systemPrompt }] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              textAnswer: { type: Type.STRING, description: "Resposta completa formatada em texto para exibição na tela" },
              speechText: { type: Type.STRING, description: "Resposta resumida fluida sem markdown para leitura em voz alta" },
              matchingDates: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array com datas no formato YYYY-MM-DD encontradas"
              },
              highlightMetric: { type: Type.STRING, description: "Destaque numérico sintetizado (ex: 'R$ 1.450,00')" },
              suggestedAction: { type: Type.STRING, description: "Sugestão de ação curta para o motorista" }
            },
            required: ["textAnswer", "speechText"]
          }
        }
      }, chosenModel);

      const resultText = response.text || "{}";
      res.json(JSON.parse(resultText));
    } catch (error: any) {
      console.error("Erro no assistente de busca:", error);
      res.status(500).json({ error: error.message || "Erro interno do servidor ao consultar o assistente de busca." });
    }
  });

  // API endpoint for manual version checking
  app.get("/api/version", (req, res) => {
    res.json({
      version: "GKD_CD_V.1.0.0",
      buildDate: "2026-08-20",
      releaseNotes: "Versão GKD_CD_V.1.0.0: Armazenamento local robusto, performance aprimorada e arquitetura otimizada para APK/PWA."
    });
  });

  // Explicit route to view and download the complaint PDF
  app.get("/relatorio_reclamacao_desempenho.pdf", (req, res) => {
    const pdfPath = path.join(process.cwd(), "public", "relatorio_reclamacao_desempenho.pdf");
    res.sendFile(pdfPath, (err) => {
      if (err) {
        console.error("Erro ao abrir pdf:", err);
        if (!res.headersSent) {
          res.status(404).send("Arquivo PDF não encontrado.");
        }
      }
    });
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
