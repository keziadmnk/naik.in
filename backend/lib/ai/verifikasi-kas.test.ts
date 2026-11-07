import { describe, expect, it } from "vitest";
import { instruksiBacaUlang, skorMasalah, tandaiBarisTidakCocok, verifikasiKas, type BarisKas } from "./verifikasi-kas";

const b = (row_index: number, direction: BarisKas["direction"], amount: number | null, balance_after: number | null): BarisKas => ({
  row_index, direction, amount, balance_after, is_unclear: false, confidence: 0.95, review_note: null,
});

describe("verifikasi saldo buku kas", () => {
  const total = { opening_balance: 1_000_000, total_in: 1_500_000, total_out: 300_000, closing_balance: 2_200_000 };

  it("semua cocok bila nominal sesuai saldo & total", () => {
    const v = verifikasiKas([b(1, "IN", 1_500_000, 2_500_000), b(2, "OUT", 200_000, 2_300_000), b(3, "OUT", 100_000, 2_200_000)], total);
    expect(v).toMatchObject({ saldo_dicek: 3, saldo_cocok: 3, baris_tidak_cocok: [], total_masuk_cocok: true, total_keluar_cocok: true, saldo_akhir_cocok: true });
    expect(skorMasalah(v)).toBe(0);
  });

  it("salah baca satu nominal hanya menandai baris itu (tidak merembet)", () => {
    const v = verifikasiKas([b(1, "IN", 1_500_000, 2_500_000), b(2, "OUT", 700_000, 2_300_000), b(3, "OUT", 100_000, 2_200_000)], total);
    expect(v.baris_tidak_cocok).toEqual([2]);
    expect(v.total_keluar_cocok).toBe(false);
    const ditandai = tandaiBarisTidakCocok([b(1, "IN", 1_500_000, 2_500_000), b(2, "OUT", 700_000, 2_300_000)], v);
    expect(ditandai[1]).toMatchObject({ is_unclear: true, confidence: 0.6 });
    expect(ditandai[1].review_note).toMatch(/^Cek angka: saldo tertulis Rp2\.300\.000/);
    expect(instruksiBacaUlang(v)).toMatch(/baris 2:/);
  });

  it("tanpa kolom saldo: tidak ada yang bisa dicek, tidak ada yang ditandai", () => {
    const v = verifikasiKas([b(1, "IN", 50_000, null), b(2, "OUT", 20_000, null)], null);
    expect(v).toMatchObject({ saldo_dicek: 0, baris_tidak_cocok: [], total_masuk_cocok: null, saldo_akhir_cocok: null });
  });

  it("tanpa saldo awal: baris pertama jadi patokan, baris berikutnya tetap dicek", () => {
    const v = verifikasiKas([b(1, "IN", 100_000, 600_000), b(2, "OUT", 50_000, 550_000), b(3, "OUT", 50_000, 400_000)], null);
    expect(v.saldo_dicek).toBe(2);
    expect(v.baris_tidak_cocok).toEqual([3]);
  });
});
