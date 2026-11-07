// Engine pemeriksaan label pangan olahan (JavaScript murni, tanpa AI).
// Diturunkan dari backend/lib/engine/label (bobot, validator, dan klaim yang sama).
// AI hanya membantu membaca foto & menulis draf teks; skor selalu dihitung di sini.

import {
  BOBOT_LABEL, DIGIT_IZIN_LAMA, DIGIT_IZIN_SEKARANG, DIGIT_KODE_POS, LABEL_SETENGAH_POIN, LABEL_WAJIB_BAGIAN_UTAMA,
  SATUAN_BERAT_BERSIH, SKOR_LABEL_HAMPIR, SKOR_LABEL_LENGKAP,
} from "../../config/thresholds";

export type KunciLabel = keyof typeof BOBOT_LABEL;
export type Lokasi = "utama" | "lain" | "tidak_terlihat";
export type ModeLabel = "draf" | "beredar";
export type StatusItem = "Sesuai" | "Ada tapi kurang" | "Tidak ada" | "Tidak berlaku";

/** 9 keterangan wajib label pangan olahan (Peraturan BPOM tentang Label Pangan Olahan). */
export const KETERANGAN_WAJIB: { kunci: KunciLabel; nama: string; contoh: string; bisaTidakBerlaku?: string }[] = [
  { kunci: "namaProduk", nama: "Nama produk", contoh: "Keripik Singkong Balado “Bu Sari”" },
  { kunci: "daftarBahan", nama: "Daftar bahan (komposisi)", contoh: "Komposisi: singkong, minyak sawit, cabai, gula, garam, bawang putih." },
  { kunci: "beratBersih", nama: "Berat bersih / isi bersih", contoh: "Berat bersih 200 g" },
  { kunci: "produsen", nama: "Nama & alamat produsen", contoh: "Diproduksi oleh: Bu Sari, Jl. Mawar 12, Padang 25111, Indonesia" },
  { kunci: "halal", nama: "Keterangan halal", contoh: "Logo halal + nomor sertifikat", bisaTidakBerlaku: "Hanya wajib bagi produk yang dipersyaratkan" },
  { kunci: "kodeProduksi", nama: "Tanggal & kode produksi", contoh: "Kode produksi: 061126-A" },
  { kunci: "kedaluwarsa", nama: "Keterangan kedaluwarsa", contoh: "Baik digunakan sebelum 06 05 2027" },
  { kunci: "nomorIzin", nama: "Nomor izin edar", contoh: "P-IRT 123456789012345 atau BPOM RI MD 123456789012345" },
  { kunci: "asalUsul", nama: "Asal usul bahan tertentu", contoh: "Mengandung babi / bahan rekayasa genetik (bila ada)", bisaTidakBerlaku: "Hanya untuk bahan pangan tertentu" },
];

export type IsianLabel = {
  nilai: string;
  lokasi: Lokasi;
  tidakBerlaku?: boolean;
};

export type DataLabel = Record<KunciLabel, IsianLabel>;

export const dataLabelKosong = (): DataLabel =>
  Object.fromEntries(KETERANGAN_WAJIB.map((k) => [k.kunci, { nilai: "", lokasi: "tidak_terlihat" as Lokasi }])) as DataLabel;

// ---------------------------------------------------------------------------
// Validator format
// ---------------------------------------------------------------------------

export type HasilValidasi = { valid: boolean; pesan: string; peringatan?: "format_lama" | "bukan_izin_edar"; jenis?: "MD" | "P-IRT" | null };

export function cekNomorIzin(nilai: string): HasilValidasi {
  const n = nilai.trim().toUpperCase().replace(/\s+/g, " ");
  if (n === "SP") return { valid: false, jenis: null, peringatan: "bukan_izin_edar", pesan: "SP bukan izin edar." };
  const md = new RegExp(`^BPOM RI MD\\s*\\d{${DIGIT_IZIN_SEKARANG}}$`);
  const pirt = new RegExp(`^P-?IRT\\s*\\d{${DIGIT_IZIN_SEKARANG}}$`);
  const mdLama = new RegExp(`^BPOM RI MD\\s*\\d{${DIGIT_IZIN_LAMA}}$`);
  const pirtLama = new RegExp(`^P-?IRT\\s*\\d{${DIGIT_IZIN_LAMA}}$`);
  if (md.test(n)) return { valid: true, jenis: "MD", pesan: "Format nomor izin MD sesuai pola." };
  if (pirt.test(n)) return { valid: true, jenis: "P-IRT", pesan: "Format nomor izin P-IRT sesuai pola." };
  if (mdLama.test(n) || pirtLama.test(n))
    return { valid: false, jenis: mdLama.test(n) ? "MD" : "P-IRT", peringatan: "format_lama", pesan: "Format nomor izin lama terdeteksi (12 digit)." };
  return { valid: false, jenis: null, pesan: "Format nomor izin belum sesuai pola (P-IRT atau BPOM RI MD + 15 digit)." };
}

export function cekKedaluwarsa(nilai: string): HasilValidasi {
  const valid = /baik\s+digunakan\s+sebelum/i.test(nilai);
  return { valid, pesan: valid ? "Diawali “Baik digunakan sebelum”." : "Kedaluwarsa perlu didahului “Baik digunakan sebelum”." };
}

export function cekAlamatProdusen(nilai: string, kota: string): HasilValidasi {
  const adaKota = kota.trim().length > 0 && nilai.toLocaleLowerCase().includes(kota.trim().toLocaleLowerCase());
  const adaKodePos = new RegExp(`\\b\\d{${DIGIT_KODE_POS}}\\b`).test(nilai);
  const adaNegara = /\bindonesia\b/i.test(nilai);
  const valid = adaKota && adaKodePos && adaNegara;
  return { valid, pesan: valid ? "Memuat nama kota, kode pos, dan Indonesia." : "Alamat perlu memuat nama kota, kode pos 5 digit, dan “Indonesia”." };
}

export function cekBeratBersih(nilai: string): HasilValidasi {
  const satuan = SATUAN_BERAT_BERSIH.join("|");
  const valid = new RegExp(`\\b\\d+(?:[.,]\\d+)?\\s*(?:${satuan})\\b`, "i").test(nilai);
  return { valid, pesan: valid ? "Memakai satuan metrik." : "Gunakan angka dengan satuan mg, g, kg, mL, atau L." };
}

function validasiFormat(kunci: KunciLabel, nilai: string, kota: string): HasilValidasi | null {
  if (kunci === "nomorIzin") return cekNomorIzin(nilai);
  if (kunci === "kedaluwarsa") return cekKedaluwarsa(nilai);
  if (kunci === "produsen") return cekAlamatProdusen(nilai, kota);
  if (kunci === "beratBersih") return cekBeratBersih(nilai);
  return null;
}

// ---------------------------------------------------------------------------
// Skor
// ---------------------------------------------------------------------------

export type ItemSkor = {
  kunci: KunciLabel;
  nama: string;
  status: StatusItem;
  bobot: number;
  poin: number;
  lokasi: Lokasi;
  catatan: string[];
};

export type HasilSkor = {
  skor: number; // 0–100
  kategori: "Lengkap" | "Hampir lengkap" | "Perlu dilengkapi";
  items: ItemSkor[];
  bobotBerlaku: number;
  catatanDraf?: string;
};

const WAJIB_UTAMA = new Set<string>(LABEL_WAJIB_BAGIAN_UTAMA);

export function hitungSkor(data: DataLabel, mode: ModeLabel, kotaProdusen: string): HasilSkor {
  const items = KETERANGAN_WAJIB.map(({ kunci, nama }) => {
    const isian = data[kunci];
    const bobot = BOBOT_LABEL[kunci];
    const catatan: string[] = [];
    let status: StatusItem;
    if (isian.tidakBerlaku) status = "Tidak berlaku";
    else if (mode === "draf" && kunci === "nomorIzin") {
      status = "Tidak berlaku";
      catatan.push("Mode draf: sisakan ruang untuk nomor izin.");
    } else if (!isian.nilai.trim() || isian.lokasi === "tidak_terlihat") status = "Tidak ada";
    else {
      const format = validasiFormat(kunci, isian.nilai, kotaProdusen);
      const salahLokasi = isian.lokasi === "lain" && WAJIB_UTAMA.has(kunci);
      if (format && !format.valid) catatan.push(format.pesan);
      if (salahLokasi) catatan.push("Sebaiknya ada di bagian utama label (sisi depan).");
      // Lokasi hanya dinilai untuk keterangan yang wajib di bagian utama;
      // daftar bahan & kode produksi boleh di bagian lain kemasan.
      status = (format && !format.valid) || salahLokasi ? "Ada tapi kurang" : "Sesuai";
      if (format?.valid && status === "Sesuai") catatan.push(format.pesan);
    }
    const poin = status === "Sesuai" ? bobot : status === "Ada tapi kurang" ? bobot * LABEL_SETENGAH_POIN : 0;
    return { kunci, nama, status, bobot, poin, lokasi: isian.lokasi, catatan };
  });
  const bobotBerlaku = items.filter((i) => i.status !== "Tidak berlaku").reduce((a, i) => a + i.bobot, 0);
  const skor = bobotBerlaku === 0 ? 0 : (items.reduce((a, i) => a + i.poin, 0) / bobotBerlaku) * 100;
  return {
    skor,
    kategori: skor >= SKOR_LABEL_LENGKAP ? "Lengkap" : skor >= SKOR_LABEL_HAMPIR ? "Hampir lengkap" : "Perlu dilengkapi",
    items,
    bobotBerlaku,
    ...(mode === "draf" ? { catatanDraf: "Sisakan ruang untuk nomor izin dan 2D barcode." } : {}),
  };
}

// ---------------------------------------------------------------------------
// Klaim yang perlu dihindari
// ---------------------------------------------------------------------------

const ATURAN_KLAIM = [
  { kata: ["terbaik", "paling", "nomor satu", "terenak"], alasan: "Klaim superlatif memerlukan dasar yang dapat diperiksa.", saran: "Pilihan rasa yang cocok untuk menemani harimu." },
  { kata: ["menyehatkan", "menyembuhkan", "obat", "meningkatkan kecerdasan"], alasan: "Klaim kesehatan atau pengobatan tidak boleh digunakan tanpa dasar dan izin yang sesuai.", saran: "Dibuat dengan bahan yang dipilih dengan cermat." },
  { kata: ["satu-satunya", "hanya", "cuma"], alasan: "Klaim eksklusif perlu bukti yang memadai.", saran: "Salah satu pilihan camilan untuk momenmu." },
  { kata: ["tanpa BTP", "bebas BTP"], alasan: "Klaim ini tidak sesuai; gunakan klaim spesifik hanya jika ada dasar.", saran: "Tanpa pengawet* (cantumkan penjelasan dan dasar)." },
  { kata: ["alami", "murni", "100%", "asli", "segar"], alasan: "Klaim bahan atau kemurnian perlu dasar yang jelas.", saran: "Menggunakan bahan yang dipilih dengan cermat." },
  { kata: ["premium", "spesial", "gold", "ekstra"], alasan: "Klaim ini memerlukan tanda bintang dan penjelasan.", saran: "Rasa khas untuk menemani momen spesial." },
  { kata: ["modern", "terbaru"], alasan: "Klaim kebaruan perlu dasar yang dapat diperiksa.", saran: "Dikemas praktis untuk aktivitas sehari-hari." },
] as const;

export type TemuanKlaim = { kutipan: string; alasan: string; saran: string };

export function cariKlaim(teks: string): TemuanKlaim[] {
  const hasil: TemuanKlaim[] = [];
  for (const aturan of ATURAN_KLAIM) {
    for (const kata of aturan.kata) {
      const cocok = teks.match(new RegExp(kata.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
      if (cocok) {
        hasil.push({ kutipan: cocok[0], alasan: aturan.alasan, saran: aturan.saran });
        break;
      }
    }
  }
  return hasil;
}

// ---------------------------------------------------------------------------
// Saran perbaikan & draf teks label
// ---------------------------------------------------------------------------

export type Saran = { kunci: KunciLabel; prioritas: number; teks: string };

export function susunSaran(h: HasilSkor): Saran[] {
  return h.items
    .filter((i) => i.status === "Tidak ada" || i.status === "Ada tapi kurang")
    .map((i) => {
      const ref = KETERANGAN_WAJIB.find((k) => k.kunci === i.kunci)!;
      const teks =
        i.status === "Tidak ada"
          ? `Tambahkan ${ref.nama.toLowerCase()}. Contoh: ${ref.contoh}`
          : `Perbaiki ${ref.nama.toLowerCase()}: ${i.catatan.join(" ") || "lengkapi sesuai contoh."}`;
      return { kunci: i.kunci, prioritas: i.status === "Tidak ada" ? i.bobot + 100 : i.bobot, teks };
    })
    .sort((a, b) => b.prioritas - a.prioritas);
}

/** Draf teks label belakang tanpa mengarang data: yang kosong menjadi [ISI: ...]. */
export function drafTeksLabel(data: DataLabel, mode: ModeLabel): string {
  const isi = (k: KunciLabel, placeholder: string) => (data[k].nilai.trim() ? data[k].nilai.trim() : `[ISI: ${placeholder}]`);
  const baris = [
    isi("namaProduk", "nama produk dan merek"),
    isi("beratBersih", "berat bersih, mis. 200 g"),
    "",
    isi("daftarBahan", "Komposisi: bahan dari yang terbanyak"),
    "",
    isi("produsen", "Diproduksi oleh: nama, alamat, kota, kode pos, Indonesia"),
    data.halal.tidakBerlaku ? null : isi("halal", "logo & nomor sertifikat halal, jika sudah ada"),
    isi("kodeProduksi", "Kode produksi"),
    isi("kedaluwarsa", "Baik digunakan sebelum: tanggal bulan tahun"),
    mode === "draf" ? "[RUANG NOMOR IZIN EDAR & 2D BARCODE]" : isi("nomorIzin", "P-IRT / BPOM RI MD + 15 digit"),
    data.asalUsul.tidakBerlaku ? null : isi("asalUsul", "keterangan asal usul bahan tertentu"),
  ];
  return baris.filter((b) => b !== null).join("\n");
}
