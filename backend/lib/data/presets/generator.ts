import { WEEKS_PER_MONTH } from "../../config/thresholds";
import type { DemoPreset, PresetId, PresetTransaction } from "./types";
import buSariCache from "./cache/bu-sari.json";
import uniDewiCache from "./cache/uni-dewi.json";

const DAYS_IN_PRESET = 90;
const START_DATE = "2026-01-05";
const MONTHLY_PERSONAL_EXPENSE = 2_350_000;

function dateAt(dayOffset: number): string {
  const date = new Date(`${START_DATE}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + dayOffset);
  return date.toISOString().slice(0, 10);
}

function weeklyTransactions(prefix: string, weeklyRevenue: number, weeklyHpp: number, weeklyVariable: number, fixedMonthly: number, personalExpense: number): PresetTransaction[] {
  const transactions: PresetTransaction[] = [];
  const targetDays = DAYS_IN_PRESET;
  const fullWeekCount = Math.floor(targetDays / 7);
  const partialDays = targetDays % 7;
  const dailyRevenue = weeklyRevenue / 7;
  const dailyHpp = weeklyHpp / 7;
  const dailyVariable = weeklyVariable / 7;
  const fullWeekFixed = fixedMonthly / WEEKS_PER_MONTH / 7;
  const partialWeekFixed = partialDays > 0
    ? (fixedMonthly * 3 - fullWeekCount * 7 * fullWeekFixed) / partialDays
    : fullWeekFixed;
  for (let day = 0; day < targetDays; day += 1) {
    const date = dateAt(day);
    const isPartialWeek = day >= fullWeekCount * 7;
    const scale = isPartialWeek ? 7 / partialDays : 1;
    transactions.push(
      { id: `${prefix}-income-${day}`, tanggal: date, uraian: day % 2 === 0 ? "QRIS penjualan" : "Penjualan tunai", kategori: "Pemasukan usaha", nominal: dailyRevenue * scale, arah: "masuk" },
      { id: `${prefix}-hpp-${day}`, tanggal: date, uraian: "Bahan dan bumbu produksi", kategori: "HPP", nominal: dailyHpp * scale, arah: "keluar" },
      { id: `${prefix}-variable-${day}`, tanggal: date, uraian: "Ongkir dan biaya admin", kategori: "Opex variabel", nominal: dailyVariable * scale, arah: "keluar" },
      { id: `${prefix}-fixed-${day}`, tanggal: date, uraian: "Sewa dan listrik usaha", kategori: "Opex tetap", nominal: isPartialWeek ? partialWeekFixed : fullWeekFixed, arah: "keluar" },
    );
    if (day % 30 === 0) {
      transactions.push({ id: `${prefix}-personal-${day}`, tanggal: date, uraian: "Belanja dapur rumah", kategori: "Pribadi/rumah tangga", nominal: personalExpense, arah: "keluar" });
    }
  }
  return transactions;
}

const buSariStressTarget = 2_850_000;
const uniDewiStressTarget = 9_500_000;

function buildPreset(id: PresetId): DemoPreset {
  const isSari = id === "bu-sari";
  const stressTarget = isSari ? buSariStressTarget : uniDewiStressTarget;
  const weeklyRevenue = isSari ? 5_000_000 : 12_000_000;
  const weeklyHpp = isSari ? 2_750_000 : 5_400_000;
  const fixedMonthly = isSari ? 1_000_000 : 1_800_000;
  const weeklyVariable = weeklyRevenue - weeklyHpp - fixedMonthly / WEEKS_PER_MONTH - stressTarget / WEEKS_PER_MONTH;
  return {
    id,
    name: isSari ? "Bu Sari" : "Uni Dewi",
    business: isSari
      ? { id: "preset-bu-sari", nama: "Bu Sari", kota: "Padang", jenisProduk: "Keripik balado", usiaUsahaBulan: 24, legalitas: {}, dibuat: "2026-01-05T00:00:00.000Z" }
      : { id: "preset-uni-dewi", nama: "Uni Dewi", kota: "Bukittinggi", jenisProduk: "Rendang kemasan", usiaUsahaBulan: 36, legalitas: {}, dibuat: "2026-01-05T00:00:00.000Z" },
    transactions: weeklyTransactions(isSari ? "sari" : "dewi", weeklyRevenue, weeklyHpp, weeklyVariable, fixedMonthly, isSari ? MONTHLY_PERSONAL_EXPENSE : 0),
    costs: {
      kebutuhanRtMin: isSari ? 2_000_000 : 3_000_000,
      cicilanLama: 0,
      biayaTetap: isSari
        ? { sewa: 500_000, gaji: 0, listrikAir: 300_000, internetPulsa: 0, retribusi: 0, ongkir: 0, komisiMarketplace: 0, adminQris: 0, iklan: 0, servisAlat: 200_000 }
        : { sewa: 1_000_000, gaji: 3_000_000, listrikAir: 500_000, internetPulsa: 200_000, retribusi: 0, ongkir: 0, komisiMarketplace: 0, adminQris: 0, iklan: 0, servisAlat: 100_000 },
    },
    label: isSari
      ? { sample: "A", fields: { productNameAndBrand: { found: true, location: "lain" }, ingredients: { found: false }, netWeight: { found: true, location: "lain" }, producer: { found: false }, halal: { found: false }, expiry: { found: false }, distributionPermit: { found: false } }, notes: ["Sampel A: plastik polos dengan stiker tulisan tangan."] }
      : { sample: "B", fields: { productNameAndBrand: { found: true, location: "utama" }, ingredients: { found: true, location: "utama" }, netWeight: { found: true, location: "utama" }, producer: { found: true, location: "utama" }, halal: { found: true, location: "utama" }, expiry: { found: true, location: "utama" }, distributionPermit: { found: true, location: "utama" }, gs1Barcode: { found: false }, ing: { needsCheck: true } }, notes: ["Sampel B: standing pouch lengkap, barcode GS1 belum ada, ING perlu dicek."] },
    ai: isSari ? buSariCache : uniDewiCache,
    stressTargetMonthly: stressTarget,
  };
}

export const DEMO_PRESETS: Record<PresetId, DemoPreset> = {
  "bu-sari": buildPreset("bu-sari"),
  "uni-dewi": buildPreset("uni-dewi"),
};

export function getDemoPreset(id: PresetId): DemoPreset {
  return DEMO_PRESETS[id];
}
