import type { Kategori, Kelompok } from "./types";

export const KATEGORI_BAWAAN: Kategori[] = [
  { id: "penjualan", nama: "Penjualan", arah: "masuk", kelompok: "penjualan" },
  { id: "pemasukan-lain", nama: "Pemasukan lain (bukan penjualan)", arah: "masuk", kelompok: "pemasukan_lain" },
  { id: "bahan-baku", nama: "Bahan baku", arah: "keluar", kelompok: "hpp" },
  { id: "kemasan", nama: "Kemasan", arah: "keluar", kelompok: "hpp" },
  { id: "gas-listrik", nama: "Gas, listrik & air", arah: "keluar", kelompok: "operasional" },
  { id: "sewa", nama: "Sewa tempat", arah: "keluar", kelompok: "operasional", tetap: true },
  { id: "gaji", nama: "Upah pekerja", arah: "keluar", kelompok: "operasional" },
  { id: "ongkir", nama: "Ongkir & transport", arah: "keluar", kelompok: "operasional" },
  { id: "peralatan", nama: "Peralatan", arah: "keluar", kelompok: "operasional" },
  { id: "admin", nama: "Admin, pulsa & lainnya", arah: "keluar", kelompok: "operasional" },
];

export const NAMA_KELOMPOK: Record<Kelompok, string> = {
  penjualan: "Penjualan",
  pemasukan_lain: "Pemasukan lain",
  hpp: "HPP",
  operasional: "Biaya operasional",
  pribadi: "Pengeluaran pribadi",
};

export function kategoriMap(kategori: Kategori[]): Record<string, Kategori> {
  return Object.fromEntries(kategori.map((k) => [k.id, k]));
}
