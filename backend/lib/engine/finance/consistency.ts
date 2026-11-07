import {
  HPP_DEVIATION_PERCENTAGE_POINTS,
  HPP_OVER_TURNOVER_RATIO,
  MISSING_DAYS_CONSISTENCY_RATIO,
  SINGLE_TRANSACTION_MEDIAN_MULTIPLIER,
} from "../../config/thresholds";

export type ConsistencyInput = {
  daily: Array<{ omzet: number; hpp: number }>;
  weekly: Array<{ omzet: number; hpp: number }>;
  totalIncome: number;
  totalExpense: number;
  recordedDays: number;
  totalDays: number;
  transactionAmounts: number[];
};

export type ConsistencyFinding = {
  code: "hpp_over_omzet" | "hpp_deviation" | "expense_over_income" | "missing_days" | "large_transaction";
  message: string;
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function ratios(items: Array<{ omzet: number; hpp: number }>): number[] {
  return items.filter((item) => item.omzet !== 0).map((item) => item.hpp / item.omzet);
}

export function checkConsistency(input: ConsistencyInput): ConsistencyFinding[] {
  const findings: ConsistencyFinding[] = [];
  if ([...input.daily, ...input.weekly].some((item) => item.omzet !== 0 && item.hpp / item.omzet > HPP_OVER_TURNOVER_RATIO)) {
    findings.push({ code: "hpp_over_omzet", message: "Perlu dicek: HPP melebihi omzet pada salah satu periode." });
  }
  const weeklyRatios = ratios(input.weekly);
  const weeklyMedian = median(weeklyRatios);
  if (weeklyRatios.some((ratio) => Math.abs(ratio - weeklyMedian) * 100 > HPP_DEVIATION_PERCENTAGE_POINTS)) {
    findings.push({ code: "hpp_deviation", message: "Perlu dicek: rasio HPP satu minggu menyimpang dari median rasio usaha sendiri." });
  }
  if (input.totalExpense > input.totalIncome) findings.push({ code: "expense_over_income", message: "Perlu dicek: pengeluaran total melebihi pemasukan total." });
  if (input.totalDays > 0 && 1 - input.recordedDays / input.totalDays > MISSING_DAYS_CONSISTENCY_RATIO) {
    findings.push({ code: "missing_days", message: "Perlu dicek: terlalu banyak hari tanpa catatan." });
  }
  const transactionMedian = median(input.transactionAmounts);
  if (transactionMedian > 0 && input.transactionAmounts.some((amount) => amount > SINGLE_TRANSACTION_MEDIAN_MULTIPLIER * transactionMedian)) {
    findings.push({ code: "large_transaction", message: "Perlu dicek: ada transaksi tunggal yang jauh lebih besar dari median." });
  }
  return findings;
}
