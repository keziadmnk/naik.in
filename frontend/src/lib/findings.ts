// Deteksi temuan "Perlu Dicek". Aturan dibuat sederhana & dapat dijelaskan
// agar setiap temuan punya alasan yang jelas di panel detail.

import { kategoriMap } from "../data/categories";
import type { Kategori, Temuan, Transaksi } from "../data/types";
import { addDays, rentang, rupiah, tanggal } from "./format";

const KATA_PRIBADI = [
  "beras", "sekolah", "spp", "jajan", "arisan", "kondangan", "rumah tangga",
  "belanja dapur", "pulsa pribadi", "listrik rumah", "cicilan motor", "baju",
];

const KATA_BUKAN_PENJUALAN = ["transfer dari", "pinjam", "pinjaman", "kiriman", "hibah", "modal dari"];

export const NAMA_JENIS: Record<Temuan["jenis"], string> = {
  kemungkinan_pribadi: "Kemungkinan pribadi",
  pemasukan_bukan_penjualan: "Pemasukan bukan penjualan",
  duplikat: "Kemungkinan duplikat",
  nominal_tidak_biasa: "Nominal tidak biasa",
  tanggal_bermasalah: "Tanggal bermasalah",
  hari_belum_dicatat: "Hari belum dicatat",
};

function median(nilai: number[]) {
  const urut = [...nilai].sort((a, b) => a - b);
  const tengah = Math.floor(urut.length / 2);
  return urut.length % 2 ? urut[tengah] : (urut[tengah - 1] + urut[tengah]) / 2;
}

export function deteksiTemuan(
  transaksi: Transaksi[],
  kategori: Kategori[],
  opsi: { hariIni: string; hariLibur: string[]; diabaikan: string[] },
): Temuan[] {
  const peta = kategoriMap(kategori);
  const hasil: Temuan[] = [];
  const abaikan = new Set(opsi.diabaikan);

  for (const t of transaksi) {
    const teks = t.uraian.toLowerCase();
    const kelompok = peta[t.kategoriId]?.kelompok;

    if (t.arah === "keluar" && kelompok !== "pribadi") {
      const kata = KATA_PRIBADI.find((k) => teks.includes(k));
      if (kata)
        hasil.push({
          id: `kemungkinan_pribadi:${t.id}`,
          jenis: "kemungkinan_pribadi",
          judul: t.uraian,
          alasan: `Uraian memuat kata "${kata}" yang biasanya kebutuhan rumah tangga, tetapi dicatat sebagai ${peta[t.kategoriId]?.nama ?? "biaya usaha"}. Jika benar pribadi, laba usaha tidak ikut berkurang.`,
          transaksiIds: [t.id],
          tindakan: [
            { id: "jadikan_pribadi", label: "Tandai pribadi", utama: true },
            { id: "abaikan", label: "Tetap biaya usaha" },
          ],
        });
    }

    if (t.arah === "masuk" && kelompok === "penjualan") {
      const kata = KATA_BUKAN_PENJUALAN.find((k) => teks.includes(k));
      if (kata)
        hasil.push({
          id: `pemasukan_bukan_penjualan:${t.id}`,
          jenis: "pemasukan_bukan_penjualan",
          judul: t.uraian,
          alasan: `Uraian memuat "${kata}", lebih mirip kiriman atau pinjaman daripada hasil jualan. Jika dihitung sebagai penjualan, omzet dan laba terlihat lebih besar dari sebenarnya.`,
          transaksiIds: [t.id],
          tindakan: [
            { id: "jadikan_pemasukan_lain", label: "Ubah ke pemasukan lain", utama: true },
            { id: "abaikan", label: "Memang penjualan" },
          ],
        });
    }

    if (t.tanggal > opsi.hariIni)
      hasil.push({
        id: `tanggal_bermasalah:${t.id}`,
        jenis: "tanggal_bermasalah",
        judul: t.uraian,
        alasan: `Tanggal ${tanggal(t.tanggal)} melewati hari ini (${tanggal(opsi.hariIni)}). Kemungkinan salah ketik saat mencatat.`,
        transaksiIds: [t.id],
        tindakan: [
          { id: "tanggal_hari_ini", label: "Ganti ke hari ini", utama: true },
          { id: "abaikan", label: "Tanggal sudah benar" },
        ],
      });
  }

  // Duplikat: tanggal, uraian, nominal, dan arah sama persis.
  const grup = new Map<string, Transaksi[]>();
  for (const t of transaksi) {
    const kunci = `${t.tanggal}|${t.uraian.trim().toLowerCase()}|${t.nominal}|${t.arah}`;
    grup.set(kunci, [...(grup.get(kunci) ?? []), t]);
  }
  for (const daftar of grup.values()) {
    if (daftar.length < 2) continue;
    const [asli, ...salinan] = daftar;
    for (const s of salinan)
      hasil.push({
        id: `duplikat:${s.id}`,
        jenis: "duplikat",
        judul: s.uraian,
        alasan: `Ada ${daftar.length} catatan "${asli.uraian}" sebesar ${rupiah(s.nominal)} pada ${tanggal(s.tanggal)}. Kemungkinan tercatat dua kali.`,
        transaksiIds: [s.id, asli.id],
        tindakan: [
          { id: "hapus_duplikat", label: "Hapus salah satu", utama: true },
          { id: "abaikan", label: "Memang dua kali" },
        ],
      });
  }

  // Nominal tidak biasa (uang keluar): ≥ 4× median kelompok biaya yang sama
  // (HPP / operasional / pribadi) dan minimal Rp1 juta. Dibandingkan per kelompok
  // agar kategori yang jarang dipakai (mis. Peralatan) tetap punya pembanding.
  const kelompokDari = (t: Transaksi) => peta[t.kategoriId]?.kelompok ?? "operasional";
  const perKelompok = new Map<string, number[]>();
  for (const t of transaksi)
    if (t.arah === "keluar") perKelompok.set(kelompokDari(t), [...(perKelompok.get(kelompokDari(t)) ?? []), t.nominal]);
  for (const t of transaksi) {
    if (t.arah !== "keluar" || t.nominal < 1_000_000) continue;
    const nilai = perKelompok.get(kelompokDari(t)) ?? [];
    if (nilai.length < 5) continue;
    const m = median(nilai);
    if (t.nominal >= 4 * m)
      hasil.push({
        id: `nominal_tidak_biasa:${t.id}`,
        jenis: "nominal_tidak_biasa",
        judul: t.uraian,
        alasan: `${rupiah(t.nominal)} sekitar ${Math.round(t.nominal / m)}× lebih besar dari pengeluaran sejenis yang biasa (umumnya ${rupiah(m)}). Pembelian alat besar membuat laba minggu ini tampak anjlok, jadi pastikan nominalnya benar.`,
        transaksiIds: [t.id],
        tindakan: [
          { id: "abaikan", label: "Nominal sudah benar", utama: true },
          { id: "buka_detail", label: "Periksa detail" },
        ],
      });
  }

  // Hari belum dicatat: rentang hari tanpa catatan di antara awal data dan hari ini.
  if (transaksi.length) {
    const tercatat = new Set([...transaksi.map((t) => t.tanggal), ...opsi.hariLibur]);
    const awal = transaksi.reduce((a, t) => (t.tanggal < a ? t.tanggal : a), transaksi[0].tanggal);
    let mulai: string | null = null;
    for (let d = awal; d <= opsi.hariIni; d = addDays(d, 1)) {
      const kosong = !tercatat.has(d);
      if (kosong && !mulai) mulai = d;
      const akhirRentang = mulai && (!kosong || d === opsi.hariIni);
      if (akhirRentang) {
        const sampai = kosong ? d : addDays(d, -1);
        const jumlah = Math.round((Date.parse(sampai) - Date.parse(mulai!)) / 86_400_000) + 1;
        hasil.push({
          id: `hari_belum_dicatat:${mulai}`,
          jenis: "hari_belum_dicatat",
          judul: `${jumlah} hari tanpa catatan`,
          alasan: `Tidak ada transaksi pada ${rentang(mulai!, sampai)}. Minggu dengan hari kosong tidak dihitung sebagai minggu lengkap, sehingga kelengkapan catatan turun.`,
          transaksiIds: [],
          rentang: { dari: mulai!, sampai },
          tindakan: [
            { id: "catat_hari", label: "Catat sekarang", utama: true },
            { id: "tandai_libur", label: "Tandai tutup/libur" },
          ],
        });
        mulai = null;
      }
    }
  }

  return hasil.filter((t) => !abaikan.has(t.id));
}
