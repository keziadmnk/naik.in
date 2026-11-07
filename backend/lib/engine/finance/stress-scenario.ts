import { fullWeeks } from "./aggregate";
import { plafonAman, pmt } from "./pmt";
import { automaticKurRate, type KurSector } from "./kur";
import { batasAman, labaShock, labaStress, rasioBeban, sisaKas, status, type FinanceStatus } from "./stress";
import type { ClassifiedTransaction } from "./classification";
import { summarizeFinance, type FinanceSummary } from "./summary";

export type StressScenarioInput = {
  transactions: ClassifiedTransaction[];
  periodDays: number;
  fixedMonthly: number;
  kebutuhanRtMin: number;
  cicilanLama: number;
  plafon: number;
  tenor: 12 | 24 | 36;
  sector: KurSector;
  akadKe: 1 | 2 | 3 | 4;
  bungaTahunan?: number;
  omzetShock: number;
  hppShock: number;
  hasCashSalesOrAllQrIs?: boolean;
  hppSource?: "nota" | "buku_kas" | "estimasi";
  extractionConfirmed?: boolean;
};

export type TenorResult = {
  tenor: 12 | 24 | 36;
  cicilan: number;
  rasioBeban: number;
  sisaKas: number;
  status: FinanceStatus;
  plafonAman: number;
};

export type StressScenarioResult = {
  summary: FinanceSummary;
  labaNormal: number;
  labaSepi: number | null;
  labaSkenario: number | null;
  cicilan: number;
  rasioBeban: number;
  sisaKas: number;
  batasAmanCicilan: number;
  status: FinanceStatus;
  bungaTahunan: number;
  tenors: TenorResult[];
  blocked: boolean;
};

export function evaluateStressScenario(input: StressScenarioInput): StressScenarioResult {
  const summary = summarizeFinance(input.transactions, {
    periodDays: input.periodDays,
    fixedMonthly: input.fixedMonthly,
    hasCashSalesOrAllQrIs: input.hasCashSalesOrAllQrIs ?? true,
    hppSource: input.hppSource ?? "buku_kas",
    extractionConfirmed: input.extractionConfirmed ?? true,
  });
  const weeks = fullWeeks(input.transactions.map((transaction) => ({
    date: transaction.tanggal,
    amount: transaction.nominal,
    category: transaction.kategori,
  })));
  const lowestWeekly = weeks.length
    ? weeks.reduce((lowest, week) => {
      const current = summary.weekly.find((item) => item.key === week.key);
      const prior = summary.weekly.find((item) => item.key === lowest.key);
      return current && prior && current.laba < prior.laba ? week : lowest;
    }, weeks[0])
    : null;
  const lowWeeklyProfit = lowestWeekly ? summary.weekly.find((item) => item.key === lowestWeekly.key)?.laba ?? 0 : 0;
  const baseStress = labaStress(lowWeeklyProfit, input.periodDays);
  const shocked = baseStress === null ? null : labaShock(summary.omzet, summary.hpp, summary.labaUsaha - summary.omzet + summary.hpp, input.omzetShock, input.hppShock);
  const labaSkenario = input.omzetShock > 0 || input.hppShock > 0 ? shocked : baseStress;
  const rate = input.bungaTahunan ?? automaticKurRate(input.plafon, input.sector, input.akadKe);
  const payment = pmt(input.plafon, rate, input.tenor);
  const safeLimit = labaSkenario === null ? 0 : batasAman(labaSkenario, input.kebutuhanRtMin, input.cicilanLama);
  const ratio = labaSkenario === null ? Number.POSITIVE_INFINITY : rasioBeban(input.cicilanLama, payment, labaSkenario);
  const cash = labaSkenario === null ? Number.NEGATIVE_INFINITY : sisaKas(labaSkenario, input.kebutuhanRtMin, input.cicilanLama, payment);
  const tenors = ([12, 24, 36] as const).map((tenor) => {
    const installment = pmt(input.plafon, rate, tenor);
    const tenorRatio = labaSkenario === null ? Number.POSITIVE_INFINITY : rasioBeban(input.cicilanLama, installment, labaSkenario);
    const tenorCash = labaSkenario === null ? Number.NEGATIVE_INFINITY : sisaKas(labaSkenario, input.kebutuhanRtMin, input.cicilanLama, installment);
    return { tenor, cicilan: installment, rasioBeban: tenorRatio, sisaKas: tenorCash, status: status(tenorRatio, tenorCash, labaSkenario ?? 0), plafonAman: plafonAman(safeLimit, rate, tenor) };
  });
  return { summary, labaNormal: summary.labaUsaha, labaSepi: baseStress, labaSkenario, cicilan: payment, rasioBeban: ratio, sisaKas: cash, batasAmanCicilan: safeLimit, status: status(ratio, cash, labaSkenario ?? 0), bungaTahunan: rate, tenors, blocked: input.periodDays < 28 };
}
