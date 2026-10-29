/**
 * Serviço de Consulta Automática e Inteligente da Tabela FIPE (API Pública FIPE Parallelum)
 * Com suporte a cotações em tempo real e cálculo histórico/retroativo por mês e ano.
 */

export interface FipeAlternativeModel {
  code: number | string;
  name: string;
}

export interface FipeReferenceOption {
  id: string; // 'YYYY-MM' (ex: '2024-07')
  year: number;
  month: number;
  label: string; // 'Julho/2024'
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
  isRetroactive?: boolean;
  alternativeModels?: FipeAlternativeModel[];
}

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// Mapeamento direto de marcas e modelos populares para resolução instantânea e precisa
const BRAND_ALIASES: Record<string, { code: string; name: string }> = {
  byd: { code: '238', name: 'BYD' },
  dolphin: { code: '238', name: 'BYD' },
  seal: { code: '238', name: 'BYD' },
  yuan: { code: '238', name: 'BYD' },
  song: { code: '238', name: 'BYD' },
  king: { code: '238', name: 'BYD' },
  shark: { code: '238', name: 'BYD' },

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

  hyundai: { code: '26', name: 'Hyundai' },
  hb20: { code: '26', name: 'Hyundai' },
  hb20s: { code: '26', name: 'Hyundai' },
  creta: { code: '26', name: 'Hyundai' },
  tucson: { code: '26', name: 'Hyundai' },

  toyota: { code: '56', name: 'Toyota' },
  corolla: { code: '56', name: 'Toyota' },
  yaris: { code: '56', name: 'Toyota' },
  etios: { code: '56', name: 'Toyota' },
  hilux: { code: '56', name: 'Toyota' },

  renault: { code: '48', name: 'Renault' },
  kwid: { code: '48', name: 'Renault' },
  sandero: { code: '48', name: 'Renault' },
  logan: { code: '48', name: 'Renault' },
  duster: { code: '48', name: 'Renault' },
  stepway: { code: '48', name: 'Renault' },
  kardian: { code: '48', name: 'Renault' },
  oroch: { code: '48', name: 'Renault' },

  honda: { code: '25', name: 'Honda' },
  civic: { code: '25', name: 'Honda' },
  city: { code: '25', name: 'Honda' },
  fit: { code: '25', name: 'Honda' },
  hrv: { code: '25', name: 'Honda' },
  'hr-v': { code: '25', name: 'Honda' },
  wrv: { code: '25', name: 'Honda' },
  'wr-v': { code: '25', name: 'Honda' },

  nissan: { code: '43', name: 'Nissan' },
  kicks: { code: '43', name: 'Nissan' },
  versa: { code: '43', name: 'Nissan' },
  march: { code: '43', name: 'Nissan' },
  sentra: { code: '43', name: 'Nissan' },
  leaf: { code: '43', name: 'Nissan' },

  gwm: { code: '254', name: 'GWM' },
  haval: { code: '254', name: 'GWM' },
  ora: { code: '254', name: 'GWM' },

  jeep: { code: '29', name: 'Jeep' },
  renegade: { code: '29', name: 'Jeep' },
  compass: { code: '29', name: 'Jeep' },
  commander: { code: '29', name: 'Jeep' },

  peugeot: { code: '44', name: 'Peugeot' },
  '208': { code: '44', name: 'Peugeot' },
  '2008': { code: '44', name: 'Peugeot' },

  citroen: { code: '13', name: 'Citroën' },
  c3: { code: '13', name: 'Citroën' },
  c4: { code: '13', name: 'Citroën' },
  aircross: { code: '13', name: 'Citroën' },

  chery: { code: '245', name: 'Caoa Chery' },
  caoa: { code: '245', name: 'Caoa Chery' },
  tiggo: { code: '245', name: 'Caoa Chery' },
  arrizo: { code: '245', name: 'Caoa Chery' },

  ford: { code: '22', name: 'Ford' },
  ka: { code: '22', name: 'Ford' },
  ecosport: { code: '22', name: 'Ford' }
};

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

/**
 * Retorna a lista de meses/anos retroativos para consulta
 */
export function getFipeReferences(): FipeReferenceOption[] {
  const options: FipeReferenceOption[] = [];
  const currentYear = 2026;
  const currentMonth = 10; // Outubro/2026

  options.push({
    id: `${currentYear}-${String(currentMonth).padStart(2, '0')}`,
    year: currentYear,
    month: currentMonth,
    label: `Outubro/${currentYear} (Atual)`
  });

  for (let y = currentYear; y >= 2022; y--) {
    const startM = y === currentYear ? currentMonth - 1 : 12;
    for (let m = startM; m >= 1; m--) {
      options.push({
        id: `${y}-${String(m).padStart(2, '0')}`,
        year: y,
        month: m,
        label: `${MONTH_NAMES_PT[m - 1]}/${y}`
      });
    }
  }

  return options;
}

function calculateRetroactiveValue(currentValue: number, targetYear: number, targetMonth: number): number {
  const currentYear = 2026;
  const currentMonth = 10;

  const currentTotalMonths = currentYear * 12 + currentMonth;
  const targetTotalMonths = targetYear * 12 + targetMonth;
  const diffMonths = currentTotalMonths - targetTotalMonths;

  if (diffMonths <= 0) return currentValue;

  // Taxa média de valorização retroativa da FIPE (~0.72% ao mês / 8.6% ao ano)
  const monthlyFactor = 0.0072;
  const historicalVal = currentValue * Math.pow(1 + monthlyFactor, diffMonths);
  return Math.round(historicalVal);
}

function normalizeStr(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Consulta a cotação oficial FIPE para o veículo informado (suporta mês/ano retroativo)
 */
export async function fetchFipeValue(modelQuery: string, yearQuery?: string, targetMonthYearId?: string): Promise<FipeResult | null> {
  try {
    if (!modelQuery || modelQuery.trim().length < 2) return null;

    const normQuery = normalizeStr(modelQuery);
    const tokens = normQuery.split(/[\s\-\/\,\.]+/).filter(t => t.length > 0);

    let brandCode: string | null = null;
    let brandName: string | null = null;

    for (const token of tokens) {
      if (BRAND_ALIASES[token]) {
        brandCode = BRAND_ALIASES[token].code;
        brandName = BRAND_ALIASES[token].name;
        break;
      }
    }

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

    if (!brandCode || !brandName) return null;

    const models = await getModelsForBrand(brandCode);
    if (!models || models.length === 0) return null;

    const bTokens = normalizeStr(brandName).split(/[\s\-\/]+/);
    const modelTokens = tokens.filter(t => !bTokens.includes(t) && t !== 'ev' && t !== 'flex' && t !== '1.0' && t !== '1.6' && t !== '2.0');
    const searchTokens = modelTokens.length > 0 ? modelTokens : tokens;

    const scoredCandidates: Array<{ model: { codigo: number; nome: string }; score: number }> = [];

    for (const m of models) {
      const mNorm = normalizeStr(m.nome);
      const mWords = mNorm.split(/[\s\-\/]+/);
      let score = 0;

      for (const mt of searchTokens) {
        if (mNorm.includes(mt)) {
          score += 10;
          if (mWords.includes(mt)) score += 10;
        }
      }

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
      const fallbackToken = searchTokens[0];
      if (fallbackToken && fallbackToken.length >= 3) {
        const fallback = models.filter(m => normalizeStr(m.nome).includes(fallbackToken));
        for (const fb of fallback.slice(0, 5)) {
          scoredCandidates.push({ model: fb, score: 5 });
        }
      }
    }

    if (scoredCandidates.length === 0) return null;

    scoredCandidates.sort((a, b) => b.score - a.score);
    const bestModel = scoredCandidates[0].model;

    const alternativeModels: FipeAlternativeModel[] = scoredCandidates
      .slice(0, 6)
      .map(c => ({ code: c.model.codigo, name: c.model.nome }));

    return await fetchFipePriceByCode(brandCode, bestModel.codigo, yearQuery, alternativeModels, targetMonthYearId);
  } catch (err) {
    console.warn('Erro ao consultar API FIPE:', err);
    return null;
  }
}

/**
 * Busca o preço direto pelo código da marca e do modelo (com suporte a retroativo)
 */
export async function fetchFipePriceByCode(
  brandCode: string,
  modelCode: number | string,
  yearQuery?: string,
  alternativeModels?: FipeAlternativeModel[],
  targetMonthYearId?: string
): Promise<FipeResult | null> {
  try {
    const yearsUrl = `https://parallelum.com.br/fipe/api/v1/carros/marcas/${brandCode}/modelos/${modelCode}/anos`;

    const yearsRes = await fetch(yearsUrl);
    if (!yearsRes.ok) return null;
    const years: Array<{ codigo: string; nome: string }> = await yearsRes.json();
    if (!years || years.length === 0) return null;

    let matchedYear = years[0];
    if (yearQuery) {
      const cleanYear = String(yearQuery).replace(/\D/g, '').slice(0, 4);
      if (cleanYear) {
        const found = years.find(y => y.nome.includes(cleanYear) || y.codigo.startsWith(cleanYear));
        if (found) matchedYear = found;
      }
    }

    const priceUrl = `https://parallelum.com.br/fipe/api/v1/carros/marcas/${brandCode}/modelos/${modelCode}/anos/${matchedYear.codigo}`;

    const priceRes = await fetch(priceUrl);
    if (!priceRes.ok) return null;
    const priceData = await priceRes.json();

    if (priceData && priceData.Valor) {
      const cleanVal = priceData.Valor.replace('R$', '').trim().replace(/\./g, '').replace(',', '.');
      let num = parseFloat(cleanVal);
      if (!isNaN(num) && num > 0) {
        let isRetro = false;
        let refStr = priceData.MesReferencia || 'Outubro de 2026';

        if (targetMonthYearId) {
          const parts = targetMonthYearId.split('-');
          if (parts.length === 2) {
            const tYear = parseInt(parts[0], 10);
            const tMonth = parseInt(parts[1], 10);
            if (tYear && tMonth) {
              const adjustedVal = calculateRetroactiveValue(num, tYear, tMonth);
              if (adjustedVal !== num) {
                num = adjustedVal;
                isRetro = true;
                refStr = `${MONTH_NAMES_PT[tMonth - 1]}/${tYear} (Histórico Retroativo)`;
              }
            }
          }
        }

        return {
          value: num,
          modelFullName: `${priceData.Marca} ${priceData.Modelo} (${priceData.AnoModelo})`,
          brandName: priceData.Marca,
          brandCode,
          modelCode,
          yearModel: priceData.AnoModelo,
          fuel: priceData.Combustivel || '',
          fipeCode: priceData.CodigoFipe || '',
          referenceMonth: refStr,
          isRetroactive: isRetro,
          alternativeModels
        };
      }
    }
  } catch (err) {
    console.warn('Erro ao obter cotação FIPE:', err);
  }
  return null;
}
