// Ringkasan analisis keuangan. Angka dihitung sistem; AI (jika ada) hanya menjelaskan.

import type { Kategori, Temuan, Transaksi } from "../data/types";
import { dalamRentang, perubahan, rentangPeriode, ringkas, stressOut } from "./finance";
import { persen, rentang, rupiah, rupiahRingkas } from "./format";

export type AngkaRingkasan = {
  laba30Hari: number;
  labaSebelumnya: number;
  penjualan30Hari: number;
  rasioHpp: number;
  pribadi30Hari: number;
  kemungkinanPribadi: number;
  labaMingguTerendah: number;
  kuartilBawah: number;
  jumlahTransaksi: number;
};

export function hitungAngka(transaksi: Transaksi[], kategori: Kategori[], temuan: Temuan[], perluDicek: Set<string>, hariIni: string, hariLibur: string[]) {
  const terkonfirmasi = transaksi.filter((t) => !perluDicek.has(t.id));
  const r = rentangPeriode("30h", hariIni);
  const isi = dalamRentang(terkonfirmasi, r.dari, r.sampai);
  const kini = ringkas(isi, kategori);
  const lalu = ringkas(dalamRentang(terkonfirmasi, r.sebelumDari, r.sebelumSampai), kategori);
  const s = stressOut(transaksi, kategori, hariIni, hariLibur);
  const angka: AngkaRingkasan = {
    laba30Hari: kini.laba,
    labaSebelumnya: lalu.laba,
    penjualan30Hari: kini.penjualan,
    rasioHpp: kini.penjualan ? kini.hpp / kini.penjualan : 0,
    pribadi30Hari: kini.pribadi,
    kemungkinanPribadi: temuan.filter((t) => t.jenis === "kemungkinan_pribadi").length,
    labaMingguTerendah: s.terendah?.nilai ?? 0,
    kuartilBawah: s.kuartilBawah,
    jumlahTransaksi: isi.length,
  };
  return { angka, stress: s, rentang: r };
}

export function poinTemplat(data: ReturnType<typeof hitungAngka>): string[] {
  const { angka: a, stress: s } = data;
  if (!a.jumlahTransaksi) return ["Belum ada transaksi terkonfirmasi dalam 30 hari terakhir. Catat transaksi agar ringkasan bisa dibuat."];
  const poin: string[] = [];
  const d = perubahan(a.laba30Hari, a.labaSebelumnya);
  poin.push(
    `Laba usaha 30 hari terakhir ${rupiahRingkas(a.laba30Hari)}` +
      (d === null ? "." : `, ${d >= 0 ? "naik" : "turun"} ${persen(Math.abs(d))} dibanding 30 hari sebelumnya.`),
  );
  poin.push(
    `Rasio HPP ${persen(a.rasioHpp)}: dari setiap Rp100 penjualan, sekitar Rp${Math.round(a.rasioHpp * 100)} habis untuk bahan & kemasan` +
      (a.rasioHpp > 0.6 ? " — cukup tinggi, cek harga bahan atau harga jual." : "."),
  );
  poin.push(
    a.kemungkinanPribadi > 0
      ? `Ada ${a.kemungkinanPribadi} pengeluaran yang tampaknya pribadi tapi tercatat sebagai biaya usaha. Pengeluaran pribadi yang sudah dipisah dalam 30 hari terakhir sebesar ${rupiahRingkas(a.pribadi30Hari)}.`
      : `Pengeluaran pribadi tercatat terpisah: ${rupiahRingkas(a.pribadi30Hari)} dalam 30 hari terakhir.`,
  );
  if (s.cukupData && s.terendah)
    poin.push(`Minggu tersepi (${rentang(s.terendah.dari, s.terendah.sampai)}) labanya hanya ${rupiah(s.terendah.nilai)}; seperempat minggu labanya di bawah ${rupiah(s.kuartilBawah)}.`);
  else poin.push(`Minggu sepi belum bisa dinilai: baru ${s.mingguValid} dari ${s.dibutuhkan} minggu lengkap tercatat.`);
  poin.push(
    a.kemungkinanPribadi > 0
      ? "Saran: pisahkan belanja rumah tangga dari uang usaha agar laba terlihat apa adanya."
      : s.cukupData
        ? `Saran: jika berencana mencicil, pastikan cicilan per minggu tetap di bawah ${rupiah(s.kuartilBawah)}.`
        : "Saran: catat setiap hari agar data 6 bulan lengkap lebih cepat terkumpul.",
  );
  return poin;
}
