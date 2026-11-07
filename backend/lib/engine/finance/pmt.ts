export function pmt(principal: number, annualRate: number, termMonths: number): number {
  if (!Number.isFinite(principal) || !Number.isFinite(annualRate) || !Number.isFinite(termMonths) || termMonths <= 0) {
    throw new Error("Pokok, bunga, dan tenor harus berupa angka valid; tenor harus lebih dari nol.");
  }
  const monthlyRate = annualRate / 12;
  if (monthlyRate === 0) return principal / termMonths;
  return principal * monthlyRate / (1 - (1 + monthlyRate) ** -termMonths);
}

export function plafonAman(batas: number, annualRate: number, termMonths: number): number {
  if (!Number.isFinite(batas) || batas < 0) throw new Error("Batas aman harus berupa angka nol atau lebih.");
  const monthlyRate = annualRate / 12;
  if (monthlyRate === 0) return batas * termMonths;
  return batas * (1 - (1 + monthlyRate) ** -termMonths) / monthlyRate;
}
