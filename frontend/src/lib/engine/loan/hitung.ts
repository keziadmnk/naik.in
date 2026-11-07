import {
  AMBANG_HIJAU, AMBANG_KUNING, BATAS_KUR_SUPER_MIKRO, BULAN_CADANGAN, BULAN_MENABUNG_CADANGAN,
  BUNGA_KUR_MIKRO, BUNGA_KUR_SUPER_MIKRO, PLAFON_LANGKAH, PLAFON_MAKS, PLAFON_MIN,
  PORSI_BATAS_AMAN_REKOMENDASI, TENOR_PILIHAN, TENOR_REKOMENDASI, type Tenor,
} from "../../config/thresholds";

export type Status = "hijau" | "kuning" | "merah";

export const LABEL_STATUS: Record<Status, string> = {
  hijau: "Siap",
  kuning: "Hati-hati",
  merah: "Belum siap",
};

export type Kapasitas = {
  labaRata: number;
  labaStress: number;
  labaTerburuk: number;
  kebutuhanRT: number;
  cicilanLama: number;
};


export type InfoBunga = { tahunan: number; jenis: "KUR Super Mikro" | "KUR Mikro"; konservatif: boolean };

export function bungaKur(plafon: number, konservatif = false): InfoBunga {
  const superMikro = plafon <= BATAS_KUR_SUPER_MIKRO;
  return {
    tahunan: konservatif || !superMikro ? BUNGA_KUR_MIKRO : BUNGA_KUR_SUPER_MIKRO,
    jenis: superMikro ? "KUR Super Mikro" : "KUR Mikro",
    konservatif,
  };
}

export function faktorAnuitas(bungaTahunan: number, tenor: number): number {
  const r = bungaTahunan / 12;
  return r === 0 ? tenor : (1 - (1 + r) ** -tenor) / r;
}

export function cicilanBulanan(plafon: number, bungaTahunan: number, tenor: number): number {
  return plafon / faktorAnuitas(bungaTahunan, tenor);
}


export function batasCicilan(k: Kapasitas) {
  const aman = Math.max(
    0,
    Math.min(AMBANG_HIJAU * k.labaRata - k.cicilanLama, k.labaRata - k.kebutuhanRT - k.cicilanLama, k.labaStress - k.kebutuhanRT - k.cicilanLama),
  );
  const hatiHati = Math.max(0, Math.min(AMBANG_KUNING * k.labaRata - k.cicilanLama, k.labaRata - k.kebutuhanRT - k.cicilanLama));
  return { aman, hatiHati };
}

export const plafonAman = (batasAman: number, bungaTahunan: number, tenor: number) => batasAman * faktorAnuitas(bungaTahunan, tenor);


export type Cadangan = {
  kekuranganBulanSepi: number;
  target: number;
  setoranBulanan: number;
  realistis: boolean;
};

export type AlasanStatus =
  | "laba_tidak_positif"
  | "rasio_di_atas_40"
  | "sisa_rata_negatif"
  | "rasio_di_atas_30"
  | "sisa_stress_negatif"
  | "cadangan_tidak_realistis";

export type Penilaian = {
  plafon: number;
  tenor: number;
  bunga: InfoBunga;
  cicilanBaru: number;
  beban: number;
  rasioRata: number;
  sisaRata: number;
  sisaStress: number;
  sisaTerburuk: number;
  lolosLapis1: boolean;
  lolosLapis2: boolean;
  status: Status;
  alasan: AlasanStatus[];
  cadangan: Cadangan | null;
};

export function hitungCadangan(sisaStress: number, sisaRata: number): Cadangan {
  const kekuranganBulanSepi = Math.max(0, -sisaStress);
  const target = kekuranganBulanSepi * BULAN_CADANGAN;
  const setoranBulanan = target / BULAN_MENABUNG_CADANGAN;
  return { kekuranganBulanSepi, target, setoranBulanan, realistis: setoranBulanan <= sisaRata };
}

export function nilai(k: Kapasitas, plafon: number, tenor: number, konservatif = false): Penilaian {
  const bunga = bungaKur(plafon, konservatif);
  const cicilanBaru = cicilanBulanan(plafon, bunga.tahunan, tenor);
  const beban = k.cicilanLama + cicilanBaru;
  const rasioRata = k.labaRata > 0 ? beban / k.labaRata : Number.POSITIVE_INFINITY;
  const sisaRata = k.labaRata - k.kebutuhanRT - beban;
  const sisaStress = k.labaStress - k.kebutuhanRT - beban;
  const sisaTerburuk = k.labaTerburuk - k.kebutuhanRT - beban;

  const alasan: AlasanStatus[] = [];
  if (k.labaRata <= 0) alasan.push("laba_tidak_positif");
  if (rasioRata > AMBANG_KUNING) alasan.push("rasio_di_atas_40");
  if (sisaRata < 0) alasan.push("sisa_rata_negatif");

  let status: Status;
  let cadangan: Cadangan | null = null;
  if (alasan.length) status = "merah";
  else if (rasioRata <= AMBANG_HIJAU && sisaStress >= 0) status = "hijau";
  else {
    if (rasioRata > AMBANG_HIJAU) alasan.push("rasio_di_atas_30");
    if (sisaStress < 0) alasan.push("sisa_stress_negatif");
    cadangan = hitungCadangan(sisaStress, sisaRata);
    if (cadangan.realistis) status = "kuning";
    else {
      status = "merah";
      alasan.push("cadangan_tidak_realistis");
    }
  }

  return {
    plafon, tenor, bunga, cicilanBaru, beban, rasioRata, sisaRata, sisaStress, sisaTerburuk,
    lolosLapis1: rasioRata <= AMBANG_HIJAU && sisaRata >= 0,
    lolosLapis2: sisaStress >= 0,
    status, alasan, cadangan,
  };
}


export function daftarPlafon(): number[] {
  const hasil: number[] = [];
  for (let p = PLAFON_MIN; p <= PLAFON_MAKS; p += PLAFON_LANGKAH) hasil.push(p);
  return hasil;
}

export function zonaSlider(k: Kapasitas, tenor: number, konservatif = false) {
  return daftarPlafon().map((plafon) => ({ plafon, status: nilai(k, plafon, tenor, konservatif).status }));
}

export type Rekomendasi = {
  plafon: number;
  tenor: Tenor;
  adaHijau: boolean;
  penilaian: Penilaian;
  batasAman: number;
  targetCicilan: number;
};

export function rekomendasi(k: Kapasitas, konservatif = false): Rekomendasi {
  const tenor = TENOR_REKOMENDASI;
  const { aman } = batasCicilan(k);
  const targetCicilan = PORSI_BATAS_AMAN_REKOMENDASI * aman;
  const plafon = [...daftarPlafon()].reverse().find((p) => {
    const n = nilai(k, p, tenor, konservatif);
    return n.cicilanBaru <= targetCicilan && n.status === "hijau";
  });
  const dipilih = plafon ?? PLAFON_MIN;
  return { plafon: dipilih, tenor, adaHijau: plafon !== undefined, penilaian: nilai(k, dipilih, tenor, konservatif), batasAman: aman, targetCicilan };
}

export function plafonHijauTerbesar(k: Kapasitas, tenor: number, konservatif = false): number | null {
  return [...daftarPlafon()].reverse().find((p) => nilai(k, p, tenor, konservatif).status === "hijau") ?? null;
}

export function tenorHijauTerdekat(k: Kapasitas, plafon: number, tenorSekarang: number, konservatif = false): number | null {
  return TENOR_PILIHAN.find((t) => t > tenorSekarang && nilai(k, plafon, t, konservatif).status === "hijau") ?? null;
}
