// Konstanta perhitungan NAIK.IN. Ubah angka di sini, bukan di dalam engine.

// ---------- Data & jendela analisis ----------
/** Jendela analisis: 26 minggu penuh (Senin–Minggu) terakhir ≈ 6 bulan. */
export const MINGGU_JENDELA = 26;
/** Minggu valid bila minimal sekian hari tercatat (hari libur dihitung tercatat). */
export const MIN_HARI_MINGGU_VALID = 5;
/** Simulasi KUR terbuka bila minimal sekian minggu valid dari 26. */
export const MIN_MINGGU_VALID_KUR = 21;
/** Satu "bulan" dalam perhitungan kapasitas = 4 minggu. */
export const MINGGU_PER_BULAN = 4;
/** Kuartil bawah untuk Lapis 2 (uji tekan saat sepi). */
export const PERSENTIL_STRESS = 0.25;
/** Kelengkapan catatan di bawah ini memunculkan rekomendasi "lengkapi minggu". */
export const KELENGKAPAN_MINIMUM = 0.9;

// ---------- Ambang status (ambang kehati-hatian NAIK.IN, bukan standar bank) ----------
export const AMBANG_HIJAU = 0.3;
export const AMBANG_KUNING = 0.4;
export const LABEL_AMBANG = "ambang kehati-hatian NAIK-KELAS, bukan standar bank";

// ---------- Tabungan cadangan cicilan ----------
/** Cadangan disiapkan untuk sekian bulan sepi. */
export const BULAN_CADANGAN = 3;
/** Cadangan dikumpulkan dalam sekian bulan. */
export const BULAN_MENABUNG_CADANGAN = 6;

// ---------- Plafon, tenor, bunga KUR ----------
export const PLAFON_MIN = 5_000_000;
export const PLAFON_MAKS = 50_000_000;
export const PLAFON_LANGKAH = 500_000;
export const TENOR_PILIHAN = [12, 24, 36] as const;
export type Tenor = (typeof TENOR_PILIHAN)[number];
/** KUR Super Mikro: plafon s.d. Rp10 juta, bunga 3%/tahun. */
export const BATAS_KUR_SUPER_MIKRO = 10_000_000;
export const BUNGA_KUR_SUPER_MIKRO = 0.03;
/** KUR Mikro (sektor produksi): bunga 6%/tahun. */
export const BUNGA_KUR_MIKRO = 0.06;
/** NPWP diperlukan untuk plafon di atas nilai ini. */
export const PLAFON_WAJIB_NPWP = 50_000_000;
/** Usaha aktif minimal (bulan); ada pengecualian untuk KUR Super Mikro. */
export const USIA_USAHA_MIN_BULAN = 6;

// ---------- Rekomendasi ----------
export const TENOR_REKOMENDASI: Tenor = 24;
/** Titik rekomendasi: cicilan ≤ 90% batas aman. */
export const PORSI_BATAS_AMAN_REKOMENDASI = 0.9;

// ---------- Simulasi risiko NPL (Monte Carlo, block bootstrap) ----------
export const JUMLAH_SIMULASI = 2000;
export const SEED_SIMULASI = 20261106;
/** Satu bulan simulasi = dua blok × dua minggu berurutan. */
export const MINGGU_PER_BLOK = 2;
export const BLOK_PER_BULAN = 2;
/** Macet indikatif = minimal sekian bulan sulit bayar berturut-turut. */
export const BULAN_SULIT_BERUNTUN_NPL = 3;
/** Horizon NPL = min(tenor, nilai ini) bulan. */
export const HORIZON_NPL_MAKS = 12;
/** Horizon proyeksi saldo kas bebas (grafik kipas). */
export const HORIZON_PROYEKSI = 12;

// ---------- Label produk (pangan olahan, PerBPOM tentang Label Pangan Olahan) ----------
export const LABEL_SETENGAH_POIN = 0.5;
export const DIGIT_IZIN_SEKARANG = 15;
export const DIGIT_IZIN_LAMA = 12;
export const DIGIT_KODE_POS = 5;
export const SATUAN_BERAT_BERSIH = ["mg", "g", "kg", "ml", "l"] as const;
/** Bobot 9 keterangan wajib (total 100). */
export const BOBOT_LABEL = {
  namaProduk: 12,
  daftarBahan: 14,
  beratBersih: 12,
  produsen: 12,
  halal: 8,
  kodeProduksi: 10,
  kedaluwarsa: 12,
  nomorIzin: 15,
  asalUsul: 5,
} as const;
/** Keterangan yang wajib ada di bagian utama label. */
export const LABEL_WAJIB_BAGIAN_UTAMA = ["namaProduk", "beratBersih", "produsen", "halal", "kedaluwarsa", "nomorIzin"] as const;
export const SKOR_LABEL_LENGKAP = 90;
export const SKOR_LABEL_HAMPIR = 70;
