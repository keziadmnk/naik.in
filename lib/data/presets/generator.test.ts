import { describe, expect, it } from "vitest";
import { aggregateByWeek, fullWeeks } from "../../engine/finance/aggregate";
import { labaMinggu, labaStress } from "../../engine/finance/stress";
import { WEEKS_PER_MONTH } from "../../config/thresholds";
import { getDemoPreset } from "./generator";

function categoryTotal(presetId: "bu-sari" | "uni-dewi", category: string): number {
  return getDemoPreset(presetId).transactions.filter((transaction) => transaction.kategori === category).reduce((sum, transaction) => sum + transaction.nominal, 0);
}

function calculateStress(presetId: "bu-sari" | "uni-dewi"): number | null {
  const transactions = getDemoPreset(presetId).transactions;
  const weeks = fullWeeks(transactions.map((transaction) => ({ date: transaction.tanggal, amount: transaction.nominal, category: transaction.kategori, direction: transaction.arah === "masuk" ? "in" : "out" })));
  const fixedMonthly = categoryTotal(presetId, "Opex tetap") / 3;
  const profits = weeks.map((week) => {
    const revenue = week.transactions.filter((item) => item.category === "Pemasukan usaha").reduce((sum, item) => sum + item.amount, 0);
    const hpp = week.transactions.filter((item) => item.category === "HPP").reduce((sum, item) => sum + item.amount, 0);
    const variable = week.transactions.filter((item) => item.category === "Opex variabel").reduce((sum, item) => sum + item.amount, 0);
    return labaMinggu(revenue, hpp, variable, fixedMonthly);
  });
  return labaStress(Math.min(...profits), 90);
}

describe("preset demo deterministik", () => {
  it("menghasilkan 90 hari dan stress Bu Sari sekitar Rp2.850.000", () => {
    const preset = getDemoPreset("bu-sari");
    expect(preset.transactions.map((item) => item.tanggal)).toContain("2026-04-04");
    expect(new Set(preset.transactions.map((item) => item.tanggal)).size).toBe(90);
    expect(calculateStress("bu-sari")).toBeCloseTo(2_850_000, -4);
    expect(categoryTotal("bu-sari", "Pribadi/rumah tangga")).toBe(7_050_000);
    expect(preset.costs.kebutuhanRtMin).toBe(2_000_000);
  });

  it("menghasilkan target stress Uni Dewi dan cache label", () => {
    expect(calculateStress("uni-dewi")).toBeCloseTo(9_500_000, -4);
    expect(categoryTotal("uni-dewi", "Pribadi/rumah tangga")).toBe(0);
    expect(getDemoPreset("uni-dewi").label.notes.join(" ")).toContain("barcode GS1");
    expect(WEEKS_PER_MONTH).toBe(4.333);
    expect(aggregateByWeek(getDemoPreset("uni-dewi").transactions.map((item) => ({ date: item.tanggal, amount: item.nominal, category: item.kategori }))).length).toBeGreaterThan(10);
  });
});
