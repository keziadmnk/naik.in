export type Arah = "masuk" | "keluar";

export type Kelompok = "penjualan" | "pemasukan_lain" | "hpp" | "operasional" | "pribadi";

export type Metode = "Tunai" | "QRIS" | "Transfer" | "Marketplace";
export const METODE: Metode[] = ["Tunai", "QRIS", "Transfer", "Marketplace"];

export type Kategori = {
  id: string;
  nama: string;
  arah: Arah;
  kelompok: Kelompok;
  tetap?: boolean;
};

export type SumberTransaksi = "contoh" | "manual" | "unggah_file" | "scan_foto";

export type Transaksi = {
  id: string;
  tanggal: string;
  uraian: string;
  arah: Arah;
  kategoriId: string;
  metode: Metode;
  nominal: number;
  sumber: SumberTransaksi;
  dikonfirmasiAt: string;
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
  id: string;
  jenis: JenisTemuan;
  judul: string;
  alasan: string;
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
  mulaiUsaha: string;
};

export type BiayaRutin = {
  id: string;
  nama: string;
  jenis: "usaha";
  nominalBulanan: number;
};

export type Pengingat = {
  harian: boolean;
  jam: string;
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
  diperbaruiPada: string;
  jumlahTransaksi: number;
};
