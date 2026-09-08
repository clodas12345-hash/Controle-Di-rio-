const fs = require('fs');

const path = 'src/components/PasteFixedExpensesModal.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /onApplyFixedExpenses: \(month: number, year: number, expenses: \{ id: string; name: string; value: number; installments\?: string \}\[\]\) => void;/,
  "onApplyFixedExpenses: (month: number, year: number, expenses: { id: string; name: string; value: number; installments?: string }[], mode: 'replace' | 'append') => void;"
);

content = content.replace(
  /onApplyFixedExpenses\(targetMonth, targetYear, parsedItems\);/,
  "onApplyFixedExpenses(targetMonth, targetYear, parsedItems, importMode);"
);

fs.writeFileSync(path, content);
console.log("PasteFixedExpensesModal patched");
