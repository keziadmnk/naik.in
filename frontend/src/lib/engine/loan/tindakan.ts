import { BULAN_CADANGAN, BULAN_MENABUNG_CADANGAN, KELENGKAPAN_MINIMUM, MINGGU_JENDELA } from "../../config/thresholds";
import { rentang, rupiah } from "../../format";
import { LABEL_STATUS, plafonHijauTerbesar, tenorHijauTerdekat, type Kapasitas, type Penilaian, type Rekomendasi } from "./hitung";

export type JenisTindakan =
  | "cadangan"
  | "turunkan_plafon"
  | "perpanjang_tenor"
  | "pisahkan_rekening"
  | "lengkapi_minggu"
  | "tinjau_harga_bahan"
  | "siapkan_syarat";

export type Tindakan = {
  jenis: JenisTindakan;
  prioritas: number;
  judul: string;
  angka: Record<string, number | string>;
  teks: string;
};

export type KonteksTindakan = {
  kapasitas: Kapasitas;
  penilaian: Penilaian;
  konservatif: boolean;
  kelengkapan: { rasio: number; mingguBelumValid: { dari: string; sampai: string }[] };
  pribadiTercampur: { jumlah: number; total: number };
  labaBulanan: { bulan: string; laba: number }[];
};

export function susunTindakan(c: KonteksTindakan): Tindakan[] {
  const { penilaian: p, kapasitas: k } = c;
  const hasil: Tindakan[] = [];

  if (p.status !== "hijau" && p.sisaStress < 0) {
    if (p.cadangan && p.status === "kuning")
      hasil.push({
        jenis: "cadangan",
        prioritas: 1,
        judul: "Siapkan tabungan cadangan cicilan",
        angka: { target: p.cadangan.target, setoranBulanan: p.cadangan.setoranBulanan, bulanSepi: BULAN_CADANGAN, bulanMenabung: BULAN_MENABUNG_CADANGAN },
        teks: `Sisihkan ${rupiah(p.cadangan.setoranBulanan)} per bulan selama ${BULAN_MENABUNG_CADANGAN} bulan hingga terkumpul ${rupiah(p.cadangan.target)}, cukup untuk menutup ${BULAN_CADANGAN} bulan sepi.`,
      });
  }

  if (p.status !== "hijau") {
    const x = plafonHijauTerbesar(k, p.tenor, c.konservatif);
    if (x !== null && x < p.plafon)
      hasil.push({
        jenis: "turunkan_plafon",
        prioritas: 2,
        judul: "Turunkan plafon",
        angka: { plafon: x, tenor: p.tenor },
        teks: `Turunkan plafon ke ${rupiah(x)} agar cicilan ${p.tenor} bulan masuk zona Hijau.`,
      });
    const y = tenorHijauTerdekat(k, p.plafon, p.tenor, c.konservatif);
    if (y !== null)
      hasil.push({
        jenis: "perpanjang_tenor",
        prioritas: 2,
        judul: "Perpanjang tenor",
        angka: { tenor: y, plafon: p.plafon },
        teks: `Perpanjang tenor ke ${y} bulan agar plafon ${rupiah(p.plafon)} masuk zona Hijau.`,
      });
  }

  if (c.pribadiTercampur.jumlah > 0)
    hasil.push({
      jenis: "pisahkan_rekening",
      prioritas: 3,
      judul: "Pisahkan rekening usaha dan pribadi",
      angka: { jumlah: c.pribadiTercampur.jumlah, total: c.pribadiTercampur.total },
      teks: `Ada ${c.pribadiTercampur.jumlah} pengeluaran pribadi (${rupiah(c.pribadiTercampur.total)}) yang tercatat sebagai biaya usaha. Rekening terpisah membuat laba terlihat apa adanya.`,
    });

  if (c.kelengkapan.rasio < KELENGKAPAN_MINIMUM && c.kelengkapan.mingguBelumValid.length)
    hasil.push({
      jenis: "lengkapi_minggu",
      prioritas: 3,
      judul: "Lengkapi catatan minggu yang kosong",
      angka: { persen: Math.round(c.kelengkapan.rasio * 100), minggu: c.kelengkapan.mingguBelumValid.length, dari: MINGGU_JENDELA },
      teks: `Kelengkapan catatan ${Math.round(c.kelengkapan.rasio * 100)}%. Lengkapi minggu ${c.kelengkapan.mingguBelumValid
        .slice(0, 3)
        .map((m) => rentang(m.dari, m.sampai))
        .join(", ")}${c.kelengkapan.mingguBelumValid.length > 3 ? ", dan lainnya" : ""}.`,
    });

  const akhir = c.labaBulanan.slice(-4);
  if (akhir.length === 4 && akhir.every((b, i) => i === 0 || b.laba < akhir[i - 1].laba))
    hasil.push({
      jenis: "tinjau_harga_bahan",
      prioritas: 3,
      judul: "Tinjau harga bahan dan harga jual",
      angka: { dari: akhir[0].laba, ke: akhir[3].laba },
      teks: `Laba usaha turun tiga bulan beruntun, dari ${rupiah(akhir[0].laba)} menjadi ${rupiah(akhir[3].laba)}. Cek harga bahan baku dan harga jual.`,
    });

  hasil.push({
    jenis: "siapkan_syarat",
    prioritas: 4,
    judul: "Siapkan syarat KUR",
    angka: {},
    teks: "Siapkan NIB atau SKU, e-KTP, dan catatan keuangan 6 bulan ini sebelum datang ke bank penyalur.",
  });

  return hasil.sort((a, b) => a.prioritas - b.prioritas);
}

export function penjelasanRekomendasi(r: Rekomendasi, k: Kapasitas): string {
  if (!r.adaHijau)
    return `Belum ada plafon yang masuk zona Hijau: saat bulan sepi, laba ${rupiah(k.labaStress)} belum cukup untuk membayar cicilan. Titik awal diatur ke ${rupiah(r.plafon)} sebagai acuan terkecil. Benahi dulu catatan atau tambah laba di minggu sepi sebelum mengajukan.`;
  return `Rekomendasi ${rupiah(r.plafon)} dengan tenor ${r.tenor} bulan membuat cicilan ${rupiah(r.penilaian.cicilanBaru)} per bulan, masih di bawah 90% batas aman ${rupiah(r.batasAman)}. Batas itu diambil dari angka terkecil antara 30% laba rata-rata dan laba bulan sepi. Dengan begitu, cicilan tetap terbayar meski usaha sedang sepi.`;
}

export function kalimatStatus(p: Penilaian): string {
  if (p.status === "hijau") return `${LABEL_STATUS.hijau}: cicilan tetap terbayar saat rata-rata maupun saat bulan sepi.`;
  if (p.status === "kuning")
    return `${LABEL_STATUS.kuning}: rata-rata aman, tetapi saat bulan sepi kas ${p.sisaStress < 0 ? `kurang ${rupiah(-p.sisaStress)}` : "tipis"}. Siapkan tabungan cadangan cicilan.`;
  if (p.alasan.includes("cadangan_tidak_realistis")) return `${LABEL_STATUS.merah}: kekurangan saat bulan sepi terlalu besar untuk ditutup tabungan cadangan. Turunkan plafon atau perpanjang tenor.`;
  if (p.alasan.includes("laba_tidak_positif")) return `${LABEL_STATUS.merah}: laba rata-rata belum positif, jadi belum ada ruang untuk cicilan.`;
  return `${LABEL_STATUS.merah}: cicilan terlalu besar dibanding laba rata-rata. Turunkan plafon atau perpanjang tenor.`;
}
