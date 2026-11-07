// Utilitas format angka & tanggal (Bahasa Indonesia).
// Semua tanggal disimpan sebagai string ISO "YYYY-MM-DD" (tanpa jam) agar bebas zona waktu.

export const rupiah = (value: number) =>
  `${value < 0 ? "−" : ""}Rp${Math.abs(Math.round(value)).toLocaleString("id-ID")}`;

/** Rp20,9 jt — untuk kartu & sumbu grafik. */
export function rupiahRingkas(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (abs >= 1_000_000_000) return `${sign}Rp${(abs / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  if (abs >= 1_000_000) return `${sign}Rp${(abs / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  if (abs >= 1_000) return `${sign}Rp${Math.round(abs / 1_000).toLocaleString("id-ID")} rb`;
  return `${sign}Rp${Math.round(abs)}`;
}

export const persen = (ratio: number, digits = 0) =>
  `${(ratio * 100).toLocaleString("id-ID", { maximumFractionDigits: digits, minimumFractionDigits: digits })}%`;

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const BULAN_PANJANG = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

function parts(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

export function toDate(iso: string): Date {
  const { y, m, d } = parts(iso);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const date = toDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toIso(date);
}

export function daysBetween(fromIso: string, toIsoStr: string): number {
  return Math.round((toDate(toIsoStr).getTime() - toDate(fromIso).getTime()) / 86_400_000);
}

/** Senin dari minggu yang memuat tanggal tsb. */
export function weekStart(iso: string): string {
  const day = toDate(iso).getUTCDay(); // 0 = Minggu
  return addDays(iso, day === 0 ? -6 : 1 - day);
}

export const monthKey = (iso: string) => iso.slice(0, 7);

/** 6 Nov 2026 */
export function tanggal(iso: string): string {
  const { y, m, d } = parts(iso);
  return `${d} ${BULAN[m - 1]} ${y}`;
}

/** 6 Nov */
export function tanggalPendek(iso: string): string {
  const { m, d } = parts(iso);
  return `${d} ${BULAN[m - 1]}`;
}

/** Jumat, 6 November 2026 */
export function tanggalPanjang(iso: string): string {
  const { y, m, d } = parts(iso);
  return `${HARI[toDate(iso).getUTCDay()]}, ${d} ${BULAN_PANJANG[m - 1]} ${y}`;
}

/** 8–14 Jun 2026 atau 29 Jun–5 Jul 2026 */
export function rentang(fromIso: string, toIsoStr: string): string {
  const a = parts(fromIso);
  const b = parts(toIsoStr);
  if (fromIso === toIsoStr) return tanggal(fromIso);
  if (a.y === b.y && a.m === b.m) return `${a.d}–${b.d} ${BULAN[b.m - 1]} ${b.y}`;
  if (a.y === b.y) return `${a.d} ${BULAN[a.m - 1]}–${b.d} ${BULAN[b.m - 1]} ${b.y}`;
  return `${tanggal(fromIso)}–${tanggal(toIsoStr)}`;
}

/** "Mei 2026" */
export function namaBulan(monthKeyStr: string, panjang = false): string {
  const [y, m] = monthKeyStr.split("-").map(Number);
  return `${(panjang ? BULAN_PANJANG : BULAN)[m - 1]} ${y}`;
}

export const namaBulanSaja = (monthKeyStr: string) => BULAN[Number(monthKeyStr.slice(5, 7)) - 1];
