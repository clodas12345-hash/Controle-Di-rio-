/**
 * Serviço de Consulta Automática da Tabela FIPE (API Pública Parallelum FIPE)
 */

export async function fetchFipeValue(modelQuery: string, yearQuery?: string): Promise<{ value: number; modelFullName: string } | null> {
  try {
    if (!modelQuery || modelQuery.trim().length < 2) return null;

    // 1. Fetch brands (carros)
    const brandsRes = await fetch('https://parallelum.com.br/fipe/api/v1/carros/marcas');
    const brands = await brandsRes.json();
    
    const query = modelQuery.toLowerCase().trim();
    
    // Find matching brand strictly
    let matchedBrand = brands.find((b: any) => query.includes(b.nome.toLowerCase()) || b.nome.toLowerCase().includes(query.split(' ')[0]));
    if (!matchedBrand) return null;

    // 2. Fetch models for brand
    const modelsRes = await fetch(`https://parallelum.com.br/fipe/api/v1/carros/marcas/${matchedBrand.codigo}/modelos`);
    const modelsData = await modelsRes.json();
    const models = modelsData.modelos || [];

    // Find matching model
    const queryParts = query.split(/\s+/).filter(p => p.length > 1);
    let matchedModel = models.find((m: any) => {
      const mName = m.nome.toLowerCase();
      return queryParts.every(part => mName.includes(part)) || mName.includes(query) || query.includes(mName);
    });
    if (!matchedModel) return null;

    // 3. Fetch years for model
    const yearsRes = await fetch(`https://parallelum.com.br/fipe/api/v1/carros/marcas/${matchedBrand.codigo}/modelos/${matchedModel.codigo}/anos`);
    const years = await yearsRes.json();
    if (!years || years.length === 0) return null;

    let matchedYear = years[0];
    if (yearQuery) {
      const found = years.find((y: any) => y.nome.includes(yearQuery));
      if (found) matchedYear = found;
    }

    // 4. Fetch price
    const priceRes = await fetch(`https://parallelum.com.br/fipe/api/v1/carros/marcas/${matchedBrand.codigo}/modelos/${matchedModel.codigo}/anos/${matchedYear.codigo}`);
    const priceData = await priceRes.json();
    
    if (priceData && priceData.Valor) {
      const cleanVal = priceData.Valor.replace('R$', '').trim().replace(/\./g, '').replace(',', '.');
      const num = parseFloat(cleanVal);
      if (!isNaN(num) && num > 0) {
        return {
          value: num,
          modelFullName: `${priceData.Marca} ${priceData.Modelo} (${priceData.AnoModelo})`
        };
      }
    }
  } catch (err) {
    console.warn('Erro ao consultar API FIPE:', err);
  }
  return null;
}
