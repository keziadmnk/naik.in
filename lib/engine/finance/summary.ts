import { aggregateByDay, aggregateByWeek, fullWeeks, type Transaction } from "./aggregate";
import { assessConfidence, type ConfidenceResult } from "./confidence";
import { checkConsistency, type ConsistencyFinding } from "./consistency";
import { labaMinggu } from "./stress";
import type { ClassifiedTransaction } from "./classification";

export type FinanceSummary = {
  omzet: number;
  hpp: number;
  hppRasio: number;
  pengeluaranPribadi: number;
  labaUsaha: number;
  weekly: Array<{ key: string; omzet: number; laba: number; recordedDays: number }>;
  mingguTersepi: { key: string; laba: number } | null;
  rataRataLabaMingguan: number;
  mingguTertinggi: { key: string; laba: number } | null;
  keragamanLaba: number;
  confidence: ConfidenceResult;
  consistency: ConsistencyFinding[];
};

export function fixedMonthlyTotal(costs: Record<string, number>): number {
  return Object.values(costs).reduce((sum, value) => sum + value, 0);
}

function isCategory(transaction: ClassifiedTransaction, category: string): boolean {
  return transaction.kategori === category;
}

export function summarizeFinance(
  transactions: ClassifiedTransaction[],
  input: {
    periodDays: number;
    fixedMonthly: number;
    hasCashSalesOrAllQrIs: boolean;
    hppSource: "nota" | "buku_kas" | "estimasi";
    extractionConfirmed: boolean;
  },
): FinanceSummary {
  const income = transactions.filter((item) => isCategory(item, "Pemasukan usaha"));
  const hppItems = transactions.filter((item) => isCategory(item, "HPP"));
  const expenses = transactions.filter((item) => item.arah === "keluar" && !isCategory(item, "Pribadi/rumah tangga") && !isCategory(item, "Bukan transaksi usaha"));
  const omzet = income.reduce((sum, item) => sum + item.nominal, 0);
  const hpp = hppItems.reduce((sum, item) => sum + item.nominal, 0);
  const pengeluaranPribadi = transactions.filter((item) => isCategory(item, "Pribadi/rumah tangga")).reduce((sum, item) => sum + item.nominal, 0);
  const opex = expenses.filter((item) => !isCategory(item, "HPP")).reduce((sum, item) => sum + item.nominal, 0);
  const labaUsaha = omzet - hpp - opex;
  const weeklyItems = aggregateByWeek(transactions.map(toEngineTransaction));
  const weekly = weeklyItems.map((period) => {
    const items = period.transactions as Transaction[];
    const weeklyOmzet = items.filter((item) => item.category === "Pemasukan usaha").reduce((sum, item) => sum + item.amount, 0);
    const weeklyHpp = items.filter((item) => item.category === "HPP").reduce((sum, item) => sum + item.amount, 0);
    const weeklyVariable = items.filter((item) => item.category === "Opex variabel").reduce((sum, item) => sum + item.amount, 0);
    return { key: period.key, omzet: weeklyOmzet, laba: labaMinggu(weeklyOmzet, weeklyHpp, weeklyVariable, input.fixedMonthly), recordedDays: period.recordedDays };
  });
  const complete = fullWeeks(transactions.map(toEngineTransaction)).map((period) => weekly.find((item) => item.key === period.key)).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const lowest = complete.length ? complete.reduce((a, b) => a.laba <= b.laba ? a : b) : null;
  const highest = complete.length ? complete.reduce((a, b) => a.laba >= b.laba ? a : b) : null;
  const average = complete.length ? complete.reduce((sum, item) => sum + item.laba, 0) / complete.length : 0;
  const variance = complete.length ? complete.reduce((sum, item) => sum + (item.laba - average) ** 2, 0) / complete.length : 0;
  const days = new Set(transactions.map((item) => item.tanggal)).size;
  const daily = aggregateByDay(transactions.map(toEngineTransaction)).map((period) => {
    const items = period.transactions as Transaction[];
    return { omzet: items.filter((item) => item.category === "Pemasukan usaha").reduce((sum, item) => sum + item.amount, 0), hpp: items.filter((item) => item.category === "HPP").reduce((sum, item) => sum + item.amount, 0) };
  });
  const consistency = checkConsistency({ daily, weekly: weekly.map((item) => ({ omzet: item.omzet, hpp: (transactions.filter((transaction) => transaction.kategori === "HPP" && transaction.tanggal >= item.key && transaction.tanggal < nextWeek(item.key)).reduce((sum, transaction) => sum + transaction.nominal, 0)) })), totalIncome: omzet, totalExpense: expenses.reduce((sum, item) => sum + item.nominal, 0), recordedDays: days, totalDays: input.periodDays, transactionAmounts: transactions.map((item) => item.nominal) });
  return { omzet, hpp, hppRasio: omzet > 0 ? hpp / omzet : 0, pengeluaranPribadi, labaUsaha, weekly, mingguTersepi: lowest ? { key: lowest.key, laba: lowest.laba } : null, rataRataLabaMingguan: average, mingguTertinggi: highest ? { key: highest.key, laba: highest.laba } : null, keragamanLaba: Math.sqrt(variance), confidence: assessConfidence({ periodDays: input.periodDays, hasCashSalesOrAllQrIs: input.hasCashSalesOrAllQrIs, hppSource: input.hppSource, recordedDayRatio: input.periodDays > 0 ? days / input.periodDays : 0, extractionConfirmed: input.extractionConfirmed }), consistency };
}

function toEngineTransaction(transaction: ClassifiedTransaction): Transaction {
  return { date: transaction.tanggal, amount: transaction.nominal, category: transaction.kategori, direction: transaction.arah === "masuk" ? "in" : "out" };
}

function nextWeek(key: string): string {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 7);
  return date.toISOString().slice(0, 10);
}
