// Menyiapkan data 26 minggu dari transaksi untuk Simulasi Kesiapan KUR.

import { kategoriMap } from "../../../data/categories";
import type { Kategori, Transaksi } from "../../../data/types";
import {
  MIN_HARI_MINGGU_VALID, MIN_MINGGU_VALID_KUR, MINGGU_JENDELA, MINGGU_PER_BULAN, MINGGU_PER_BLOK, PERSENTIL_STRESS,
} from "../../config/thresholds";
import { addDays, monthKey, weekStart } from "../../format";

export type MingguPinjaman = {
  dari: string;
  sampai: string;
  omzet: number;
  hpp: number;
  opexVariabel: number;
  opexTetap: number;
  pribadi: number;
  hariTercatat: number;
  valid: boolean;
  /** Laba_minggu = Omzet − HPP − Opex_variabel − Opex_tetap_rata_mingguan */
  laba: number;
};

export type DataPinjaman = {
  jendela: { dari: string; sampai: string };
  minggu: MingguPinjaman[];
  mingguValid: number;
  /** Catatan sudah dimulai sejak awal jendela (data mencakup seluruh jendela). */
  cakupPenuh: boolean;
  terbuka: boolean;
  /** Perkiraan bulan data yang tersedia di dalam jendela (untuk layar terkunci). */
  bulanTerdata: number;
  opexTetapRataMingguan: number;
  labaMingguValid: number[];
  labaRata: number;
  labaStress: number;
  labaTerburuk: number;
  mingguTerburuk: MingguPinjaman | null;
  /** Rata-rata pengeluaran pribadi per bulan (4 minggu) dalam jendela. */
  pribadiRataBulanan: number;
  /** Blok dua minggu berurutan (keduanya valid) untuk block bootstrap. */
  blok: number[];
};

/** Kuartil dengan interpolasi linear (persentil 25 = QUARTILE.INC). */
export function persentil(nilai: number[], p: number): number {
  if (!nilai.length) return 0;
  const urut = [...nilai].sort((a, b) => a - b);
  const pos = (urut.length - 1) * p;
  const bawah = Math.floor(pos);
  const atas = Math.ceil(pos);
  return urut[bawah] + (urut[atas] - urut[bawah]) * (pos - bawah);
}

export function jendelaAnalisis(hariIni: string) {
  const seninIni = weekStart(hariIni);
  return { dari: addDays(seninIni, -7 * MINGGU_JENDELA), sampai: addDays(seninIni, -1) };
}

export function siapkanData(transaksi: Transaksi[], kategori: Kategori[], hariIni: string, hariLibur: string[] = []): DataPinjaman {
  const peta = kategoriMap(kategori);
  const jendela = jendelaAnalisis(hariIni);
  const tercatat = new Set([...transaksi.map((t) => t.tanggal), ...hariLibur]);

  const kosong = Array.from({ length: MINGGU_JENDELA }, (_, i) => {
    const dari = addDays(jendela.dari, i * 7);
    let hari = 0;
    for (let d = 0; d < 7; d += 1) if (tercatat.has(addDays(dari, d))) hari += 1;
    return { dari, sampai: addDays(dari, 6), omzet: 0, hpp: 0, opexVariabel: 0, opexTetap: 0, pribadi: 0, hariTercatat: hari, valid: hari >= MIN_HARI_MINGGU_VALID, laba: 0 };
  });

  for (const t of transaksi) {
    if (t.tanggal < jendela.dari || t.tanggal > jendela.sampai) continue;
    const m = kosong[Math.floor((Date.parse(t.tanggal) - Date.parse(jendela.dari)) / (7 * 86_400_000))];
    const k = peta[t.kategoriId];
    if (t.arah === "masuk") {
      if (k?.kelompok === "penjualan") m.omzet += t.nominal;
    } else if (k?.kelompok === "hpp") m.hpp += t.nominal;
    else if (k?.kelompok === "pribadi") m.pribadi += t.nominal;
    else if (k?.tetap) m.opexTetap += t.nominal;
    else m.opexVariabel += t.nominal;
  }

  const opexTetapRataMingguan = kosong.reduce((a, m) => a + m.opexTetap, 0) / MINGGU_JENDELA;
  const minggu = kosong.map((m) => ({ ...m, laba: m.omzet - m.hpp - m.opexVariabel - opexTetapRataMingguan }));
  const valid = minggu.filter((m) => m.valid);
  const labaMingguValid = valid.map((m) => m.laba);
  const mingguTerburuk = valid.reduce<MingguPinjaman | null>((a, m) => (!a || m.laba < a.laba ? m : a), null);

  const pertama = transaksi.reduce<string | null>((a, t) => (!a || t.tanggal < a ? t.tanggal : a), null);
  const cakupPenuh = pertama !== null && pertama <= addDays(jendela.dari, 6);
  const mingguTerdata = pertama ? minggu.filter((m) => m.sampai >= pertama).length : 0;

  const blok: number[] = [];
  for (let i = 0; i + MINGGU_PER_BLOK <= minggu.length; i += 1) {
    const bagian = minggu.slice(i, i + MINGGU_PER_BLOK);
    if (bagian.every((m) => m.valid)) blok.push(bagian.reduce((a, m) => a + m.laba, 0));
  }

  const rata = labaMingguValid.length ? labaMingguValid.reduce((a, b) => a + b, 0) / labaMingguValid.length : 0;
  return {
    jendela,
    minggu,
    mingguValid: valid.length,
    cakupPenuh,
    terbuka: cakupPenuh && valid.length >= MIN_MINGGU_VALID_KUR,
    bulanTerdata: Math.min(6, Math.round((mingguTerdata / MINGGU_JENDELA) * 6)),
    opexTetapRataMingguan,
    labaMingguValid,
    labaRata: rata * MINGGU_PER_BULAN,
    labaStress: persentil(labaMingguValid, PERSENTIL_STRESS) * MINGGU_PER_BULAN,
    labaTerburuk: (mingguTerburuk?.laba ?? 0) * MINGGU_PER_BULAN,
    mingguTerburuk,
    pribadiRataBulanan: (minggu.reduce((a, m) => a + m.pribadi, 0) / MINGGU_JENDELA) * MINGGU_PER_BULAN,
    blok,
  };
}

/** Bulan kalender dalam jendela yang punya minggu belum valid — untuk layar terkunci. */
export function bulanBelumLengkap(data: DataPinjaman): { bulan: string; mingguBelumValid: number }[] {
  const per = new Map<string, number>();
  for (const m of data.minggu) if (!m.valid) per.set(monthKey(m.dari), (per.get(monthKey(m.dari)) ?? 0) + 1);
  return [...per.entries()].map(([bulan, mingguBelumValid]) => ({ bulan, mingguBelumValid }));
}
