import { describe, expect, it } from "vitest";
import {
  KETERANGAN_WAJIB, cariKlaim, cekAlamatProdusen, cekBeratBersih, cekKedaluwarsa, cekNomorIzin, dataLabelKosong,
  drafTeksLabel, hitungSkor, susunSaran, type DataLabel,
} from ".";

const lengkap = (): DataLabel => ({
  namaProduk: { nilai: "Keripik Balado Bu Sari", lokasi: "utama" },
  daftarBahan: { nilai: "Komposisi: singkong, minyak sawit, cabai", lokasi: "lain" },
  beratBersih: { nilai: "Berat bersih 200 g", lokasi: "utama" },
  produsen: { nilai: "Bu Sari, Jl. Mawar 12, Padang 25111, Indonesia", lokasi: "utama" },
  halal: { nilai: "Halal ID 123", lokasi: "utama" },
  kodeProduksi: { nilai: "061126-A", lokasi: "lain" },
  kedaluwarsa: { nilai: "Baik digunakan sebelum 06 05 2027", lokasi: "utama" },
  nomorIzin: { nilai: "P-IRT 123456789012345", lokasi: "utama" },
  asalUsul: { nilai: "", lokasi: "tidak_terlihat", tidakBerlaku: true },
});

describe("9 keterangan wajib", () => {
  it("ada tepat 9 dan bobotnya 100", () => {
    expect(KETERANGAN_WAJIB).toHaveLength(9);
    expect(hitungSkor(dataLabelKosong(), "beredar", "").items.reduce((a, i) => a + i.bobot, 0)).toBe(100);
  });
});

describe("skor label", () => {
  it("label lengkap = 100, Lengkap", () => {
    const h = hitungSkor(lengkap(), "beredar", "Padang");
    expect(h.skor).toBe(100);
    expect(h.kategori).toBe("Lengkap");
    expect(h.items.find((i) => i.kunci === "asalUsul")?.status).toBe("Tidak berlaku");
  });
  it("mode draf mengecualikan nomor izin", () => {
    const d = lengkap();
    d.nomorIzin = { nilai: "", lokasi: "tidak_terlihat" };
    const h = hitungSkor(d, "draf", "Padang");
    expect(h.skor).toBe(100);
    expect(h.catatanDraf).toContain("nomor izin");
  });
  it("setengah poin bila di bagian lain atau format kurang", () => {
    const d = lengkap();
    d.namaProduk.lokasi = "lain";
    const h = hitungSkor(d, "beredar", "Padang");
    expect(h.items[0].status).toBe("Ada tapi kurang");
    expect(h.skor).toBeCloseTo(((95 - 6) / 95) * 100, 5);
  });
  it("label kosong = 0, Perlu dilengkapi; saran urut dari bobot terbesar", () => {
    const h = hitungSkor(dataLabelKosong(), "beredar", "Padang");
    expect(h.skor).toBe(0);
    expect(h.kategori).toBe("Perlu dilengkapi");
    expect(susunSaran(h)[0].kunci).toBe("nomorIzin");
  });
});

describe("validator", () => {
  it("nomor izin aktif, lama, SP", () => {
    expect(cekNomorIzin("BPOM RI MD 123456789012345").valid).toBe(true);
    expect(cekNomorIzin("PIRT 123456789012345").valid).toBe(true);
    expect(cekNomorIzin("P-IRT 123456789012").peringatan).toBe("format_lama");
    expect(cekNomorIzin("SP").peringatan).toBe("bukan_izin_edar");
  });
  it("kedaluwarsa, alamat, berat", () => {
    expect(cekKedaluwarsa("Baik digunakan sebelum 12/12/2027").valid).toBe(true);
    expect(cekKedaluwarsa("Exp 12/12/2027").valid).toBe(false);
    expect(cekAlamatProdusen("Jalan Mawar, Padang 25111, Indonesia", "Padang").valid).toBe(true);
    expect(cekAlamatProdusen("Jalan Mawar, Padang", "Padang").valid).toBe(false);
    expect(cekBeratBersih("250 g").valid).toBe(true);
    expect(cekBeratBersih("1 bungkus").valid).toBe(false);
  });
});

describe("klaim & draf", () => {
  it("klaim superlatif, kemurnian, BTP", () => {
    const k = cariKlaim("Keripik terbaik dan alami, tanpa BTP.");
    expect(k.map((x) => x.kutipan.toLowerCase())).toEqual(["terbaik", "tanpa btp", "alami"]);
  });
  it("draf tidak mengarang data: yang kosong jadi [ISI: ...]", () => {
    const d = dataLabelKosong();
    d.namaProduk.nilai = "Keripik Balado";
    const t = drafTeksLabel(d, "beredar");
    expect(t.depan).toContain("Keripik Balado");
    expect(t.belakang).toContain("[ISI: Komposisi");
    expect(t.depan + t.belakang).not.toMatch(/\d{15}/);
  });
  it("draf dipisah: keterangan bagian utama di depan, sisanya di belakang", () => {
    const d = dataLabelKosong();
    d.beratBersih.nilai = "Berat bersih 200 g";
    d.daftarBahan.nilai = "Komposisi: jagung, gula";
    const t = drafTeksLabel(d, "beredar");
    expect(t.depan).toContain("Berat bersih 200 g");
    expect(t.depan).not.toContain("Komposisi");
    expect(t.belakang).toContain("Komposisi: jagung, gula");
  });
  it("alamat produsen: kota mana pun di Indonesia terdeteksi, bukan hanya kota pengguna", () => {
    expect(cekAlamatProdusen("PT Dua Kelinci, Pati, Jawa Tengah 59154, Indonesia", "Padang").valid).toBe(true);
    expect(cekAlamatProdusen("Diproduksi oleh PT Oishi, Kab. Bekasi 17530, Indonesia", "").valid).toBe(true);
    expect(cekAlamatProdusen("Jl. Raya No. 5 17530, Indonesia", "Padang").pesan).toMatch(/nama kota/);
  });
  it("keterangan tidak terbaca → saran foto ulang, bukan 'tambahkan'", () => {
    const d = dataLabelKosong();
    d.kedaluwarsa = { nilai: "", lokasi: "tidak_terlihat", tidakTerbaca: true };
    const s = susunSaran(hitungSkor(d, "beredar", "Padang")).find((x) => x.kunci === "kedaluwarsa")!;
    expect(s.teks).toMatch(/tidak terbaca dari foto/);
  });
  it("asal usul: halal tercantum → otomatis lulus (tidak berlaku), tidak pernah merah", () => {
    const d = lengkap();
    d.asalUsul = { nilai: "", lokasi: "tidak_terlihat" };
    expect(hitungSkor(d, "beredar", "Padang").items.find((i) => i.kunci === "asalUsul")?.status).toBe("Tidak berlaku");
  });
  it("asal usul: halal tidak tercantum → wajib; kosong = Tidak ada (merah), bisa diisi manual", () => {
    const d = lengkap();
    d.halal = { nilai: "", lokasi: "tidak_terlihat" };
    d.asalUsul = { nilai: "", lokasi: "tidak_terlihat", tidakBerlaku: true };
    const item = () => hitungSkor(d, "beredar", "Padang").items.find((i) => i.kunci === "asalUsul")!;
    expect(item().status).toBe("Tidak ada");
    d.asalUsul = { nilai: "Mengandung babi", lokasi: "utama" };
    expect(item().status).toBe("Sesuai");
  });
});
