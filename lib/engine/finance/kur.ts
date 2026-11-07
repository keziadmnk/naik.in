import {
  KUR_MIKRO_RATE,
  KUR_RATE_SWITCH_PRINCIPAL,
  KUR_SUPER_MIKRO_RATE,
  KUR_TRADE_RATES,
} from "../../config/thresholds";

export type KurSector = "produksi" | "perdagangan_non_ekspor";

export function automaticKurRate(principal: number, sector: KurSector = "produksi", akadKe = 1): number {
  if (!Number.isFinite(principal) || principal < 0) throw new Error("Plafon harus berupa angka nol atau lebih.");
  if (sector === "perdagangan_non_ekspor") {
    const index = Math.min(Math.max(akadKe, 1), KUR_TRADE_RATES.length) - 1;
    return KUR_TRADE_RATES[index];
  }
  return principal <= KUR_RATE_SWITCH_PRINCIPAL ? KUR_SUPER_MIKRO_RATE : KUR_MIKRO_RATE;
}
