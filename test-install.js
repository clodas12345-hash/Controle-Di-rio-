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

const incrementInstallment = (installments, distance = 1) => {
  const info = parseInstallmentInfo(installments);
  if (info) {
    const nextVal = info.current + distance;
    if (nextVal > info.total) return undefined;
    
    const currStr = info.padCurrent ? String(nextVal).padStart(2, '0') : String(nextVal);
    const totalStr = info.padTotal ? String(info.total).padStart(2, '0') : String(info.total);
    
    return `${currStr} ${info.separator} ${totalStr}`.replace(/\s+/g, ' ').replace(/\s*\/\s*/, '/').trim();
  }
  return installments;
};

console.log(incrementInstallment("1/10"));
console.log(incrementInstallment("01/10"));
console.log(incrementInstallment("01 de 10"));
console.log(incrementInstallment("10/10"));
