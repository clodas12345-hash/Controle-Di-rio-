import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const targetStr = `            {/* Smart Rateio & Sync with Entradas Box */}
            {(() => {
              const rateInfo = getMonthWorkDaysAndRate(selectedYear, selectedMonth, getEffectiveMonthlyCost(selectedYear, selectedMonth));
              const isAlreadySynced = Math.abs(totals.totalCarRental - (rateInfo.dailyRate * rateInfo.workDaysCount)) < 2.0;`;

const replaceStr = `            {/* Smart Rateio & Sync with Entradas Box */}
            {(() => {
              const monthKey = \`\${selectedYear}-\${String(selectedMonth).padStart(2, '0')}\`;
              const customDays = carProfile.customWorkDays?.[monthKey] || [];
              const rateInfo = getMonthWorkDaysAndRate(selectedYear, selectedMonth, getEffectiveMonthlyCost(selectedYear, selectedMonth), customDays);
              const isAlreadySynced = Math.abs(totals.totalCarRental - (rateInfo.dailyRate * rateInfo.workDaysCount)) < 2.0;`;

content = content.replace(targetStr, replaceStr);
fs.writeFileSync('src/App.tsx', content);
