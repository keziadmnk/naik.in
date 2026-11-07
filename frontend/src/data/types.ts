// Model data frontend. Struktur ini sejalan dengan skema database di
// backend/db/migrations/002_keuangan.sql (lihat docs/DATABASE.md).

export type Arah = "masuk" | "keluar";

/** Kelompok menentukan ke mana sebuah kategori dihitung di rekap kas. */
export type Kelompok = "penjualan" | "pemasukan_lain" | "hpp" | "operasional" | "pribadi";

export type Metode = "Tunai" | "QRIS" | "Transfer" | "Marketplace";
export const METODE: Metode[] = ["Tunai", "QRIS", "Transfer", "Marketplace"];

export type Kategori = {
  id: string;
  nama: string;
  arah: Arah;
  kelompok: Kelompok;
  /** Khusus kelompok operasional: biaya tetap (mis. sewa) dirata-rata per minggu di Simulasi KUR. */
  tetap?: boolean;
};

export type SumberTransaksi = "contoh" | "manual" | "unggah_file" | "scan_foto";

/** Transaksi di riwayat. Hanya baris yang sudah dikonfirmasi pengguna yang boleh menjadi Transaksi. */
export type Transaksi = {
  id: string;
  tanggal: string; // YYYY-MM-DD
  uraian: string;
  arah: Arah;
  kategoriId: string;
  metode: Metode;
  nominal: number; // rupiah, bilangan bulat > 0
  sumber: SumberTransaksi;
  dikonfirmasiAt: string; // ISO datetime
};

export type JenisTemuan =
  | "kemungkinan_pribadi"
  | "pemasukan_bukan_penjualan"
  | "duplikat"
  | "nominal_tidak_biasa"
  | "tanggal_bermasalah"
  | "hari_belum_dicatat";

export type TindakanTemuan = {
  id: string;
  label: string;
  utama?: boolean;
};

export type Temuan = {
  id: string; // stabil: jenis + id transaksi / rentang tanggal
  jenis: JenisTemuan;
  judul: string;
  alasan: string; // alasan deteksi (ditampilkan di panel detail)
  transaksiIds: string[];
  rentang?: { dari: string; sampai: string };
  tindakan: TindakanTemuan[];
};

export type ProfilUsaha = {
  namaPemilik: string;
  email: string;
  telepon: string;
  namaUsaha: string;
  kategoriUsaha: string;
  kota: string;
  mulaiUsaha: string; // YYYY-MM-DD
};

export type BiayaRutin = {
  id: string;
  nama: string;
  jenis: "usaha" | "rumah_tangga";
  nominalBulanan: number;
};

export type Pengingat = {
  harian: boolean;
  jam: string; // "20:00"
  mingguan: boolean;
};

export type PengaturanDemo = {
  akunKosong: boolean;
  dataTigaBulan: boolean;
  modeOffline: boolean;
};

export type RingkasanAi = {
  poin: string[];
  sumber: "ai" | "templat";
  diperbaruiPada: string; // YYYY-MM-DD
  jumlahTransaksi: number;
};
