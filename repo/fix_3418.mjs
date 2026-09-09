import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const targetStr = `                                    const [y, m] = log.date.split('-').map(Number);
                                    const { dailyRate } = getMonthWorkDaysAndRate(y, m, getEffectiveMonthlyCost(y, m));
                                    const defValKwh = carProfile.vehicleType === 'eletrico' ? (carProfile.kwhCostRate || 1.05) : 5.80;
                                    const defCap = carProfile.vehicleType === 'eletrico' ? (carProfile.batteryCapacityKwh || 53.6) : 50;

                                    const zeroedLog: DailyLog = {
                                      id: log.date,
                                      date: log.date,
                                      isDayOff: false,`;

const replaceStr = `                                    const [y, m, d] = log.date.split('-').map(Number);
                                    const monthKey = \`\${y}-\${String(m).padStart(2, '0')}\`;
                                    const customDays = carProfile.customWorkDays?.[monthKey] || [];
                                    const { dailyRate } = getMonthWorkDaysAndRate(y, m, getEffectiveMonthlyCost(y, m), customDays);
                                    const isWorkingDay = customDays.length > 0 ? customDays.includes(d) : (new Date(log.date + 'T00:00:00').getDay() !== 0);

                                    const defValKwh = carProfile.vehicleType === 'eletrico' ? (carProfile.kwhCostRate || 1.05) : 5.80;
                                    const defCap = carProfile.vehicleType === 'eletrico' ? (carProfile.batteryCapacityKwh || 53.6) : 50;

                                    const zeroedLog: DailyLog = {
                                      id: log.date,
                                      date: log.date,
                                      isDayOff: !isWorkingDay,`;

content = content.replace(targetStr, replaceStr);
fs.writeFileSync('src/App.tsx', content);
