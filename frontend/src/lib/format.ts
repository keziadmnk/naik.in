export const rupiah = (value: number) =>
  `${value < 0 ? "−" : ""}Rp${Math.abs(Math.round(value)).toLocaleString("id-ID")}`;

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

export function weekStart(iso: string): string {
  const day = toDate(iso).getUTCDay();
  return addDays(iso, day === 0 ? -6 : 1 - day);
}

export const monthKey = (iso: string) => iso.slice(0, 7);

export function tanggal(iso: string): string {
  const { y, m, d } = parts(iso);
  return `${d} ${BULAN[m - 1]} ${y}`;
}

export function tanggalPendek(iso: string): string {
  const { m, d } = parts(iso);
  return `${d} ${BULAN[m - 1]}`;
}

export function tanggalPanjang(iso: string): string {
  const { y, m, d } = parts(iso);
  return `${HARI[toDate(iso).getUTCDay()]}, ${d} ${BULAN_PANJANG[m - 1]} ${y}`;
}

export function rentang(fromIso: string, toIsoStr: string): string {
  const a = parts(fromIso);
  const b = parts(toIsoStr);
  if (fromIso === toIsoStr) return tanggal(fromIso);
  if (a.y === b.y && a.m === b.m) return `${a.d}–${b.d} ${BULAN[b.m - 1]} ${b.y}`;
  if (a.y === b.y) return `${a.d} ${BULAN[a.m - 1]}–${b.d} ${BULAN[b.m - 1]} ${b.y}`;
  return `${tanggal(fromIso)}–${tanggal(toIsoStr)}`;
}

export function namaBulan(monthKeyStr: string, panjang = false): string {
  const [y, m] = monthKeyStr.split("-").map(Number);
  return `${(panjang ? BULAN_PANJANG : BULAN)[m - 1]} ${y}`;
}

export const namaBulanSaja = (monthKeyStr: string) => BULAN[Number(monthKeyStr.slice(5, 7)) - 1];
