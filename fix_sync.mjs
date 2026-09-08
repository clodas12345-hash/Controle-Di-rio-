import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const targetStr = `          return {
            ...log,
            isDayOff: !isWorkingDay,
            diariaCarro: isWorkingDay ? dailyRate : 0,
            valorKwh: carProfile.kwhCostRate || (carProfile.vehicleType === 'eletrico' ? 1.05 : 5.50),
            capacidadeBateria: carProfile.batteryCapacityKwh || (carProfile.vehicleType === 'eletrico' ? 53.6 : 50),
            veiculoNome: carProfile.modelName || ''
          };`;

const replaceStr = `          const isEletrico = carProfile.vehicleType === 'eletrico';
          const valKwh = carProfile.kwhCostRate || (isEletrico ? 1.05 : 5.80);
          const capBat = carProfile.batteryCapacityKwh || (isEletrico ? 53.6 : 50);
          let newCusto = log.custoEnergia || 0;
          
          if ((log.kmRodado || 0) > 0) {
            let consumedPercent = 0;
            if (log.sobrouBateria > 0 && log.sobrouBateria < 100) {
              consumedPercent = 100 - log.sobrouBateria;
            } else {
              consumedPercent = Math.min(95, ((log.kmRodado || 0) / (carProfile.estimatedAutonomyKm || (isEletrico ? 300 : 450))) * 100);
            }
            const energyConsumed = (consumedPercent / 100) * capBat;
            newCusto = parseFloat((energyConsumed * valKwh).toFixed(2));
          }

          return {
            ...log,
            isDayOff: !isWorkingDay,
            diariaCarro: isWorkingDay ? dailyRate : 0,
            valorKwh: valKwh,
            capacidadeBateria: capBat,
            custoEnergia: newCusto,
            veiculoNome: carProfile.modelName || ''
          };`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replaceStr);
  fs.writeFileSync('src/App.tsx', content);
  console.log("Success");
} else {
  console.log("Failed to find target");
}
