import { describe, expect, it } from "vitest";
import { aggregateByWeek, fullWeeks, normalizeToMonth } from "./aggregate";
import { assessConfidence } from "./confidence";
import { checkConsistency } from "./consistency";
import { automaticKurRate } from "./kur";
import { plafonAman, pmt } from "./pmt";
import { batasAman, labaMinggu, labaShock, labaStress, rasioBeban, sisaKas, status } from "./stress";
import { classifyByDictionary } from "./classification";
import { summarizeFinance } from "./summary";
import { getDemoPreset } from "../../data/presets";
import { evaluateStressScenario } from "./stress-scenario";

describe("rumus keuangan PRD B6.11", () => {
  it.each([
    [6_000_000, 0.03, 12, 508_164],
    [6_000_000, 0.03, 24, 257_886],
    [6_000_000, 0.03, 36, 174_487.26],
    [6_000_000, 0.06, 12, 516_397],
    [6_000_000, 0.06, 24, 265_926],
    [6_000_000, 0.06, 36, 182_533],
    [20_000_000, 0.06, 12, 1_721_325],
  ])("menghitung PMT %s %s %s", (principal, rate, term, expected) => {
    expect(pmt(principal, rate, term)).toBeCloseTo(expected, -1);
  });

  it("menangani bunga nol", () => {
    expect(pmt(1_200_000, 0, 12)).toBe(100_000);
    expect(plafonAman(100_000, 0, 12)).toBe(1_200_000);
  });

  it("menghitung batas dan plafon aman Bu Sari", () => {
    const safeLimit = batasAman(2_850_000, 2_000_000, 0);
    expect(safeLimit).toBe(850_000);
    expect(plafonAman(safeLimit, 0.06, 12)).toBeGreaterThan(9_880_000 * 0.99);
    expect(plafonAman(safeLimit, 0.06, 12)).toBeLessThan(9_880_000 * 1.01);
    expect(plafonAman(safeLimit, 0.06, 24)).toBeGreaterThan(19_180_000 * 0.99);
    expect(plafonAman(safeLimit, 0.06, 24)).toBeLessThan(19_180_000 * 1.01);
    expect(plafonAman(safeLimit, 0.06, 36)).toBeGreaterThan(27_940_000 * 0.99);
    expect(plafonAman(safeLimit, 0.06, 36)).toBeLessThan(27_940_000 * 1.01);
  });

  it("menentukan status sesuai rumus PRD", () => {
    const readyPayment = pmt(6_000_000, 0.03, 12);
    expect(rasioBeban(0, readyPayment, 2_850_000)).toBeCloseTo(0.1783, 3);
    expect(status(rasioBeban(0, readyPayment, 2_850_000), sisaKas(2_850_000, 2_000_000, 0, readyPayment), 2_850_000)).toBe("ready");
    const unsafePayment = pmt(20_000_000, 0.06, 12);
    expect(sisaKas(2_850_000, 2_000_000, 0, unsafePayment)).toBeCloseTo(-871_325, -1);
    expect(status(rasioBeban(0, unsafePayment, 2_850_000), -871_325, 2_850_000)).toBe("notReady");
  });
});

describe("agregasi dan stress test", () => {
  it("mengelompokkan minggu Senin-Minggu dan hanya memilih minggu penuh", () => {
    const transactions = [2, 3, 4, 5, 6].map((day) => ({ date: `2026-11-0${day}`, amount: day, category: "Pemasukan usaha" }));
    expect(aggregateByWeek(transactions)[0].key).toBe("2026-11-02");
    expect(fullWeeks(transactions)[0].recordedDays).toBe(5);
  });

  it("menormalisasi total ke 30 hari", () => {
    expect(normalizeToMonth(9_000_000, 90)).toBe(3_000_000);
  });

  it("memblokir stress test di bawah 28 hari", () => {
    expect(labaStress(100_000, 27)).toBeNull();
    expect(labaStress(100_000, 28)).toBeCloseTo(433_300, 1);
  });

  it("menghitung laba mingguan dan shock", () => {
    expect(labaMinggu(1_000_000, 400_000, 100_000, 433_300)).toBeCloseTo(400_000, 1);
    expect(labaShock(1_000_000, 400_000, 100_000, 0.1, 0.2)).toBe(368_000);
  });
});

describe("confidence, konsistensi, dan KUR", () => {
  it("menghasilkan keyakinan tinggi untuk lima pemeriksaan", () => {
    expect(assessConfidence({ periodDays: 90, hasCashSalesOrAllQrIs: true, hppSource: "nota", recordedDayRatio: 0.8, extractionConfirmed: true }).level).toBe("Tinggi");
    expect(assessConfidence({ periodDays: 90, hasCashSalesOrAllQrIs: true, hppSource: "estimasi", recordedDayRatio: 1, extractionConfirmed: true }).level).toBe("Rendah");
  });

  describe("klasifikasi dan ringkasan konfirmasi", () => {
    it("menggunakan kamus kategori berlapis", () => {
      expect(classifyByDictionary({ id: "1", tanggal: "2026-01-01", uraian: "Belanja beras", kategori: "", nominal: 50_000, arah: "keluar" })?.kategori).toBe("Pribadi/rumah tangga");
      expect(classifyByDictionary({ id: "2", tanggal: "2026-01-01", uraian: "Cabai merah", kategori: "", nominal: 50_000, arah: "keluar" })?.kategori).toBe("HPP");
    });

    describe("stress scenario vector B6.11", () => {
      it("menghasilkan status Bu Sari hijau dan merah", () => {
        const preset = getDemoPreset("bu-sari");
        const transactions = preset.transactions.map((transaction) => ({ ...transaction, keyakinan: 1 }));
        const green = evaluateStressScenario({ transactions, periodDays: 90, fixedMonthly: 1_000_000, kebutuhanRtMin: 2_000_000, cicilanLama: 0, plafon: 6_000_000, tenor: 12, sector: "produksi", akadKe: 1, omzetShock: 0, hppShock: 0 });
        const red = evaluateStressScenario({ transactions, periodDays: 90, fixedMonthly: 1_000_000, kebutuhanRtMin: 2_000_000, cicilanLama: 0, plafon: 20_000_000, tenor: 12, sector: "produksi", akadKe: 1, omzetShock: 0, hppShock: 0 });
        expect(green.labaSkenario).toBeCloseTo(2_850_000, -1);
        expect(green.status).toBe("ready");
        expect(red.status).toBe("notReady");
        expect(red.sisaKas).toBeCloseTo(-871_325, -1);
      });
    });

    it("menyusun ringkasan preset dengan pribadi dan minggu tersepi", () => {
      const preset = getDemoPreset("bu-sari");
      const rows = preset.transactions.map((transaction) => ({ ...transaction, keyakinan: 1 }));
      const summary = summarizeFinance(rows, { periodDays: 90, fixedMonthly: 1_000_000, hasCashSalesOrAllQrIs: true, hppSource: "buku_kas", extractionConfirmed: true });
      expect(summary.pengeluaranPribadi).toBeGreaterThan(0);
      expect(summary.mingguTersepi).not.toBeNull();
      expect(summary.mingguTersepi?.laba).toBeCloseTo(preset.stressTargetMonthly / 4.333, -1);
    });
  });

  it("menandai temuan konsistensi tanpa menyebut salah", () => {
    const findings = checkConsistency({ daily: [{ omzet: 100, hpp: 101 }], weekly: [], totalIncome: 100, totalExpense: 101, recordedDays: 7, totalDays: 10, transactionAmounts: [10, 10, 60] });
    expect(findings.map((item) => item.code)).toEqual(expect.arrayContaining(["hpp_over_omzet", "expense_over_income", "missing_days", "large_transaction"]));
    expect(findings.every((item) => item.message.includes("Perlu dicek"))).toBe(true);
  });

  it("menerapkan aturan bunga otomatis", () => {
    expect(automaticKurRate(10_000_000, "produksi")).toBe(0.03);
    expect(automaticKurRate(10_000_001, "produksi")).toBe(0.06);
    expect(automaticKurRate(1_000_000, "perdagangan_non_ekspor", 4)).toBe(0.09);
  });
});
