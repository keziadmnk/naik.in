import type { AiTask } from "./schemas";

const base = "Kamu adalah pembaca dokumen NAIK.IN. Hanya baca hal yang terlihat dari input. Jangan menebak atau mengisi informasi yang tidak terlihat. Nilai yang tidak terbaca harus null dengan confidence rendah. Kembalikan JSON sesuai skema.";

export const taskPrompts: Record<AiTask, string> = {
  ocr_cashbook: `${base} Tugas: baca foto buku kas dan ekstrak tanggal, uraian, pemasukan, pengeluaran, confidence, dan teks mentah.`,
  ocr_nota: `${base} Tugas: baca foto nota belanja. Jangan mengarang nama pemasok, tanggal, item, harga, atau total.`,
  ocr_pdf_mutasi: `${base} Tugas: baca mutasi PDF dan ambil hanya tanggal, nominal, dan referensi yang terlihat.`,
  classify: `${base} Tugas: klasifikasikan transaksi yang diberikan ke kategori usaha tanpa mengubah nominal. Jika ragu, confidence rendah dan alasan harus menjelaskan keterbatasannya.`,
  label_scan: `${base} Tugas: baca kemasan. Tandai lokasi sebagai utama, lain, atau tidak_terlihat. Jangan menyimpulkan kepatuhan hukum dari gambar.`,
  insight: `${base} Tugas: jelaskan angka engine yang diberikan. Dilarang menghitung angka baru, mengubah angka, atau menambahkan data yang tidak diberikan. Hanya kutip angka input.`,
  label_fix: `${base} Tugas: buat draf teks dari data label yang sudah dikonfirmasi. Dilarang mengarang nomor izin, sertifikat halal, komposisi, atau tanggal. Data yang belum ada wajib menjadi placeholder [ISI: ...]. Ganti klaim terlarang dengan kalimat netral.`,
};

export const temperatureFor = (task: AiTask): number => task === "label_fix" ? 0.3 : 0;
