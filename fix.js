const fs = require('fs');
let content = fs.readFileSync('src/components/PasteFixedExpensesModal.tsx', 'utf8');

content = content.replace(
  "  const [targetMonth, setTargetMonth] = useState(selectedMonth);\n  const currentKey = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;\n  const existingExpensesCount = fixedExpensesByMonth[currentKey]?.length || 0;\n  const [targetYear, setTargetYear] = useState(selectedYear);",
  "  const [targetMonth, setTargetMonth] = useState(selectedMonth);\n  const [targetYear, setTargetYear] = useState(selectedYear);\n  const currentKey = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;\n  const existingExpensesCount = fixedExpensesByMonth[currentKey]?.length || 0;"
);

fs.writeFileSync('src/components/PasteFixedExpensesModal.tsx', content);
