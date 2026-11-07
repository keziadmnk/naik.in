// Risiko kredit macet (NPL) indikatif — simulasi Monte Carlo dengan block bootstrap.
//
// Satu bulan simulasi = jumlah dua blok acak; tiap blok = laba dua minggu berurutan
// dari 26 minggu usaha. Seed tetap → hasil selalu sama. Angka acak yang sama dipakai
// untuk semua plafon (common random numbers), sehingga risiko naik monoton seiring beban.

import {
  BLOK_PER_BULAN, BULAN_SULIT_BERUNTUN_NPL, HORIZON_NPL_MAKS, HORIZON_PROYEKSI, JUMLAH_SIMULASI, SEED_SIMULASI,
} from "../../config/thresholds";

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type JalurSimulasi = {
  jumlah: number;
  bulan: number;
  /** laba bulanan simulasi, baris = jalur, kolom = bulan ke-i */
  laba: Float64Array;
};

/** Buat jalur laba bulanan simulasi (sekali per dataset; tidak bergantung pada plafon). */
export function buatJalur(blok: number[], jumlah = JUMLAH_SIMULASI, bulan = Math.max(HORIZON_NPL_MAKS, HORIZON_PROYEKSI), seed = SEED_SIMULASI): JalurSimulasi {
  const laba = new Float64Array(jumlah * bulan);
  if (!blok.length) return { jumlah, bulan, laba };
  const acak = mulberry32(seed);
  for (let i = 0; i < laba.length; i += 1) {
    let total = 0;
    for (let b = 0; b < BLOK_PER_BULAN; b += 1) total += blok[Math.floor(acak() * blok.length)];
    laba[i] = total;
  }
  return { jumlah, bulan, laba };
}

export type HasilRisiko = {
  /** Persentase bulan simulasi yang sisa kasnya negatif. */
  peluangBulanSulit: number;
  /** Peluang ≥3 bulan sulit bayar berturut-turut dalam min(tenor, 12) bulan. */
  npl: number;
  horizon: number;
};

export function risikoNpl(jalur: JalurSimulasi, kebutuhanRT: number, beban: number, tenor: number): HasilRisiko {
  const horizon = Math.min(tenor, HORIZON_NPL_MAKS, jalur.bulan);
  let bulanSulit = 0;
  let macet = 0;
  for (let j = 0; j < jalur.jumlah; j += 1) {
    let beruntun = 0;
    let kena = false;
    for (let m = 0; m < horizon; m += 1) {
      const sulit = jalur.laba[j * jalur.bulan + m] - kebutuhanRT - beban < 0;
      if (sulit) {
        bulanSulit += 1;
        beruntun += 1;
        if (beruntun >= BULAN_SULIT_BERUNTUN_NPL) kena = true;
      } else beruntun = 0;
    }
    if (kena) macet += 1;
  }
  return { peluangBulanSulit: bulanSulit / (jalur.jumlah * horizon), npl: macet / jalur.jumlah, horizon };
}

/** Proyeksi saldo kas bebas kumulatif 12 bulan: median dan pita persentil 10–90. */
export function proyeksiKipas(jalur: JalurSimulasi, kebutuhanRT: number, beban: number, bulan = HORIZON_PROYEKSI) {
  const n = Math.min(bulan, jalur.bulan);
  const saldo = new Float64Array(jalur.jumlah);
  const hasil: { bulan: number; p10: number; p50: number; p90: number }[] = [];
  const kolom = new Float64Array(jalur.jumlah);
  for (let m = 0; m < n; m += 1) {
    for (let j = 0; j < jalur.jumlah; j += 1) {
      saldo[j] += jalur.laba[j * jalur.bulan + m] - kebutuhanRT - beban;
      kolom[j] = saldo[j];
    }
    const urut = Array.from(kolom).sort((a, b) => a - b);
    const ambil = (p: number) => urut[Math.min(urut.length - 1, Math.round(p * (urut.length - 1)))];
    hasil.push({ bulan: m + 1, p10: ambil(0.1), p50: ambil(0.5), p90: ambil(0.9) });
  }
  return hasil;
}
