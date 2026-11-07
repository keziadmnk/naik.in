import { describe, expect, it } from "vitest";
import { KATEGORI_BAWAAN } from "../data/categories";
import { AWAL_DATA_TIGA_BULAN, HARI_INI_DEMO, transaksiDemo } from "../data/demo";
import { kelengkapan, rekapBulanan, ringkas, stressOut, totalRekap } from "./finance";

const tx = transaksiDemo();
const juta = (n: number) => Math.round(n / 100_000) / 10;

describe("data contoh Bu Sari — angka spesifikasi harus muncul dari perhitungan", () => {
  const bulan = rekapBulanan(tx, KATEGORI_BAWAAN, "2026-05-01", "2026-10-31");

  it("rekap bulanan Mei–Okt sesuai tabel", () => {
    const tabel = bulan.map((b) => [b.kunci, juta(b.penjualan), juta(b.hpp), juta(b.operasional), juta(b.laba), juta(b.pribadi)]);
    expect(tabel).toEqual([
      ["2026-05", 19.8, 10.9, 3.8, 5.1, 2.1],
      ["2026-06", 18.6, 10.3, 3.6, 4.7, 2.6],
      ["2026-07", 22.9, 12.5, 4.2, 6.2, 2.8],
      ["2026-08", 21.7, 11.9, 4.0, 5.8, 2.4],
      ["2026-09", 21.1, 11.6, 3.9, 5.6, 2.1],
      ["2026-10", 21.3, 11.8, 3.9, 5.6, 2.1],
    ]);
    // Angka harus tepat, bukan sekadar hasil pembulatan
    expect(bulan[0].penjualan).toBe(19_800_000);
    expect(bulan[5].laba).toBe(5_600_000);
  });

  it("rata-rata 6 bulan", () => {
    const total = totalRekap(bulan);
    expect(total.penjualan / 6).toBeCloseTo(20_900_000, -3);
    expect(total.hpp / 6).toBe(11_500_000);
    expect(total.hpp / total.penjualan).toBeCloseTo(0.55, 2);
    expect(total.operasional / 6).toBe(3_900_000);
    expect(total.laba / 6).toBe(5_500_000);
    expect(total.pribadi / 6).toBe(2_350_000);
  });

  it("kelengkapan catatan: 24 dari 26 minggu (92%)", () => {
    const k = kelengkapan(tx, KATEGORI_BAWAAN, HARI_INI_DEMO);
    expect(k.mingguLengkap).toBe(24);
    expect(Math.round(k.rasio * 100)).toBe(92);
    expect(k.mingguBelumLengkap.map((m) => [m.dari, m.sampai])).toEqual([
      ["2026-06-08", "2026-06-14"],
      ["2026-10-26", "2026-11-01"],
    ]);
  });

  it("laba mingguan: rata-rata, kuartil bawah, terendah", () => {
    const s = stressOut(tx, KATEGORI_BAWAAN, HARI_INI_DEMO);
    expect(s.cukupData).toBe(true);
    expect(s.rataRata).toBe(1_375_000);
    expect(s.kuartilBawah).toBe(712_500);
    expect(s.terendah?.nilai).toBe(480_000);
  });

  it("15 transaksi terbaru tetap ada", () => {
    expect(tx.filter((t) => t.id.startsWith("t-"))).toHaveLength(15);
    expect(tx.filter((t) => t.tanggal >= "2026-11-01")).toHaveLength(15);
  });

  it("mode 3 dari 6 bulan menampilkan progres, bukan stress-out", () => {
    const sebagian = tx.filter((t) => t.tanggal >= AWAL_DATA_TIGA_BULAN);
    const s = stressOut(sebagian, KATEGORI_BAWAAN, HARI_INI_DEMO);
    expect(s.cukupData).toBe(false);
    expect(s.mingguValid).toBe(12);
  });

  it("semua nominal bilangan bulat positif", () => {
    expect(tx.every((t) => Number.isInteger(t.nominal) && t.nominal > 0)).toBe(true);
    expect(ringkas(tx, KATEGORI_BAWAAN).jumlahTransaksi).toBe(tx.length);
  });
});
