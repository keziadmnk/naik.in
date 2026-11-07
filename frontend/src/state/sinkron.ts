// Menerjemahkan aksi store menjadi panggilan API backend (mode server).
// Store tetap memperbarui tampilan seketika; fungsi di sini menyimpan perubahan ke database.

import { panggil, type HasilPanggil } from "../api";
import { cariKlaim, hitungSkor } from "../lib/engine/label";
import type { Aksi, Keadaan } from "./store";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Mengembalikan fungsi pemanggil API untuk aksi ini, atau null bila aksi hanya lokal. */
export function keApi(a: Aksi, s: Keadaan): (() => Promise<HasilPanggil>) | null {
  switch (a.type) {
    case "simpanTransaksi":
      return () =>
        panggil("POST", "/api/transactions", {
          sumber: a.transaksi[0]?.sumber === "contoh" ? "manual" : a.transaksi[0]?.sumber,
          namaFile: a.namaFile,
          transaksi: a.transaksi.map(({ id, tanggal, uraian, arah, kategoriId, metode, nominal }) => ({ id, tanggal, uraian, arah, kategoriId, metode, nominal })),
        });
    case "ubahTransaksi": {
      const { tanggal, uraian, kategoriId, metode, nominal } = a.perubahan;
      return () => panggil("PATCH", `/api/transactions/${a.id}`, { tanggal, uraian, kategoriId, metode, nominal });
    }
    case "hapusTransaksi":
      return () => panggil("DELETE", `/api/transactions/${a.id}`);
    case "tindakTemuan":
    case "tandaiLibur": {
      const t = a.temuan;
      if (!t) return null;
      return () =>
        panggil("POST", "/api/findings", {
          kunci: t.id,
          jenis: t.jenis,
          alasan: t.alasan,
          transaksiIds: t.transaksiIds.filter((id) => UUID.test(id)),
          rentang: t.rentang,
          status: a.type === "tindakTemuan" && a.tindakan === "abaikan" ? "diabaikan" : "ditindak",
          tindakan: a.type === "tandaiLibur" ? "tandai_libur" : (a.tindakan ?? "ditindak"),
          hariLibur: a.type === "tandaiLibur" ? a.tanggal : undefined,
        });
    }
    case "profil":
      return () => panggil("PUT", "/api/profile", a.profil);
    case "tambahKategori":
      return () => panggil("POST", "/api/categories", a.kategori);
    case "hapusKategori":
      return () => panggil("DELETE", `/api/categories?kode=${encodeURIComponent(a.id)}`);
    case "biayaRutin":
      return () => panggil("PUT", "/api/settings", { biayaRutin: a.biayaRutin.map(({ nama, jenis, nominalBulanan }) => ({ nama, jenis, nominalBulanan })) });
    case "pengingat":
      return () => panggil("PUT", "/api/settings", { pengingat: a.pengingat });
    case "demo":
      return () => panggil("PUT", "/api/settings", { demo: a.demo });
    case "kur":
      return () => panggil("PUT", "/api/settings", { kur: a.kur });
    case "turSelesai":
      return () => panggil("PUT", "/api/settings", { turSelesai: true });
    case "ringkasanAi":
      if (!a.meta) return null;
      return () =>
        panggil("POST", "/api/ai-summaries", {
          periodeDari: a.meta!.dari,
          periodeSampai: a.meta!.sampai,
          jumlahTransaksi: a.ringkasan.jumlahTransaksi,
          angka: a.meta!.angka,
          poin: a.ringkasan.poin,
          sumber: a.ringkasan.sumber,
        });
    case "simpanSimulasi":
      if (!a.detail) return null;
      return () => panggil("POST", "/api/loan-simulations", { ...a.detail, id: a.simulasi.id, diLaporan: a.simulasi.diLaporan });
    case "simulasiKeLaporan":
      return () => panggil("PATCH", `/api/loan-simulations/${a.id}`, { diLaporan: true });
    case "hapusSimulasi":
      return () => panggil("DELETE", `/api/loan-simulations/${a.id}`);
    case "simpanProduk": {
      const p = a.produk;
      if (!a.konfirmasi) return () => panggil("PUT", `/api/products/${p.id}`, { nama: p.nama });
      const skor = hitungSkor(p.data, p.mode, s.profil.kota);
      return () =>
        panggil("PUT", `/api/products/${p.id}`, {
          nama: p.nama,
          pemeriksaan: {
            mode: p.mode,
            isian: p.data,
            teksLain: p.teksLain,
            skor: skor.skor,
            kategori: skor.kategori,
            rincian: skor.items,
            klaim: cariKlaim(p.teksLain),
            sumberIsian: a.dariAi ? "ai_dikonfirmasi" : "manual",
          },
        });
    }
    case "hapusProduk":
      return () => panggil("DELETE", `/api/products/${a.id}`);
    case "hapusSemuaData":
      return () => panggil("POST", "/api/data/hapus-semua", { konfirmasi: "HAPUS" });
    default:
      return null; // muatServer, keluar, reset: hanya lokal
  }
}
