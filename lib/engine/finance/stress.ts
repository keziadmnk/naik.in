import { CAUTION_RATIO, DANGER_RATIO, MINIMUM_STRESS_DAYS, STATUS_LABELS, WEEKS_PER_MONTH } from "../../config/thresholds";

export type FinanceStatus = keyof typeof STATUS_LABELS;

export type StressInput = {
  omzetWeekly: number;
  hppWeekly: number;
  opexVariabelWeekly: number;
  opexTetapBulanan: number;
  omzet: number;
  hpp: number;
  opex: number;
  kebutuhanRtMin: number;
  cicilanLama: number;
  bungaTahunan: number;
  tenorBulan: number;
  daysRecorded?: number;
};

export function labaMinggu(omzet: number, hpp: number, opexVariabel: number, opexTetapBulanan: number): number {
  return omzet - hpp - opexVariabel - opexTetapBulanan / WEEKS_PER_MONTH;
}

export function labaStress(lowestWeeklyProfit: number, daysRecorded?: number): number | null {
  if (daysRecorded !== undefined && daysRecorded < MINIMUM_STRESS_DAYS) return null;
  return lowestWeeklyProfit * WEEKS_PER_MONTH;
}

export function labaShock(omzet: number, hpp: number, opex: number, omzetShock: number, hppShock: number): number {
  return omzet * (1 - omzetShock) - hpp * (1 - omzetShock) * (1 + hppShock) - opex;
}

export function rasioBeban(cicilanLama: number, cicilanBaru: number, labaStressBulanan: number): number {
  if (labaStressBulanan === 0) return cicilanLama + cicilanBaru > 0 ? Number.POSITIVE_INFINITY : 0;
  return (cicilanLama + cicilanBaru) / labaStressBulanan;
}

export function sisaKas(labaStressBulanan: number, kebutuhanRtMin: number, cicilanLama: number, cicilanBaru: number): number {
  return labaStressBulanan - kebutuhanRtMin - cicilanLama - cicilanBaru;
}

export function batasAman(labaStressBulanan: number, kebutuhanRtMin: number, cicilanLama: number): number {
  return Math.max(0, Math.min(CAUTION_RATIO * labaStressBulanan - cicilanLama, labaStressBulanan - kebutuhanRtMin - cicilanLama));
}

export function status(rasio: number, sisa: number, labaStressBulanan: number): FinanceStatus {
  if (rasio > DANGER_RATIO || sisa < 0 || labaStressBulanan <= 0) return "notReady";
  if (rasio > CAUTION_RATIO) return "caution";
  return "ready";
}
