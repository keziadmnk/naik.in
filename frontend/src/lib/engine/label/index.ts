import {
  BOBOT_LABEL, DIGIT_IZIN_LAMA, DIGIT_IZIN_SEKARANG, DIGIT_KODE_POS, LABEL_SETENGAH_POIN, LABEL_WAJIB_BAGIAN_UTAMA,
  SATUAN_BERAT_BERSIH, SKOR_LABEL_HAMPIR, SKOR_LABEL_LENGKAP,
} from "../../config/thresholds";
import { cariKota } from "./kota";

export type KunciLabel = keyof typeof BOBOT_LABEL;
export type Lokasi = "utama" | "lain" | "tidak_terlihat";
export type ModeLabel = "draf" | "beredar";
export type StatusItem = "Sesuai" | "Ada tapi kurang" | "Tidak ada" | "Tidak berlaku";

export const KETERANGAN_WAJIB: { kunci: KunciLabel; nama: string; contoh: string; bisaTidakBerlaku?: string }[] = [
  { kunci: "namaProduk", nama: "Nama produk", contoh: "Keripik Singkong Balado “Bu Sari”" },
  { kunci: "daftarBahan", nama: "Daftar bahan (komposisi)", contoh: "Komposisi: singkong, minyak sawit, cabai, gula, garam, bawang putih." },
  { kunci: "beratBersih", nama: "Berat bersih / isi bersih", contoh: "Berat bersih 200 g" },
  { kunci: "produsen", nama: "Nama & alamat produsen", contoh: "Diproduksi oleh: Bu Sari, Jl. Mawar 12, Padang 25111, Indonesia" },
  { kunci: "halal", nama: "Keterangan halal", contoh: "Logo halal + nomor sertifikat", bisaTidakBerlaku: "Hanya wajib bagi produk yang dipersyaratkan" },
  { kunci: "kodeProduksi", nama: "Tanggal & kode produksi", contoh: "Kode produksi: 061126-A" },
  { kunci: "kedaluwarsa", nama: "Keterangan kedaluwarsa", contoh: "Baik digunakan sebelum 06 05 2027" },
  { kunci: "nomorIzin", nama: "Nomor izin edar", contoh: "P-IRT 123456789012345 atau BPOM RI MD 123456789012345" },
  { kunci: "asalUsul", nama: "Asal usul bahan tertentu", contoh: "Mengandung babi / bahan rekayasa genetik (bila ada)" },
];

export const PANDUAN_LABEL: Record<KunciLabel, string> = {
  namaProduk:
    "Cantumkan nama produk beserta jenis pangannya di bagian depan kemasan, misalnya “Keripik Singkong Balado”, agar konsumen langsung tahu produk apa yang dibeli.",
  daftarBahan:
    "Cantumkan daftar bahan yang diawali kata “Komposisi:” dan diurutkan dari bahan yang paling banyak digunakan, misalnya “Komposisi: singkong, minyak sawit, cabai”, agar konsumen mengetahui isi produk.",
  beratBersih:
    "Cantumkan berat bersih atau isi bersih dengan angka dan satuan metrik (mg, g, kg, ml, atau L), misalnya “Berat bersih 200 g”, di bagian depan kemasan agar mudah dibaca konsumen.",
  produsen:
    "Cantumkan nama dan alamat lengkap produsen (jalan, kota/kabupaten, kode pos, dan “Indonesia”) agar konsumen maupun pengawas dapat menelusuri asal produk.",
  halal:
    "Cantumkan logo halal dan nomor sertifikat halal secara jelas pada kemasan agar mudah terlihat oleh konsumen (wajib bagi produk yang dipersyaratkan bersertifikat halal).",
  kodeProduksi:
    "Cantumkan kode produksi atau nomor batch, misalnya “Kode produksi: 061126-A”, agar setiap kemasan dapat ditelusuri bila suatu saat terjadi masalah mutu.",
  kedaluwarsa:
    "Cantumkan keterangan kedaluwarsa yang diawali frasa “Baik digunakan sebelum” lalu tanggal, bulan, dan tahun, misalnya “Baik digunakan sebelum 06 05 2027”, di tempat yang mudah ditemukan.",
  nomorIzin:
    "Cantumkan nomor izin edar yang masih berlaku, yaitu P-IRT atau BPOM RI MD/ML diikuti 15 digit angka, di bagian depan kemasan sebagai bukti produk sudah terdaftar.",
  asalUsul:
    "Keterangan halal belum tercantum, jadi asal usul bahan tertentu perlu dijelaskan. Cantumkan bila produk mengandung bahan tertentu, misalnya “Mengandung babi” atau “Mengandung bahan rekayasa genetik”; atau lengkapi keterangan halal agar poin ini otomatis terpenuhi.",
};

export type IsianLabel = {
  nilai: string;
  lokasi: Lokasi;
  tidakBerlaku?: boolean;
  tidakTerbaca?: boolean;
};

export type DataLabel = Record<KunciLabel, IsianLabel>;

export const dataLabelKosong = (): DataLabel =>
  Object.fromEntries(KETERANGAN_WAJIB.map((k) => [k.kunci, { nilai: "", lokasi: "tidak_terlihat" as Lokasi }])) as DataLabel;


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

export function cekAlamatProdusen(nilai: string, kotaPengguna = ""): HasilValidasi {
  const adaKota = cariKota(nilai, kotaPengguna) !== null;
  const adaKodePos = new RegExp(`\\b\\d{${DIGIT_KODE_POS}}\\b`).test(nilai);
  const adaNegara = /\bindonesia\b/i.test(nilai);
  const valid = adaKota && adaKodePos && adaNegara;
  const kurang = [!adaKota && "nama kota/kabupaten", !adaKodePos && "kode pos 5 digit", !adaNegara && "“Indonesia”"].filter(Boolean);
  return { valid, pesan: valid ? "Memuat nama kota, kode pos, dan Indonesia." : `Alamat perlu memuat ${kurang.join(", ")}.` };
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


export type ItemSkor = {
  kunci: KunciLabel;
  nama: string;
  status: StatusItem;
  bobot: number;
  poin: number;
  lokasi: Lokasi;
  catatan: string[];
  tidakTerbaca?: boolean;
};

export type HasilSkor = {
  skor: number;
  kategori: "Lengkap" | "Hampir lengkap" | "Perlu dilengkapi";
  items: ItemSkor[];
  bobotBerlaku: number;
  catatanDraf?: string;
};

const WAJIB_UTAMA = new Set<string>(LABEL_WAJIB_BAGIAN_UTAMA);

export const adaHalal = (data: DataLabel) => !data.halal.tidakBerlaku && !!data.halal.nilai.trim() && data.halal.lokasi !== "tidak_terlihat";

export const asalUsulTidakBerlaku = (data: DataLabel) => adaHalal(data) && !data.asalUsul.nilai.trim();

export function hitungSkor(data: DataLabel, mode: ModeLabel, kotaProdusen: string): HasilSkor {
  const items = KETERANGAN_WAJIB.map(({ kunci, nama }) => {
    const isian = data[kunci];
    const bobot = BOBOT_LABEL[kunci];
    const catatan: string[] = [];
    let status: StatusItem;
    if (kunci === "asalUsul" && asalUsulTidakBerlaku(data)) {
      status = "Tidak berlaku";
      catatan.push("Lulus: produk sudah mencantumkan keterangan halal.");
    } else if (kunci !== "asalUsul" && isian.tidakBerlaku) status = "Tidak berlaku";
    else if (mode === "draf" && kunci === "nomorIzin") {
      status = "Tidak berlaku";
      catatan.push("Mode draf: sisakan ruang untuk nomor izin.");
    } else if (!isian.nilai.trim() || isian.lokasi === "tidak_terlihat") {
      status = "Tidak ada";
      if (isian.tidakTerbaca) catatan.push("Tidak terbaca dari foto.");
    }
    else {
      const format = validasiFormat(kunci, isian.nilai, kotaProdusen);
      const salahLokasi = isian.lokasi === "lain" && WAJIB_UTAMA.has(kunci);
      if (format && !format.valid) catatan.push(format.pesan);
      if (salahLokasi) catatan.push("Sebaiknya ada di bagian utama label (sisi depan).");
      status = (format && !format.valid) || salahLokasi ? "Ada tapi kurang" : "Sesuai";
      if (format?.valid && status === "Sesuai") catatan.push(format.pesan);
    }
    const poin = status === "Sesuai" ? bobot : status === "Ada tapi kurang" ? bobot * LABEL_SETENGAH_POIN : 0;
    return { kunci, nama, status, bobot, poin, lokasi: isian.lokasi, catatan, tidakTerbaca: status === "Tidak ada" && !!isian.tidakTerbaca };
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


export type Saran = { kunci: KunciLabel; prioritas: number; teks: string };

export function susunSaran(h: HasilSkor): Saran[] {
  return h.items
    .filter((i) => i.status === "Tidak ada" || i.status === "Ada tapi kurang")
    .map((i) => {
      const ref = KETERANGAN_WAJIB.find((k) => k.kunci === i.kunci)!;
      const teks = i.tidakTerbaca
        ? `${ref.nama} tidak terbaca dari foto. Pastikan tulisan dicetak jelas dan kontras (tidak terlalu kecil, tidak tertutup lipatan/silau), lalu foto ulang lebih dekat.`
        : i.status === "Tidak ada"
          ? PANDUAN_LABEL[i.kunci]
          : i.catatan
              .map((c) =>
                c.startsWith("Sebaiknya ada di bagian utama")
                  ? `Pindahkan ${ref.nama.toLowerCase()} ke bagian depan kemasan (bagian utama label) agar mudah terlihat oleh konsumen.`
                  : c,
              )
              .join(" ") || PANDUAN_LABEL[i.kunci];
      return { kunci: i.kunci, prioritas: i.status === "Tidak ada" ? i.bobot + 100 : i.bobot, teks };
    })
    .sort((a, b) => b.prioritas - a.prioritas);
}

export type DrafLabel = { depan: string; belakang: string };

export function drafTeksLabel(data: DataLabel, mode: ModeLabel): DrafLabel {
  const isi = (k: KunciLabel, placeholder: string) => (data[k].nilai.trim() ? data[k].nilai.trim() : `[ISI: ${placeholder}]`);
  const gabung = (baris: (string | null)[]) => baris.filter((b) => b !== null).join("\n");
  return {
    depan: gabung([
      isi("namaProduk", "nama produk, merek, dan jenis pangan"),
      isi("beratBersih", "berat bersih, mis. 200 g"),
      data.halal.tidakBerlaku ? null : isi("halal", "logo & nomor sertifikat halal, jika sudah ada"),
      mode === "draf" ? "[RUANG NOMOR IZIN EDAR & 2D BARCODE]" : isi("nomorIzin", "P-IRT / BPOM RI MD + 15 digit"),
    ]),
    belakang: gabung([
      isi("daftarBahan", "Komposisi: bahan dari yang terbanyak"),
      "",
      isi("produsen", "Diproduksi oleh: nama, alamat, kota, kode pos, Indonesia"),
      isi("kodeProduksi", "Kode produksi"),
      isi("kedaluwarsa", "Baik digunakan sebelum: tanggal bulan tahun"),
      asalUsulTidakBerlaku(data) ? null : isi("asalUsul", "keterangan asal usul bahan tertentu, mis. “Mengandung babi”"),
    ]),
  };
}
