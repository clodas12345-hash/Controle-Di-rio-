const parseInstallmentInfo = (installments) => {
  if (!installments) return null;
  const match = installments.match(/(\d+)\s*(\/|de|-)\s*(\d+)/i);
  if (match) {
    return {
      current: parseInt(match[1], 10),
      total: parseInt(match[3], 10),
      separator: match[2],
      padCurrent: match[1].startsWith('0') && match[1].length > 1,
      padTotal: match[3].startsWith('0') && match[3].length > 1
    };
  }
  return null;
};

console.log(parseInstallmentInfo("1/10"));
console.log(parseInstallmentInfo("01/10"));
console.log(parseInstallmentInfo("2/3"));
