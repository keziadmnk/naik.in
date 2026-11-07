import { describe, expect, it } from "vitest";
import { KATEGORI_BAWAAN } from "../../../data/categories";
import { AWAL_DATA_TIGA_BULAN, HARI_INI_DEMO, transaksiDemo } from "../../../data/demo";
import {
  batasCicilan, buatJalur, cicilanBulanan, nilai, plafonAman, proyeksiKipas, rekomendasi, risikoNpl, siapkanData,
  susunTindakan, zonaSlider, type Kapasitas,
} from ".";

const TOL = 5;
const dekat = (aktual: number, harapan: number, tol = TOL) => expect(Math.abs(aktual - harapan)).toBeLessThanOrEqual(tol);

const data = siapkanData(transaksiDemo(), KATEGORI_BAWAAN, HARI_INI_DEMO);
const BU_SARI: Kapasitas = { labaRata: data.labaRata, labaStress: data.labaStress, labaTerburuk: data.labaTerburuk, kebutuhanRT: 2_000_000, cicilanLama: 0 };

describe("data demo Bu Sari (26 minggu)", () => {
  it("jendela 4 Mei – 1 Nov, terbuka, 24 minggu valid", () => {
    expect(data.jendela).toEqual({ dari: "2026-05-04", sampai: "2026-11-01" });
    expect(data.mingguValid).toBe(24);
    expect(data.terbuka).toBe(true);
  });
  it("Laba_rata, Laba_stress, Laba_terburuk", () => {
    dekat(data.labaRata, 5_500_000);
    dekat(data.labaStress, 2_850_000);
    dekat(data.labaTerburuk, 1_920_000);
  });
  it("mode 3 dari 6 bulan → terkunci", () => {
    const d = siapkanData(transaksiDemo().filter((t) => t.tanggal >= AWAL_DATA_TIGA_BULAN), KATEGORI_BAWAAN, HARI_INI_DEMO);
    expect(d.terbuka).toBe(false);
    expect(d.bulanTerdata).toBe(3);
  });
  it("opex tetap dirata-rata per minggu", () => {
    const tx = [
      ...transaksiDemo(),
      { id: "sewa", tanggal: "2026-06-01", uraian: "Sewa kios", arah: "keluar" as const, kategoriId: "sewa", metode: "Tunai" as const, nominal: 2_600_000, sumber: "manual" as const, dikonfirmasiAt: "" },
    ];
    const d = siapkanData(tx, KATEGORI_BAWAAN, HARI_INI_DEMO);
    expect(d.opexTetapRataMingguan).toBe(100_000);
    dekat(d.labaRata, 5_500_000 - 400_000);
  });
});

describe("batas & cicilan", () => {
  it("batas aman 850.000; batas hati-hati 2.200.000", () => {
    const b = batasCicilan(BU_SARI);
    dekat(b.aman, 850_000);
    dekat(b.hatiHati, 2_200_000);
  });
  it("Rp6 juta 3% 12 bulan = 508.164, Hijau", () => {
    const n = nilai(BU_SARI, 6_000_000, 12);
    expect(n.bunga.tahunan).toBe(0.03);
    expect(n.bunga.jenis).toBe("KUR Super Mikro");
    dekat(n.cicilanBaru, 508_164);
    expect(n.status).toBe("hijau");
  });
  it("Rp6 juta 6% 12/24/36 bulan", () => {
    dekat(cicilanBulanan(6_000_000, 0.06, 12), 516_397);
    dekat(cicilanBulanan(6_000_000, 0.06, 24), 265_926);
    dekat(cicilanBulanan(6_000_000, 0.06, 36), 182_533);
    dekat(nilai(BU_SARI, 6_000_000, 24, true).cicilanBaru, 265_926);
  });
  it("bunga 0% → P/n", () => {
    expect(cicilanBulanan(12_000_000, 0, 12)).toBe(1_000_000);
  });
  it("plafon aman pada bunga 6% (toleransi 1%)", () => {
    const { aman } = batasCicilan(BU_SARI);
    for (const [n, harapan] of [[12, 9_880_000], [24, 19_180_000], [36, 27_940_000]] as const)
      expect(Math.abs(plafonAman(aman, 0.06, n) - harapan) / harapan).toBeLessThan(0.01);
  });
});

describe("status & cadangan", () => {
  it("Rekomendasi: Rp17 juta, 24 bulan, 6%, cicilan ±753.457, Hijau, Sisa_stress ±96.500", () => {
    const r = rekomendasi(BU_SARI);
    expect(r.plafon).toBe(17_000_000);
    expect(r.tenor).toBe(24);
    expect(r.adaHijau).toBe(true);
    expect(r.penilaian.bunga.tahunan).toBe(0.06);
    dekat(r.penilaian.cicilanBaru, 753_457, 10);
    expect(r.penilaian.status).toBe("hijau");
    expect(Math.abs(r.penilaian.sisaStress - 96_500)).toBeLessThan(100);
  });
  it("Rp20 juta 6% 12 bulan → Kuning + cadangan", () => {
    const n = nilai(BU_SARI, 20_000_000, 12);
    dekat(n.cicilanBaru, 1_721_325);
    expect(Math.round(n.rasioRata * 1000) / 10).toBe(31.3);
    dekat(n.sisaRata, 1_778_675);
    dekat(n.sisaStress, -871_325);
    expect(n.status).toBe("kuning");
    expect(n.lolosLapis1).toBe(false);
    expect(n.lolosLapis2).toBe(false);
    dekat(n.cadangan!.target, 2_613_975, 15);
    dekat(n.cadangan!.setoranBulanan, 435_663);
    expect(n.cadangan!.realistis).toBe(true);
  });
  it("Rp30 juta 6% 12 bulan → Merah (rasio 46,9%)", () => {
    const n = nilai(BU_SARI, 30_000_000, 12);
    dekat(n.cicilanBaru, 2_581_986, 10);
    expect(Math.round(n.rasioRata * 1000) / 10).toBe(46.9);
    expect(n.status).toBe("merah");
  });
  it("cadangan tidak realistis → Merah", () => {
    const k: Kapasitas = { labaRata: 5_000_000, labaStress: 0, labaTerburuk: 0, kebutuhanRT: 3_000_000, cicilanLama: 0 };
    const n = nilai(k, 20_000_000, 36);
    expect(n.rasioRata).toBeLessThanOrEqual(0.4);
    expect(n.sisaRata).toBeGreaterThanOrEqual(0);
    expect(n.cadangan?.realistis).toBe(false);
    expect(n.status).toBe("merah");
    expect(n.alasan).toContain("cadangan_tidak_realistis");
  });
  it("laba rata ≤ 0 → Merah; tanpa plafon Hijau → rekomendasi Rp5 juta", () => {
    const k: Kapasitas = { labaRata: 0, labaStress: -500_000, labaTerburuk: -900_000, kebutuhanRT: 2_000_000, cicilanLama: 0 };
    expect(nilai(k, 5_000_000, 24).status).toBe("merah");
    const r = rekomendasi(k);
    expect(r.adaHijau).toBe(false);
    expect(r.plafon).toBe(5_000_000);
  });
  it("cicilan lama mengurangi batas", () => {
    dekat(batasCicilan({ ...BU_SARI, cicilanLama: 300_000 }).aman, 550_000);
  });
  it("zona slider: Hijau → Kuning → Merah berurutan", () => {
    const zona = zonaSlider(BU_SARI, 12).map((z) => z.status);
    const urutan = zona.filter((s, i) => i === 0 || s !== zona[i - 1]);
    expect(urutan).toEqual(["hijau", "kuning", "merah"]);
  });
});

describe("risiko NPL (Monte Carlo)", () => {
  const jalur = buatJalur(data.blok);
  it("seed sama → hasil sama", () => {
    const a = risikoNpl(jalur, 2_000_000, 1_721_325, 12);
    const b = risikoNpl(buatJalur(data.blok), 2_000_000, 1_721_325, 12);
    expect(a).toEqual(b);
  });
  it("naik monoton seiring plafon", () => {
    for (const tenor of [12, 24, 36]) {
      let sebelum = -1;
      let sulitSebelum = -1;
      for (let p = 5_000_000; p <= 50_000_000; p += 500_000) {
        const n = nilai(BU_SARI, p, tenor);
        const r = risikoNpl(jalur, BU_SARI.kebutuhanRT, n.beban, tenor);
        expect(r.npl).toBeGreaterThanOrEqual(sebelum);
        expect(r.peluangBulanSulit).toBeGreaterThanOrEqual(sulitSebelum);
        sebelum = r.npl;
        sulitSebelum = r.peluangBulanSulit;
      }
    }
  });
  it("rekomendasi berisiko rendah, Rp30 juta berisiko tinggi", () => {
    const rendah = risikoNpl(jalur, 2_000_000, 753_457, 24);
    const tinggi = risikoNpl(jalur, 2_000_000, 2_581_986, 12);
    expect(rendah.npl).toBeLessThan(0.01);
    expect(tinggi.npl).toBeGreaterThan(rendah.npl);
    expect(tinggi.peluangBulanSulit).toBeGreaterThan(rendah.peluangBulanSulit);
    expect(rendah.horizon).toBe(12);
  });
  it("proyeksi kipas 12 bulan: p10 ≤ median ≤ p90", () => {
    const k = proyeksiKipas(jalur, 2_000_000, 753_457);
    expect(k).toHaveLength(12);
    expect(k.every((b) => b.p10 <= b.p50 && b.p50 <= b.p90)).toBe(true);
  });
});

describe("rekomendasi tindakan", () => {
  it("Kuning karena stress → cadangan, turunkan plafon, perpanjang tenor, syarat", () => {
    const p = nilai(BU_SARI, 20_000_000, 12);
    const t = susunTindakan({
      kapasitas: BU_SARI, penilaian: p, konservatif: false,
      kelengkapan: { rasio: 24 / 26, mingguBelumValid: [] },
      pribadiTercampur: { jumlah: 2, total: 495_000 },
      labaBulanan: [],
    });
    expect(t.map((x) => x.jenis)).toEqual(["cadangan", "turunkan_plafon", "perpanjang_tenor", "pisahkan_rekening", "siapkan_syarat"]);
    dekat(t[0].angka.target as number, 2_613_975, 15);
    expect(t.find((x) => x.jenis === "perpanjang_tenor")!.angka.tenor).toBe(36);
    expect(t.find((x) => x.jenis === "turunkan_plafon")!.angka.plafon).toBe(10_000_000);
  });
  it("kelengkapan < 90% dan laba turun 3 bulan beruntun", () => {
    const t = susunTindakan({
      kapasitas: BU_SARI, penilaian: nilai(BU_SARI, 10_000_000, 24), konservatif: false,
      kelengkapan: { rasio: 0.8, mingguBelumValid: [{ dari: "2026-06-08", sampai: "2026-06-14" }] },
      pribadiTercampur: { jumlah: 0, total: 0 },
      labaBulanan: [{ bulan: "a", laba: 6e6 }, { bulan: "b", laba: 5e6 }, { bulan: "c", laba: 4e6 }, { bulan: "d", laba: 3e6 }],
    });
    expect(t.map((x) => x.jenis)).toEqual(["lengkapi_minggu", "tinjau_harga_bahan", "siapkan_syarat"]);
  });
});
