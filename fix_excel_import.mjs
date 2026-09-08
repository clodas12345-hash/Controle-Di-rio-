import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const targetStr = `            logsMap.set(newLog.date, {
              ...existing,
              kmRodado: newLog.kmRodado > 0 ? newLog.kmRodado : existing.kmRodado,`;

const replaceStr = `            const finalKm = newLog.kmRodado > 0 ? newLog.kmRodado : existing.kmRodado;
            let finalCusto = (newLog.custoEnergia && newLog.custoEnergia > 0) 
              ? newLog.custoEnergia 
              : (existing.custoEnergia > 0 ? existing.custoEnergia : 0);
            if (finalKm > 0 && finalCusto <= 0) {
              const isElec = carProfile.vehicleType === 'eletrico';
              const vKwh = carProfile.kwhCostRate || (isElec ? 1.05 : 5.80);
              const cBat = carProfile.batteryCapacityKwh || (isElec ? 53.6 : 50);
              const estAut = carProfile.estimatedAutonomyKm || (isElec ? 300 : 450);
              const consumedPct = Math.min(95, (finalKm / estAut) * 100);
              finalCusto = parseFloat(((consumedPct / 100) * cBat * vKwh).toFixed(2));
            }

            logsMap.set(newLog.date, {
              ...existing,
              kmRodado: finalKm,
              custoEnergia: finalCusto,`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replaceStr);
  fs.writeFileSync('src/App.tsx', content);
  console.log("Excel import patched successfully");
} else {
  console.log("Excel import target NOT found");
}
