// Perhitungan keuangan. Semua angka ringkasan di aplikasi berasal dari fungsi di sini,
// dihitung ulang dari daftar transaksi — tidak ada angka yang ditulis tetap.

import { kategoriMap } from "../data/categories";
import { MIN_HARI_MINGGU_VALID } from "./config/thresholds";
import type { Kategori, Kelompok, Transaksi } from "../data/types";
import { addDays, daysBetween, monthKey, weekStart } from "./format";

export type Ringkasan = {
  uangMasuk: number;
  penjualan: number;
  pemasukanLain: number;
  uangKeluar: number;
  hpp: number;
  operasional: number;
  pribadi: number;
  /** Laba usaha = penjualan − HPP − biaya operasional (pengeluaran pribadi tidak dihitung). */
  laba: number;
  /** Selisih kas = semua uang masuk − semua uang keluar. */
  selisih: number;
  jumlahTransaksi: number;
};

const kosong = (): Ringkasan => ({
  uangMasuk: 0, penjualan: 0, pemasukanLain: 0, uangKeluar: 0, hpp: 0,
  operasional: 0, pribadi: 0, laba: 0, selisih: 0, jumlahTransaksi: 0,
});

export function ringkas(transaksi: Transaksi[], kategori: Kategori[]): Ringkasan {
  const peta = kategoriMap(kategori);
  const r = kosong();
  for (const t of transaksi) {
    const kelompok: Kelompok = peta[t.kategoriId]?.kelompok ?? (t.arah === "masuk" ? "pemasukan_lain" : "operasional");
    r.jumlahTransaksi += 1;
    if (t.arah === "masuk") {
      r.uangMasuk += t.nominal;
      if (kelompok === "penjualan") r.penjualan += t.nominal;
      else r.pemasukanLain += t.nominal;
    } else {
      r.uangKeluar += t.nominal;
      if (kelompok === "hpp") r.hpp += t.nominal;
      else if (kelompok === "pribadi") r.pribadi += t.nominal;
      else r.operasional += t.nominal;
    }
  }
  r.laba = r.penjualan - r.hpp - r.operasional;
  r.selisih = r.uangMasuk - r.uangKeluar;
  return r;
}

export const dalamRentang = (transaksi: Transaksi[], dari: string, sampai: string) =>
  transaksi.filter((t) => t.tanggal >= dari && t.tanggal <= sampai);

// ---------------------------------------------------------------------------
// Periode dasbor
// ---------------------------------------------------------------------------

export type PeriodeId = "30h" | "3b" | "6b";
export const PERIODE: { id: PeriodeId; label: string; hari: number }[] = [
  { id: "30h", label: "30 hari", hari: 30 },
  { id: "3b", label: "3 bulan", hari: 92 },
  { id: "6b", label: "6 bulan", hari: 187 },
];

export function rentangPeriode(id: PeriodeId, hariIni: string) {
  const hari = PERIODE.find((p) => p.id === id)!.hari;
  const dari = addDays(hariIni, -(hari - 1));
  const sebelumSampai = addDays(dari, -1);
  const sebelumDari = addDays(sebelumSampai, -(hari - 1));
  return { dari, sampai: hariIni, sebelumDari, sebelumSampai };
}

/** Perubahan relatif; null jika periode pembanding kosong. */
export function perubahan(sekarang: number, sebelum: number): number | null {
  if (sebelum === 0) return null;
  return (sekarang - sebelum) / Math.abs(sebelum);
}

// ---------------------------------------------------------------------------
// Rekap per minggu / bulan
// ---------------------------------------------------------------------------

export type BarisRekap = Ringkasan & {
  kunci: string;
  dari: string;
  sampai: string;
  /** Minggu: jumlah hari tercatat (0–7). */
  hariTercatat: number;
  lengkap: boolean;
  perKategori: Record<string, number>;
};

export function hariTercatatSet(transaksi: Transaksi[], hariLibur: string[] = []): Set<string> {
  return new Set([...transaksi.map((t) => t.tanggal), ...hariLibur]);
}

/** Minggu dianggap lengkap bila minimal 5 dari 7 hari punya catatan (atau ditandai libur). */
export const MIN_HARI_MINGGU_LENGKAP = MIN_HARI_MINGGU_VALID;

export function rekapMingguan(
  transaksi: Transaksi[],
  kategori: Kategori[],
  dari: string,
  sampai: string,
  hariLibur: string[] = [],
): BarisRekap[] {
  const tercatat = hariTercatatSet(transaksi, hariLibur);
  const baris: BarisRekap[] = [];
  for (let senin = weekStart(dari); senin <= sampai; senin = addDays(senin, 7)) {
    const minggu = addDays(senin, 6);
    const akhir = minggu < sampai ? minggu : sampai;
    const isi = dalamRentang(transaksi, senin, minggu);
    let hari = 0;
    for (let i = 0; i < 7; i += 1) if (tercatat.has(addDays(senin, i))) hari += 1;
    baris.push({
      ...ringkas(isi, kategori),
      kunci: senin,
      dari: senin,
      sampai: akhir,
      hariTercatat: hari,
      lengkap: minggu <= sampai && hari >= MIN_HARI_MINGGU_LENGKAP,
      perKategori: perKategori(isi),
    });
  }
  return baris;
}

export function rekapBulanan(transaksi: Transaksi[], kategori: Kategori[], dari: string, sampai: string): BarisRekap[] {
  const kunci = new Set<string>();
  for (let d = dari; d <= sampai; d = addDays(d, 1)) kunci.add(monthKey(d));
  return [...kunci].map((bulan) => {
    const isi = transaksi.filter((t) => monthKey(t.tanggal) === bulan && t.tanggal >= dari && t.tanggal <= sampai);
    const awal = `${bulan}-01`;
    const akhirBulan = addDays(`${monthKey(addDays(awal, 32))}-01`, -1);
    return {
      ...ringkas(isi, kategori),
      kunci: bulan,
      dari: awal < dari ? dari : awal,
      sampai: akhirBulan > sampai ? sampai : akhirBulan,
      hariTercatat: new Set(isi.map((t) => t.tanggal)).size,
      lengkap: akhirBulan <= sampai,
      perKategori: perKategori(isi),
    };
  });
}

function perKategori(transaksi: Transaksi[]): Record<string, number> {
  const hasil: Record<string, number> = {};
  for (const t of transaksi) hasil[t.kategoriId] = (hasil[t.kategoriId] ?? 0) + t.nominal;
  return hasil;
}

export function totalRekap(baris: BarisRekap[]): Ringkasan {
  const t = kosong();
  for (const b of baris) {
    (Object.keys(t) as (keyof Ringkasan)[]).forEach((k) => {
      t[k] += b[k];
    });
  }
  return t;
}

// ---------------------------------------------------------------------------
// Kelengkapan catatan & Laba Minggu Tersepi (stress-out)
// ---------------------------------------------------------------------------

export const MINGGU_ENAM_BULAN = 26;

export const transaksiPertama = (transaksi: Transaksi[]) =>
  transaksi.reduce((a, t) => (t.tanggal < a ? t.tanggal : a), transaksi[0].tanggal);

/** 26 minggu penuh terakhir yang sudah berakhir (Senin–Minggu) sebelum minggu berjalan. */
export function mingguEnamBulan(hariIni: string) {
  const seninIni = weekStart(hariIni);
  const dari = addDays(seninIni, -7 * MINGGU_ENAM_BULAN);
  const sampai = addDays(seninIni, -1);
  return { dari, sampai };
}

export type Kelengkapan = {
  mingguLengkap: number;
  totalMinggu: number;
  rasio: number;
  mingguBelumLengkap: { dari: string; sampai: string; hariTercatat: number }[];
};

export function kelengkapan(transaksi: Transaksi[], kategori: Kategori[], hariIni: string, hariLibur: string[] = []): Kelengkapan {
  const { dari, sampai } = mingguEnamBulan(hariIni);
  const minggu = rekapMingguan(transaksi, kategori, dari, sampai, hariLibur);
  const lengkap = minggu.filter((m) => m.lengkap);
  const pertama = transaksi.length ? transaksiPertama(transaksi) : null;
  return {
    mingguLengkap: lengkap.length,
    totalMinggu: MINGGU_ENAM_BULAN,
    rasio: lengkap.length / MINGGU_ENAM_BULAN,
    mingguBelumLengkap: minggu
      .filter((m) => !m.lengkap && pertama !== null && m.sampai >= pertama)
      .map((m) => ({ dari: m.dari, sampai: m.sampai, hariTercatat: m.hariTercatat })),
  };
}

/** Kuartil dengan interpolasi linear (metode yang sama dengan Excel QUARTILE.INC). */
export function kuartil(nilai: number[], q: number): number {
  if (!nilai.length) return 0;
  const urut = [...nilai].sort((a, b) => a - b);
  const posisi = (urut.length - 1) * q;
  const bawah = Math.floor(posisi);
  const atas = Math.ceil(posisi);
  return urut[bawah] + (urut[atas] - urut[bawah]) * (posisi - bawah);
}

export type StressOut = {
  cukupData: boolean;
  mingguValid: number;
  dibutuhkan: number;
  terendah: { nilai: number; dari: string; sampai: string } | null;
  kuartilBawah: number;
  rataRata: number;
  seri: { dari: string; laba: number; valid: boolean }[];
};

export function stressOut(transaksi: Transaksi[], kategori: Kategori[], hariIni: string, hariLibur: string[] = []): StressOut {
  const { dari, sampai } = mingguEnamBulan(hariIni);
  const minggu = rekapMingguan(transaksi, kategori, dari, sampai, hariLibur);
  const valid = minggu.filter((m) => m.lengkap);
  const laba = valid.map((m) => m.laba);
  const min = valid.reduce<BarisRekap | null>((a, m) => (!a || m.laba < a.laba ? m : a), null);
  return {
    // Cukup data = catatan sudah dimulai sejak awal jendela 26 minggu.
    cukupData: transaksi.length > 0 && daysBetween(dari, transaksiPertama(transaksi)) <= 6,
    mingguValid: valid.length,
    dibutuhkan: MINGGU_ENAM_BULAN,
    terendah: min ? { nilai: min.laba, dari: min.dari, sampai: min.sampai } : null,
    kuartilBawah: kuartil(laba, 0.25),
    rataRata: laba.length ? laba.reduce((a, b) => a + b, 0) / laba.length : 0,
    seri: minggu.map((m) => ({ dari: m.dari, laba: m.laba, valid: m.lengkap })),
  };
}

// ---------------------------------------------------------------------------
// Uang keluar per kategori (donat)
// ---------------------------------------------------------------------------

export function keluarPerKategori(transaksi: Transaksi[], kategori: Kategori[]) {
  const peta = kategoriMap(kategori);
  const total = new Map<string, number>();
  for (const t of transaksi) if (t.arah === "keluar") total.set(t.kategoriId, (total.get(t.kategoriId) ?? 0) + t.nominal);
  return [...total.entries()]
    .map(([id, nominal]) => ({ id, nama: peta[id]?.nama ?? id, kelompok: peta[id]?.kelompok, nominal }))
    .sort((a, b) => b.nominal - a.nominal);
}
