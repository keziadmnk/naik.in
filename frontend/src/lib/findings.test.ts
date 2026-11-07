import { describe, expect, it } from "vitest";
import { KATEGORI_BAWAAN } from "../data/categories";
import { HARI_INI_DEMO, transaksiDemo } from "../data/demo";
import { deteksiTemuan } from "./findings";
import { barisDariTabel, parseCsv, parseNominal, parseTanggal, validasiDraf } from "./importer";

const tx = transaksiDemo();
const opsi = { hariIni: HARI_INI_DEMO, hariLibur: [] as string[], diabaikan: [] as string[] };

describe("temuan Perlu Dicek pada data contoh", () => {
  const temuan = deteksiTemuan(tx, KATEGORI_BAWAAN, opsi);
  const jenis = (j: string) => temuan.filter((t) => t.jenis === j);

  it("menemukan semua kasus anomali di 15 transaksi terbaru", () => {
    expect(jenis("kemungkinan_pribadi").map((t) => t.judul).sort()).toEqual(["Bayar sekolah Dinda", "Beli beras 10 kg"]);
    expect(jenis("pemasukan_bukan_penjualan").map((t) => t.judul)).toEqual(["Transfer dari Mas Rudi"]);
    expect(jenis("duplikat").map((t) => t.judul)).toEqual(["Beli tepung terigu 25 kg"]);
    expect(jenis("nominal_tidak_biasa").map((t) => t.judul)).toEqual(["Beli kompor gas 2 tungku"]);
    expect(jenis("tanggal_bermasalah").map((t) => t.judul)).toEqual(["Ongkir JNE pesanan Bukittinggi"]);
  });

  it("data historis tidak memicu temuan palsu", () => {
    const transaksiTemuan = temuan.flatMap((t) => t.transaksiIds);
    expect(transaksiTemuan.every((id) => id.startsWith("t-"))).toBe(true);
  });

  it("hari belum dicatat dikelompokkan per rentang", () => {
    expect(jenis("hari_belum_dicatat").map((t) => t.rentang)).toEqual([
      { dari: "2026-06-10", sampai: "2026-06-11" },
      { dari: "2026-06-13", sampai: "2026-06-14" },
      { dari: "2026-10-29", sampai: "2026-11-01" },
    ]);
  });

  it("temuan yang sudah ditindak tidak muncul lagi", () => {
    const sebelum = temuan.length;
    const sesudah = deteksiTemuan(tx, KATEGORI_BAWAAN, { ...opsi, diabaikan: [temuan[0].id] });
    expect(sesudah.length).toBe(sebelum - 1);
  });
});

describe("impor file", () => {
  it("membaca berbagai format tanggal & nominal", () => {
    expect(parseTanggal("2026-11-03")).toBe("2026-11-03");
    expect(parseTanggal("03/11/2026")).toBe("2026-11-03");
    expect(parseTanggal("3 Nov 2026")).toBe("2026-11-03");
    expect(parseTanggal("31/02/2026")).toBe("");
    expect(parseTanggal("kemarin")).toBe("");
    expect(parseNominal("Rp1.250.000")).toBe(1_250_000);
    expect(parseNominal("1.250.000,00")).toBe(1_250_000);
    expect(parseNominal("-350.000")).toBe(350_000);
  });

  it("memvalidasi tanggal: tidak terbaca, masa depan, duplikat, rentang file", () => {
    const csv = [
      "Tanggal;Uraian;Masuk;Keluar",
      "02/11/2026;Penjualan pasar;1.250.000;",
      "kemarin;Beli cabai;;300.000",
      "20/11/2026;Penjualan QRIS;500.000;",
      "03/11/2026;Beli tepung terigu 25 kg;;287.500",
      "15/03/2026;Bayar sewa;;800.000",
    ].join("\n");
    const draf = barisDariTabel(parseCsv(csv), KATEGORI_BAWAAN);
    expect(draf).toHaveLength(5);
    expect(draf[0]).toMatchObject({ arah: "masuk", nominal: 1_250_000, kategoriId: "penjualan" });
    const hasil = validasiDraf(draf, tx, HARI_INI_DEMO);
    const pesan = (i: number) => (hasil.masalah[draf[i].key] ?? []).map((m) => m.pesan).join(" | ");
    expect(pesan(0)).toBe("");
    expect(pesan(1)).toMatch(/tidak terbaca/);
    expect(pesan(2)).toMatch(/masa depan/);
    expect(pesan(3)).toMatch(/duplikat/);
    expect(pesan(4)).toMatch(/rentang file/);
    expect(hasil.jumlahGalat).toBe(2);
  });
});
