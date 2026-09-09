import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. In handleApplyMultimodalData:
const targetMultimodal = `    const kmVal = extracted.kmRodado || extracted.tripKm || (existing ? existing.kmRodado : 0);
    const newLog: DailyLog = {
      id: targetDate,
      date: targetDate,
      isDayOff: extracted.isDayOff !== undefined ? extracted.isDayOff : (existing ? existing.isDayOff : false),
      sobrouBateria: extracted.sobrouBateria !== undefined && extracted.sobrouBateria !== null ? Number(extracted.sobrouBateria) : (existing ? existing.sobrouBateria : 0),
      valorKwh: extracted.valorKwh || (existing ? existing.valorKwh : defValKwh),
      capacidadeBateria: extracted.capacidadeBateria || (existing ? existing.capacidadeBateria : defCap),
      kmRodado: Number(kmVal) || 0,
      custoEnergia: extracted.custoEnergia !== undefined ? Number(extracted.custoEnergia) : (existing ? existing.custoEnergia : 0),`;

const replaceMultimodal = `    const kmVal = Number(extracted.kmRodado || extracted.tripKm || (existing ? existing.kmRodado : 0)) || 0;
    let initialCustoEnergia = extracted.custoEnergia !== undefined ? Number(extracted.custoEnergia) : (existing ? existing.custoEnergia : 0);
    if (kmVal > 0 && (!initialCustoEnergia || initialCustoEnergia <= 0)) {
      const isElec = carProfile.vehicleType === 'eletrico';
      const vKwh = extracted.valorKwh || (existing ? existing.valorKwh : defValKwh);
      const cBat = extracted.capacidadeBateria || (existing ? existing.capacidadeBateria : defCap);
      const estAut = carProfile.estimatedAutonomyKm || (isElec ? 300 : 450);
      const sobrouBat = extracted.sobrouBateria !== undefined && extracted.sobrouBateria !== null ? Number(extracted.sobrouBateria) : (existing ? existing.sobrouBateria : 0);
      const consumedPct = (sobrouBat > 0 && sobrouBat < 100) ? (100 - sobrouBat) : Math.min(95, (kmVal / estAut) * 100);
      initialCustoEnergia = parseFloat(((consumedPct / 100) * cBat * vKwh).toFixed(2));
    }

    const newLog: DailyLog = {
      id: targetDate,
      date: targetDate,
      isDayOff: extracted.isDayOff !== undefined ? extracted.isDayOff : (existing ? existing.isDayOff : false),
      sobrouBateria: extracted.sobrouBateria !== undefined && extracted.sobrouBateria !== null ? Number(extracted.sobrouBateria) : (existing ? existing.sobrouBateria : 0),
      valorKwh: extracted.valorKwh || (existing ? existing.valorKwh : defValKwh),
      capacidadeBateria: extracted.capacidadeBateria || (existing ? existing.capacidadeBateria : defCap),
      kmRodado: kmVal,
      custoEnergia: initialCustoEnergia,`;

if (content.includes(targetMultimodal)) {
  content = content.replace(targetMultimodal, replaceMultimodal);
  console.log("Multimodal target replaced successfully");
} else {
  console.log("Multimodal target NOT found");
}

// 2. Add the Auto-Heal useEffect right after line localStorage.setItem('driver_daily_tracker_logs_v_clean'
const targetHook = `  useEffect(() => {
    if (logs) {
      localStorage.setItem('driver_daily_tracker_logs_v_clean', JSON.stringify(logs));
    }
  }, [logs]);`;

const replaceHook = `  useEffect(() => {
    if (logs) {
      localStorage.setItem('driver_daily_tracker_logs_v_clean', JSON.stringify(logs));
    }
  }, [logs]);

  // Auto-heal missing energy costs for any days that have recorded KM but R$ 0,00 energy cost
  useEffect(() => {
    if (!logs || logs.length === 0) return;
    const isEletrico = carProfile.vehicleType === 'eletrico';
    const valKwh = carProfile.kwhCostRate || (isEletrico ? 1.05 : 5.80);
    const capBat = carProfile.batteryCapacityKwh || (isEletrico ? 53.6 : 50);
    const estAutonomy = carProfile.estimatedAutonomyKm || (isEletrico ? 300 : 450);

    const needsRepair = logs.some(l => (l.kmRodado || 0) > 0 && (!l.custoEnergia || l.custoEnergia <= 0));
    if (!needsRepair) return;

    setLogs(prev => prev.map(l => {
      if ((l.kmRodado || 0) > 0 && (!l.custoEnergia || l.custoEnergia <= 0)) {
        let consumedPercent = 0;
        if (l.sobrouBateria > 0 && l.sobrouBateria < 100) {
          consumedPercent = 100 - l.sobrouBateria;
        } else {
          consumedPercent = Math.min(95, ((l.kmRodado || 0) / estAutonomy) * 100);
        }
        const energyConsumed = (consumedPercent / 100) * capBat;
        const calculatedCusto = parseFloat((energyConsumed * valKwh).toFixed(2));
        return {
          ...l,
          custoEnergia: calculatedCusto > 0 ? calculatedCusto : l.custoEnergia
        };
      }
      return l;
    }));
  }, [carProfile.vehicleType, carProfile.kwhCostRate, carProfile.batteryCapacityKwh, carProfile.estimatedAutonomyKm]);`;

if (content.includes(targetHook)) {
  content = content.replace(targetHook, replaceHook);
  console.log("Hook target replaced successfully");
} else {
  console.log("Hook target NOT found");
}

fs.writeFileSync('src/App.tsx', content);
