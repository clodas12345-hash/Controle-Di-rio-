/**
 * Serviço de Consulta Automática e Inteligente da Tabela FIPE (API Pública FIPE Parallelum)
 * Com suporte a sinônimos de marcas, modelos populares, cache em memória e sugestões.
 */

export interface FipeAlternativeModel {
  code: number | string;
  name: string;
}

export interface FipeResult {
  value: number;
  modelFullName: string;
  brandName: string;
  brandCode: string;
  modelCode: number | string;
  yearModel: string | number;
  fuel: string;
  fipeCode: string;
  referenceMonth: string;
  alternativeModels?: FipeAlternativeModel[];
}

// Mapeamento direto de marcas e modelos populares para resolução instantânea e precisa
const BRAND_ALIASES: Record<string, { code: string; name: string }> = {
  // BYD
  byd: { code: '238', name: 'BYD' },
  dolphin: { code: '238', name: 'BYD' },
  seal: { code: '238', name: 'BYD' },
  yuan: { code: '238', name: 'BYD' },
  song: { code: '238', name: 'BYD' },
  king: { code: '238', name: 'BYD' },
  shark: { code: '238', name: 'BYD' },

  // Chevrolet / GM
  chevrolet: { code: '23', name: 'GM - Chevrolet' },
  chevy: { code: '23', name: 'GM - Chevrolet' },
  gm: { code: '23', name: 'GM - Chevrolet' },
  onix: { code: '23', name: 'GM - Chevrolet' },
  spin: { code: '23', name: 'GM - Chevrolet' },
  tracker: { code: '23', name: 'GM - Chevrolet' },
  cruze: { code: '23', name: 'GM - Chevrolet' },
  prisma: { code: '23', name: 'GM - Chevrolet' },
  montana: { code: '23', name: 'GM - Chevrolet' },
  s10: { code: '23', name: 'GM - Chevrolet' },
  cobalt: { code: '23', name: 'GM - Chevrolet' },

  // Fiat
  fiat: { code: '21', name: 'Fiat' },
  argo: { code: '21', name: 'Fiat' },
  mobi: { code: '21', name: 'Fiat' },
  cronos: { code: '21', name: 'Fiat' },
  pulse: { code: '21', name: 'Fiat' },
  fastback: { code: '21', name: 'Fiat' },
  toro: { code: '21', name: 'Fiat' },
  strada: { code: '21', name: 'Fiat' },
  uno: { code: '21', name: 'Fiat' },
  palio: { code: '21', name: 'Fiat' },
  siena: { code: '21', name: 'Fiat' },

  // Volkswagen
  volkswagen: { code: '59', name: 'VW - VolksWagen' },
  volks: { code: '59', name: 'VW - VolksWagen' },
  vw: { code: '59', name: 'VW - VolksWagen' },
  gol: { code: '59', name: 'VW - VolksWagen' },
  polo: { code: '59', name: 'VW - VolksWagen' },
  virtus: { code: '59', name: 'VW - VolksWagen' },
  't-cross': { code: '59', name: 'VW - VolksWagen' },
  tcross: { code: '59', name: 'VW - VolksWagen' },
  nivus: { code: '59', name: 'VW - VolksWagen' },
  voyage: { code: '59', name: 'VW - VolksWagen' },
  fox: { code: '59', name: 'VW - VolksWagen' },
  saveiro: { code: '59', name: 'VW - VolksWagen' },
  taos: { code: '59', name: 'VW - VolksWagen' },
  up: { code: '59', name: 'VW - VolksWagen' },

  // Hyundai
  hyundai: { code: '26', name: 'Hyundai' },
  hb20: { code: '26', name: 'Hyundai' },
  hb20s: { code: '26', name: 'Hyundai' },
  creta: { code: '26', name: 'Hyundai' },
  tucson: { code: '26', name: 'Hyundai' },

  // Toyota
  toyota: { code: '56', name: 'Toyota' },
  corolla: { code: '56', name: 'Toyota' },
  yaris: { code: '56', name: 'Toyota' },
  etios: { code: '56', name: 'Toyota' },
  hilux: { code: '56', name: 'Toyota' },

  // Renault
  renault: { code: '48', name: 'Renault' },
  kwid: { code: '48', name: 'Renault' },
  sandero: { code: '48', name: 'Renault' },
  logan: { code: '48', name: 'Renault' },
  duster: { code: '48', name: 'Renault' },
  stepway: { code: '48', name: 'Renault' },
  kardian: { code: '48', name: 'Renault' },
  oroch: { code: '48', name: 'Renault' },

  // Honda
  honda: { code: '25', name: 'Honda' },
  civic: { code: '25', name: 'Honda' },
  city: { code: '25', name: 'Honda' },
  fit: { code: '25', name: 'Honda' },
  hrv: { code: '25', name: 'Honda' },
  'hr-v': { code: '25', name: 'Honda' },
  wrv: { code: '25', name: 'Honda' },
  'wr-v': { code: '25', name: 'Honda' },

  // Nissan
  nissan: { code: '43', name: 'Nissan' },
  kicks: { code: '43', name: 'Nissan' },
  versa: { code: '43', name: 'Nissan' },
  march: { code: '43', name: 'Nissan' },
  sentra: { code: '43', name: 'Nissan' },
  leaf: { code: '43', name: 'Nissan' },

  // GWM
  gwm: { code: '254', name: 'GWM' },
  haval: { code: '254', name: 'GWM' },
  ora: { code: '254', name: 'GWM' },

  // Jeep
  jeep: { code: '29', name: 'Jeep' },
  renegade: { code: '29', name: 'Jeep' },
  compass: { code: '29', name: 'Jeep' },
  commander: { code: '29', name: 'Jeep' },

  // Peugeot
  peugeot: { code: '44', name: 'Peugeot' },
  '208': { code: '44', name: 'Peugeot' },
  '2008': { code: '44', name: 'Peugeot' },

  // Citroën
  citroen: { code: '13', name: 'Citroën' },
  c3: { code: '13', name: 'Citroën' },
  c4: { code: '13', name: 'Citroën' },
  aircross: { code: '13', name: 'Citroën' },

  // Caoa Chery
  chery: { code: '245', name: 'Caoa Chery' },
  caoa: { code: '245', name: 'Caoa Chery' },
  tiggo: { code: '245', name: 'Caoa Chery' },
  arrizo: { code: '245', name: 'Caoa Chery' },

  // Ford
  ford: { code: '22', name: 'Ford' },
  ka: { code: '22', name: 'Ford' },
  ecosport: { code: '22', name: 'Ford' }
};

// Caches em memória
let brandsCache: Array<{ codigo: string; nome: string }> | null = null;
const modelsCacheByBrand: Record<string, Array<{ codigo: number; nome: string }>> = {};

async function getBrands(): Promise<Array<{ codigo: string; nome: string }>> {
  if (brandsCache && brandsCache.length > 0) return brandsCache;
  try {
    const res = await fetch('https://parallelum.com.br/fipe/api/v1/carros/marcas');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    brandsCache = await res.json();
    return brandsCache || [];
  } catch (err) {
    console.warn('Erro ao carregar marcas FIPE:', err);
    return [];
  }
}

async function getModelsForBrand(brandCode: string): Promise<Array<{ codigo: number; nome: string }>> {
  if (modelsCacheByBrand[brandCode]) return modelsCacheByBrand[brandCode];
  try {
    const res = await fetch(`https://parallelum.com.br/fipe/api/v1/carros/marcas/${brandCode}/modelos`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const models = data.modelos || [];
    modelsCacheByBrand[brandCode] = models;
    return models;
  } catch (err) {
    console.warn(`Erro ao carregar modelos da marca ${brandCode}:`, err);
    return [];
  }
}

function normalizeStr(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Consulta a cotação oficial FIPE para o veículo informado
 */
export async function fetchFipeValue(modelQuery: string, yearQuery?: string): Promise<FipeResult | null> {
  try {
    if (!modelQuery || modelQuery.trim().length < 2) return null;

    const normQuery = normalizeStr(modelQuery);
    const tokens = normQuery.split(/[\s\-\/\,\.]+/).filter(t => t.length > 0);

    let brandCode: string | null = null;
    let brandName: string | null = null;

    // 1. Tentar resolver a marca por sinônimos/modelos populares conhecidos
    for (const token of tokens) {
      if (BRAND_ALIASES[token]) {
        brandCode = BRAND_ALIASES[token].code;
        brandName = BRAND_ALIASES[token].name;
        break;
      }
    }

    // 2. Se não achou por alias, buscar nas marcas da API
    if (!brandCode) {
      const brands = await getBrands();
      for (const b of brands) {
        const bNorm = normalizeStr(b.nome);
        if (tokens.some(t => t.length >= 3 && bNorm.includes(t))) {
          brandCode = b.codigo;
          brandName = b.nome;
          break;
        }
      }
    }

    if (!brandCode || !brandName) {
      console.warn('FIPE: Marca não identificada para query:', modelQuery);
      return null;
    }

    // 3. Buscar modelos da marca
    const models = await getModelsForBrand(brandCode);
    if (!models || models.length === 0) return null;

    // Filtrar tokens do modelo (removendo palavras da marca para busca limpa)
    const bTokens = normalizeStr(brandName).split(/[\s\-\/]+/);
    const modelTokens = tokens.filter(t => !bTokens.includes(t) && t !== 'ev' && t !== 'flex' && t !== '1.0' && t !== '1.6' && t !== '2.0');

    // Se sobrou apenas palavras vazias, usar todos os tokens
    const searchTokens = modelTokens.length > 0 ? modelTokens : tokens;

    // Encontrar candidatos e pontuar
    const scoredCandidates: Array<{ model: { codigo: number; nome: string }; score: number }> = [];

    for (const m of models) {
      const mNorm = normalizeStr(m.nome);
      const mWords = mNorm.split(/[\s\-\/]+/);
      let score = 0;

      for (const mt of searchTokens) {
        if (mNorm.includes(mt)) {
          score += 10;
          if (mWords.includes(mt)) score += 10; // Palavra exata ganha bônus
        }
      }

      // Bônus específicos para versões populares
      if (tokens.includes('mini') && mNorm.includes('mini')) score += 15;
      if (tokens.includes('plus') && mNorm.includes('plus')) score += 15;
      if (tokens.includes('sedan') && mNorm.includes('sedan')) score += 10;
      if (tokens.includes('hatch') && mNorm.includes('hatch')) score += 10;
      if (tokens.includes('cross') && mNorm.includes('cross')) score += 10;
      if (tokens.includes('turbo') && mNorm.includes('tb')) score += 10;

      if (score >= 10) {
        scoredCandidates.push({ model: m, score });
      }
    }

    if (scoredCandidates.length === 0) {
      // Tentativa mais flexível: qualquer modelo que contenha o primeiro token do modelo
      const fallbackToken = searchTokens[0];
      if (fallbackToken && fallbackToken.length >= 3) {
        const fallback = models.filter(m => normalizeStr(m.nome).includes(fallbackToken));
        for (const fb of fallback.slice(0, 5)) {
          scoredCandidates.push({ model: fb, score: 5 });
        }
      }
    }

    if (scoredCandidates.length === 0) {
      return null;
    }

    // Ordenar pelo melhor score
    scoredCandidates.sort((a, b) => b.score - a.score);
    const bestModel = scoredCandidates[0].model;

    // Coletar modelos alternativos para o usuário poder escolher se desejar
    const alternativeModels: FipeAlternativeModel[] = scoredCandidates
      .slice(0, 6)
      .map(c => ({ code: c.model.codigo, name: c.model.nome }));

    // 4. Buscar anos para o modelo escolhido
    return await fetchFipePriceByCode(brandCode, bestModel.codigo, yearQuery, alternativeModels);
  } catch (err) {
    console.warn('Erro ao consultar API FIPE:', err);
    return null;
  }
}

/**
 * Busca o preço direto pelo código da marca e do modelo
 */
export async function fetchFipePriceByCode(
  brandCode: string,
  modelCode: number | string,
  yearQuery?: string,
  alternativeModels?: FipeAlternativeModel[]
): Promise<FipeResult | null> {
  try {
    const yearsRes = await fetch(`https://parallelum.com.br/fipe/api/v1/carros/marcas/${brandCode}/modelos/${modelCode}/anos`);
    if (!yearsRes.ok) return null;
    const years: Array<{ codigo: string; nome: string }> = await yearsRes.json();
    if (!years || years.length === 0) return null;

    // Tentar casar o ano
    let matchedYear = years[0];
    if (yearQuery) {
      const cleanYear = String(yearQuery).replace(/\D/g, '').slice(0, 4);
      if (cleanYear) {
        const found = years.find(y => y.nome.includes(cleanYear) || y.codigo.startsWith(cleanYear));
        if (found) matchedYear = found;
      }
    }

    // Buscar cotação
    const priceRes = await fetch(`https://parallelum.com.br/fipe/api/v1/carros/marcas/${brandCode}/modelos/${modelCode}/anos/${matchedYear.codigo}`);
    if (!priceRes.ok) return null;
    const priceData = await priceRes.json();

    if (priceData && priceData.Valor) {
      const cleanVal = priceData.Valor.replace('R$', '').trim().replace(/\./g, '').replace(',', '.');
      const num = parseFloat(cleanVal);
      if (!isNaN(num) && num > 0) {
        return {
          value: num,
          modelFullName: `${priceData.Marca} ${priceData.Modelo} (${priceData.AnoModelo})`,
          brandName: priceData.Marca,
          brandCode,
          modelCode,
          yearModel: priceData.AnoModelo,
          fuel: priceData.Combustivel || '',
          fipeCode: priceData.CodigoFipe || '',
          referenceMonth: priceData.MesReferencia || '',
          alternativeModels
        };
      }
    }
  } catch (err) {
    console.warn('Erro ao obter cotação FIPE:', err);
  }
  return null;
}
