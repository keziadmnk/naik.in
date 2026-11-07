import type { Arah, Kategori, Metode, Transaksi } from "../data/types";
import { addDays, daysBetween, rentang, tanggal } from "./format";

export type BarisDraf = {
  key: string;
  baris: number | null;
  tanggal: string;
  tanggalAsli: string;
  uraian: string;
  arah: Arah;
  kategoriId: string;
  metode: Metode;
  nominal: number;
  disertakan: boolean;
  ragu?: boolean;
  catatanAi?: string;
  isianRagu?: Partial<Record<KolomDraf, { pesan: string; saran?: string }>>;
};

export type KolomDraf = "tanggal" | "uraian" | "nominal" | "arah" | "kategoriId";

export type Masalah = { tingkat: "galat" | "peringatan"; pesan: string };

let urut = 0;
export const kunciBaru = () => `d-${Date.now().toString(36)}-${(urut += 1)}`;

export function barisKosong(hariIni: string, sebelumnya?: Partial<BarisDraf>): BarisDraf {
  return {
    key: kunciBaru(),
    baris: null,
    tanggal: hariIni,
    tanggalAsli: hariIni,
    uraian: "",
    arah: "keluar",
    kategoriId: "bahan-baku",
    metode: "Tunai",
    nominal: 0,
    disertakan: true,
    ...sebelumnya,
  };
}


const NAMA_BULAN: Record<string, number> = {
  jan: 1, januari: 1, feb: 2, februari: 2, mar: 3, maret: 3, apr: 4, april: 4, mei: 5, may: 5,
  jun: 6, juni: 6, jul: 7, juli: 7, agu: 8, agt: 8, agustus: 8, aug: 8, sep: 9, september: 9,
  okt: 10, oktober: 10, oct: 10, nov: 11, november: 11, des: 12, desember: 12, dec: 12,
};

function valid(y: number, m: number, d: number): string {
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return "";
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCMonth() !== m - 1) return "";
  return date.toISOString().slice(0, 10);
}

export function parseTanggal(input: unknown): string {
  if (input instanceof Date && !Number.isNaN(input.getTime())) return valid(input.getFullYear(), input.getMonth() + 1, input.getDate());
  if (typeof input === "number" && input > 20000 && input < 80000) {
    return addDays("1899-12-30", Math.floor(input));
  }
  const s = String(input ?? "").trim().toLowerCase();
  if (!s) return "";
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return valid(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (m) return valid(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2], +m[1]);
  m = s.match(/^(\d{1,2})\s+([a-z]+)\.?\s+(\d{4})$/);
  if (m && NAMA_BULAN[m[2]]) return valid(+m[3], NAMA_BULAN[m[2]], +m[1]);
  return "";
}

export function parseNominal(input: unknown): number {
  if (typeof input === "number") return Math.abs(Math.round(input));
  const s = String(input ?? "").replace(/rp|idr|\s/gi, "");
  if (!s) return 0;
  const tanpaDesimal = s.replace(/[.,]\d{2}$/, (x) => (/[.,]\d{3}/.test(s) ? "" : x));
  const angka = Number(tanpaDesimal.replace(/[^\d-]/g, ""));
  return Number.isFinite(angka) ? Math.abs(Math.round(angka)) : 0;
}


const KOLOM = {
  tanggal: ["tanggal", "tgl", "date", "waktu"],
  uraian: ["uraian", "keterangan", "deskripsi", "description", "catatan", "nama"],
  masuk: ["masuk", "pemasukan", "debit", "kredit masuk", "uang masuk"],
  keluar: ["keluar", "pengeluaran", "uang keluar"],
  nominal: ["nominal", "jumlah", "amount", "total"],
  jenis: ["jenis", "tipe", "arah", "type"],
  kategori: ["kategori", "category"],
  metode: ["metode", "pembayaran", "method", "via"],
};

function cariKolom(header: string[], kandidat: string[]) {
  return header.findIndex((h) => kandidat.some((k) => h.trim().toLowerCase().includes(k)));
}

export function tebakKategori(uraian: string, arah: Arah, kategori: Kategori[]): string {
  const t = uraian.toLowerCase();
  const ada = (id: string) => kategori.some((k) => k.id === id);
  if (arah === "masuk") return /transfer dari|pinjam|modal/.test(t) && ada("pemasukan-lain") ? "pemasukan-lain" : "penjualan";
  const aturan: [RegExp, string][] = [
    [/kemasan|plastik|pouch|stiker|label/, "kemasan"],
    [/gas|lpg|listrik|pln|air|pdam/, "gas-listrik"],
    [/sewa/, "sewa"],
    [/upah|gaji|bantu/, "gaji"],
    [/ongkir|kirim|jne|j&t|gojek|grab|bensin/, "ongkir"],
    [/kompor|wajan|alat|mesin|blender/, "peralatan"],
    [/pulsa|admin|biaya/, "admin"],
  ];
  return aturan.find(([re, id]) => re.test(t) && ada(id))?.[1] ?? "bahan-baku";
}

function tebakMetode(nilai: string, uraian: string): Metode {
  const t = `${nilai} ${uraian}`.toLowerCase();
  if (t.includes("qris")) return "QRIS";
  if (/shopee|tokopedia|marketplace|tiktok/.test(t)) return "Marketplace";
  if (/transfer|tf|bank|bca|bri|bni|mandiri/.test(t)) return "Transfer";
  return "Tunai";
}

export function barisDariTabel(tabel: unknown[][], kategori: Kategori[]): BarisDraf[] {
  if (tabel.length < 2) return [];
  const header = tabel[0].map((h) => String(h ?? ""));
  const i = Object.fromEntries(Object.entries(KOLOM).map(([k, v]) => [k, cariKolom(header, v)])) as Record<keyof typeof KOLOM, number>;
  return tabel.slice(1).flatMap((sel, index) => {
    if (sel.every((v) => String(v ?? "").trim() === "")) return [];
    const ambil = (k: keyof typeof KOLOM) => (i[k] >= 0 ? sel[i[k]] : undefined);
    const uraian = String(ambil("uraian") ?? "").trim();
    const masuk = parseNominal(ambil("masuk"));
    const keluar = parseNominal(ambil("keluar"));
    let nominal = masuk || keluar || parseNominal(ambil("nominal"));
    let arah: Arah = masuk ? "masuk" : keluar ? "keluar" : "keluar";
    const jenis = String(ambil("jenis") ?? "").toLowerCase();
    if (!masuk && !keluar) {
      if (/masuk|pemasukan|in|kredit/.test(jenis)) arah = "masuk";
      const mentah = String(ambil("nominal") ?? "");
      if (mentah.trim().startsWith("-")) arah = "keluar";
    }
    nominal = Math.abs(nominal);
    const kategoriTeks = String(ambil("kategori") ?? "").toLowerCase();
    const kategoriCocok = kategori.find((k) => kategoriTeks && k.nama.toLowerCase().includes(kategoriTeks) && k.arah === arah);
    const tanggalMentah = ambil("tanggal");
    return [{
      key: kunciBaru(),
      baris: index + 2,
      tanggal: parseTanggal(tanggalMentah),
      tanggalAsli: tanggalMentah instanceof Date ? tanggalMentah.toISOString().slice(0, 10) : String(tanggalMentah ?? ""),
      uraian,
      arah,
      kategoriId: kategoriCocok?.id ?? tebakKategori(uraian, arah, kategori),
      metode: tebakMetode(String(ambil("metode") ?? ""), uraian),
      nominal,
      disertakan: true,
    }];
  });
}

export function parseCsv(teks: string): string[][] {
  const barisPertama = teks.split(/\r?\n/)[0] ?? "";
  const pemisah = (barisPertama.match(/;/g)?.length ?? 0) > (barisPertama.match(/,/g)?.length ?? 0) ? ";" : ",";
  const hasil: string[][] = [];
  let baris: string[] = [];
  let sel = "";
  let kutip = false;
  for (let i = 0; i < teks.length; i += 1) {
    const c = teks[i];
    if (kutip) {
      if (c === '"' && teks[i + 1] === '"') { sel += '"'; i += 1; }
      else if (c === '"') kutip = false;
      else sel += c;
    } else if (c === '"') kutip = true;
    else if (c === pemisah) { baris.push(sel); sel = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && teks[i + 1] === "\n") i += 1;
      baris.push(sel); hasil.push(baris); baris = []; sel = "";
    } else sel += c;
  }
  if (sel || baris.length) { baris.push(sel); hasil.push(baris); }
  return hasil;
}


export type HasilValidasi = {
  masalah: Record<string, Masalah[]>;
  rentangFile: { dari: string; sampai: string; label: string } | null;
  jumlahGalat: number;
  jumlahPeringatan: number;
};

const kunciDup = (t: { tanggal: string; uraian: string; nominal: number; arah: Arah }) =>
  `${t.tanggal}|${t.uraian.trim().toLowerCase()}|${t.nominal}|${t.arah}`;

export function validasiDraf(draf: BarisDraf[], riwayat: Transaksi[], hariIni: string): HasilValidasi {
  const masalah: Record<string, Masalah[]> = {};
  const tambah = (key: string, m: Masalah) => (masalah[key] = [...(masalah[key] ?? []), m]);

  const tanggalValid = draf.map((d) => d.tanggal).filter(Boolean).sort();
  let rentangFile: HasilValidasi["rentangFile"] = null;
  let median = "";
  if (tanggalValid.length) {
    median = tanggalValid[Math.floor(tanggalValid.length / 2)];
    const dalam = tanggalValid.filter((t) => Math.abs(daysBetween(median, t)) <= 45);
    rentangFile = { dari: dalam[0], sampai: dalam[dalam.length - 1], label: rentang(dalam[0], dalam[dalam.length - 1]) };
  }

  const diRiwayat = new Set(riwayat.map(kunciDup));
  const diFile = new Map<string, number>();
  for (const d of draf) if (d.disertakan && d.tanggal) diFile.set(kunciDup(d), (diFile.get(kunciDup(d)) ?? 0) + 1);

  for (const d of draf) {
    if (!d.disertakan) continue;
    if (!d.tanggal) tambah(d.key, { tingkat: "galat", pesan: d.tanggalAsli ? `Tanggal "${d.tanggalAsli}" tidak terbaca` : "Tanggal kosong" });
    else if (d.tanggal > hariIni) tambah(d.key, { tingkat: "galat", pesan: `Tanggal ${tanggal(d.tanggal)} ada di masa depan` });
    else if (median && Math.abs(daysBetween(median, d.tanggal)) > 45)
      tambah(d.key, { tingkat: "peringatan", pesan: `Di luar rentang file (${rentangFile?.label})` });
    if (!d.uraian.trim()) tambah(d.key, { tingkat: "galat", pesan: "Uraian kosong" });
    if (!d.nominal || d.nominal <= 0) tambah(d.key, { tingkat: "galat", pesan: "Nominal kosong atau tidak terbaca" });
    if (d.tanggal && diRiwayat.has(kunciDup(d))) tambah(d.key, { tingkat: "peringatan", pesan: "Sudah ada di riwayat (kemungkinan duplikat)" });
    else if (d.tanggal && (diFile.get(kunciDup(d)) ?? 0) > 1) tambah(d.key, { tingkat: "peringatan", pesan: "Muncul lebih dari sekali di file ini" });
  }

  const semua = Object.values(masalah).flat();
  return {
    masalah,
    rentangFile,
    jumlahGalat: semua.filter((m) => m.tingkat === "galat").length,
    jumlahPeringatan: semua.filter((m) => m.tingkat === "peringatan").length,
  };
}
