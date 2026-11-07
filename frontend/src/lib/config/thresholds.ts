export const MINGGU_JENDELA = 26;
export const MIN_HARI_MINGGU_VALID = 5;
export const MIN_MINGGU_VALID_KUR = 21;
export const MINGGU_PER_BULAN = 4;
export const PERSENTIL_STRESS = 0.25;
export const KELENGKAPAN_MINIMUM = 0.9;

export const AMBANG_HIJAU = 0.3;
export const AMBANG_KUNING = 0.4;
export const LABEL_AMBANG = "ambang kehati-hatian NAIK-KELAS, bukan standar bank";

export const BULAN_CADANGAN = 3;
export const BULAN_MENABUNG_CADANGAN = 6;

export const PLAFON_MIN = 5_000_000;
export const PLAFON_MAKS = 50_000_000;
export const PLAFON_LANGKAH = 500_000;
export const TENOR_PILIHAN = [12, 24, 36] as const;
export type Tenor = (typeof TENOR_PILIHAN)[number];
export const BATAS_KUR_SUPER_MIKRO = 10_000_000;
export const BUNGA_KUR_SUPER_MIKRO = 0.03;
export const BUNGA_KUR_MIKRO = 0.06;
export const PLAFON_WAJIB_NPWP = 50_000_000;
export const USIA_USAHA_MIN_BULAN = 6;

export const TENOR_REKOMENDASI: Tenor = 24;
export const PORSI_BATAS_AMAN_REKOMENDASI = 0.9;

export const JUMLAH_SIMULASI = 2000;
export const SEED_SIMULASI = 20261106;
export const MINGGU_PER_BLOK = 2;
export const BLOK_PER_BULAN = 2;
export const BULAN_SULIT_BERUNTUN_NPL = 3;
export const HORIZON_NPL_MAKS = 12;
export const HORIZON_PROYEKSI = 12;

export const LABEL_SETENGAH_POIN = 0.5;
export const DIGIT_IZIN_SEKARANG = 15;
export const DIGIT_IZIN_LAMA = 12;
export const DIGIT_KODE_POS = 5;
export const SATUAN_BERAT_BERSIH = ["mg", "g", "kg", "ml", "l"] as const;
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
export const LABEL_WAJIB_BAGIAN_UTAMA = ["namaProduk", "beratBersih", "produsen", "halal", "kedaluwarsa", "nomorIzin"] as const;
export const SKOR_LABEL_LENGKAP = 90;
export const SKOR_LABEL_HAMPIR = 70;
