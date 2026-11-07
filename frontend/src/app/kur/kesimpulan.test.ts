import { describe, expect, it } from "vitest";
import { nilai, susunTindakan, zonaSlider, type Kapasitas } from "../../lib/engine/loan";
import { kesimpulanTemplat, rapikanAngka } from "./KesimpulanKur";

const kap: Kapasitas = { labaRata: 5_500_000, labaStress: 2_850_000, labaTerburuk: 1_900_000, kebutuhanRT: 0, cicilanLama: 0 };

const buat = (plafon: number) => {
  const p = nilai(kap, plafon, 24);
  const tindakan = susunTindakan({ kapasitas: kap, penilaian: p, konservatif: false, kelengkapan: { rasio: 1, mingguBelumValid: [] }, pribadiTercampur: { jumlah: 0, total: 0 }, labaBulanan: [] });
  return { p, isi: kesimpulanTemplat(p, kap, zonaSlider(kap, 24), tindakan) };
};

describe("kesimpulan simulasi KUR (bahasa awam, tanpa AI)", () => {
  it("rencana aman: kalimat menenangkan + insight angka dari engine", () => {
    const { p, isi } = buat(15_000_000);
    expect(p.status).toBe("hijau");
    expect(isi.kesimpulan).toMatch(/tetap bisa dibayar bahkan saat usaha sedang sepi/);
    expect(isi.insight.length).toBeGreaterThanOrEqual(3);
    expect(isi.insight.length).toBeLessThanOrEqual(4);
    expect(isi.insight.join(" ")).toMatch(/status(nya)? berubah menjadi/);
  });

  it("rencana terlalu besar: sarankan mengecilkan pinjaman, tanpa istilah teknis", () => {
    const { p, isi } = buat(50_000_000);
    expect(p.status).not.toBe("hijau");
    expect(isi.kesimpulan + isi.insight.join(" ")).not.toMatch(/rasio|kuartil|NPL/i);
    expect(isi.insight.join(" ")).toMatch(/masih masuk status|Belum ada jumlah pinjaman/);
  });

  it("angka mentah dari AI dirapikan jadi rupiah, tahun & persen tidak diubah", () => {
    expect(rapikanAngka("Cicilan 1564809 per bulan dari pinjaman 15000000")).toBe("Cicilan Rp1.564.809 per bulan dari pinjaman Rp15.000.000");
    expect(rapikanAngka("Rp1.564.809 di tahun 2027, 28,5 persen")).toBe("Rp1.564.809 di tahun 2027, 28,5 persen");
    expect(rapikanAngka("laba Rp5500000")).toBe("laba Rp5.500.000");
  });
});
