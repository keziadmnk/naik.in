import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { panggil } from "../api";
import { KATEGORI_BAWAAN } from "../data/categories";
import { AWAL_DATA_TIGA_BULAN, HARI_INI_DEMO, PROFIL_DEMO, produkDemo, transaksiDemo } from "../data/demo";
import type {
  BiayaRutin, Kategori, PengaturanDemo, Pengingat, ProfilUsaha, RingkasanAi, Temuan, Transaksi,
} from "../data/types";
import { deteksiTemuan } from "../lib/findings";
import { dataLabelKosong, type DataLabel } from "../lib/engine/label";
import type { ProdukLabel } from "../data/demo";
import { keApi } from "./sinkron";

export type { ProdukLabel } from "../data/demo";

// Dua mode penyimpanan:
// - server: setelah masuk & backend tersedia, data dimuat dari GET /api/data dan setiap
//   perubahan dikirim ke API (lihat ./sinkron.ts). localStorage hanya sebagai cache.
// - lokal: backend tidak tersedia / belum masuk → data contoh di browser (mode demo).

export type Keadaan = {
  versi: 1;
  /** true = data berasal dari database (mode server) */
  server: boolean;
  profil: ProfilUsaha;
  kategoriTambahan: Kategori[];
  tambahan: Transaksi[];
  diubah: Record<string, Partial<Transaksi>>;
  dihapus: string[];
  temuanDitindak: string[];
  hariLibur: string[];
  biayaRutin: BiayaRutin[];
  pengingat: Pengingat;
  demo: PengaturanDemo;
  ringkasanAi: RingkasanAi | null;
  turSelesai: boolean;
  kur: PengaturanKur;
  simulasi: SimulasiTersimpan[];
  produk: ProdukLabel[];
};

export type PengaturanKur = {
  cicilanLama: number;
  konservatif: boolean;
  /** null = pakai nilai awal (Pengaturan → uang dapur keluarga, atau rata-rata pengeluaran pribadi) */
  kebutuhanRT: number | null;
};

export type SimulasiTersimpan = {
  id: string;
  dibuat: string;
  plafon: number;
  tenor: number;
  bungaTahunan: number;
  cicilan: number;
  status: "hijau" | "kuning" | "merah";
  npl: number;
  kebutuhanRT: number;
  cicilanLama: number;
  diLaporan: boolean;
};

/** Rincian tambahan simulasi yang disimpan ke tabel loan_simulations. */
export type DetailSimulasi = Record<string, unknown>;

const AWAL: Keadaan = {
  versi: 1,
  server: false,
  profil: PROFIL_DEMO,
  kategoriTambahan: [],
  tambahan: [],
  diubah: {},
  dihapus: [],
  temuanDitindak: [],
  hariLibur: [],
  biayaRutin: [
    { id: "b1", nama: "Sewa kios", jenis: "usaha", nominalBulanan: 800_000 },
    { id: "b2", nama: "Listrik & air usaha", jenis: "usaha", nominalBulanan: 350_000 },
    { id: "b3", nama: "Uang dapur keluarga (minimal)", jenis: "rumah_tangga", nominalBulanan: 2_000_000 },
  ],
  pengingat: { harian: true, jam: "20:00", mingguan: true },
  demo: { akunKosong: false, dataTigaBulan: false, modeOffline: false },
  ringkasanAi: null,
  turSelesai: false,
  kur: { cicilanLama: 0, konservatif: false, kebutuhanRT: null },
  simulasi: [],
  produk: [produkDemo()],
};

const KUNCI = "naikin-keadaan-v2";

function muat(): Keadaan {
  try {
    const teks = localStorage.getItem(KUNCI);
    if (!teks) return AWAL;
    const data = JSON.parse(teks) as Keadaan;
    return data.versi === 1 ? { ...AWAL, ...data } : AWAL;
  } catch {
    return AWAL;
  }
}

/** Bentuk respons GET /api/data. */
export type DataServer = {
  punyaUsaha: boolean;
  profil: ProfilUsaha;
  kategoriTambahan: Kategori[];
  transaksi: Transaksi[];
  temuanDitindak: string[];
  hariLibur: string[];
  biayaRutin: BiayaRutin[];
  pengingat: Pengingat;
  demo: PengaturanDemo;
  kur: PengaturanKur;
  turSelesai: boolean;
  simulasi: SimulasiTersimpan[];
  produk: (Omit<ProdukLabel, "data"> & { data: DataLabel | null })[];
  ringkasanAi: RingkasanAi | null;
};

export type Aksi =
  | { type: "simpanTransaksi"; transaksi: Transaksi[]; namaFile?: string }
  | { type: "ubahTransaksi"; id: string; perubahan: Partial<Transaksi> }
  | { type: "hapusTransaksi"; id: string }
  | { type: "tindakTemuan"; id: string; temuan?: Temuan; tindakan?: string }
  | { type: "tandaiLibur"; tanggal: string[]; temuanId: string; temuan?: Temuan }
  | { type: "profil"; profil: Partial<ProfilUsaha> }
  | { type: "tambahKategori"; kategori: Kategori }
  | { type: "hapusKategori"; id: string }
  | { type: "biayaRutin"; biayaRutin: BiayaRutin[] }
  | { type: "pengingat"; pengingat: Partial<Pengingat> }
  | { type: "demo"; demo: Partial<PengaturanDemo> }
  | { type: "ringkasanAi"; ringkasan: RingkasanAi; meta?: { dari: string; sampai: string; angka: Record<string, number> } }
  | { type: "turSelesai" }
  | { type: "kur"; kur: Partial<PengaturanKur> }
  | { type: "simpanSimulasi"; simulasi: SimulasiTersimpan; detail?: DetailSimulasi }
  | { type: "simulasiKeLaporan"; id: string }
  | { type: "hapusSimulasi"; id: string }
  | { type: "simpanProduk"; produk: ProdukLabel; konfirmasi?: boolean; dariAi?: boolean }
  | { type: "hapusProduk"; id: string }
  | { type: "hapusSemuaData" }
  | { type: "muatServer"; data: DataServer }
  | { type: "keluar" }
  | { type: "reset" };

function reducer(s: Keadaan, a: Aksi): Keadaan {
  switch (a.type) {
    case "simpanTransaksi":
      return { ...s, tambahan: [...s.tambahan, ...a.transaksi] };
    case "ubahTransaksi":
      if (s.tambahan.some((t) => t.id === a.id))
        return { ...s, tambahan: s.tambahan.map((t) => (t.id === a.id ? { ...t, ...a.perubahan } : t)) };
      return { ...s, diubah: { ...s.diubah, [a.id]: { ...s.diubah[a.id], ...a.perubahan } } };
    case "hapusTransaksi":
      return { ...s, tambahan: s.tambahan.filter((t) => t.id !== a.id), dihapus: [...s.dihapus, a.id] };
    case "tindakTemuan":
      return { ...s, temuanDitindak: [...s.temuanDitindak, a.id] };
    case "tandaiLibur":
      return { ...s, hariLibur: [...s.hariLibur, ...a.tanggal], temuanDitindak: [...s.temuanDitindak, a.temuanId] };
    case "profil":
      return { ...s, profil: { ...s.profil, ...a.profil } };
    case "tambahKategori":
      return { ...s, kategoriTambahan: [...s.kategoriTambahan, a.kategori] };
    case "hapusKategori":
      return { ...s, kategoriTambahan: s.kategoriTambahan.filter((k) => k.id !== a.id) };
    case "biayaRutin":
      return { ...s, biayaRutin: a.biayaRutin };
    case "pengingat":
      return { ...s, pengingat: { ...s.pengingat, ...a.pengingat } };
    case "demo": {
      const demo = { ...s.demo, ...a.demo };
      // Akun kosong & data 3 bulan saling meniadakan
      if (a.demo.akunKosong) demo.dataTigaBulan = false;
      if (a.demo.dataTigaBulan) demo.akunKosong = false;
      return { ...s, demo, ringkasanAi: null };
    }
    case "ringkasanAi":
      return { ...s, ringkasanAi: a.ringkasan };
    case "kur":
      return { ...s, kur: { ...s.kur, ...a.kur } };
    case "simpanSimulasi": {
      const lain = a.simulasi.diLaporan ? s.simulasi.map((x) => ({ ...x, diLaporan: false })) : s.simulasi;
      return { ...s, simulasi: [a.simulasi, ...lain].slice(0, 20) };
    }
    case "simulasiKeLaporan":
      return { ...s, simulasi: s.simulasi.map((x) => ({ ...x, diLaporan: x.id === a.id })) };
    case "hapusSimulasi":
      return { ...s, simulasi: s.simulasi.filter((x) => x.id !== a.id) };
    case "simpanProduk":
      return s.produk.some((x) => x.id === a.produk.id)
        ? { ...s, produk: s.produk.map((x) => (x.id === a.produk.id ? a.produk : x)) }
        : { ...s, produk: [...s.produk, a.produk] };
    case "hapusProduk":
      return { ...s, produk: s.produk.filter((x) => x.id !== a.id) };
    case "turSelesai":
      return { ...s, turSelesai: true };
    case "hapusSemuaData":
      return {
        ...s,
        tambahan: [], diubah: {}, dihapus: [], temuanDitindak: [], hariLibur: [], ringkasanAi: null,
        // Mode lokal: data contoh disembunyikan lewat saklar "akun kosong"
        demo: s.server ? s.demo : { ...s.demo, akunKosong: true, dataTigaBulan: false },
      };
    case "muatServer": {
      const d = a.data;
      return {
        ...AWAL,
        server: true,
        profil: d.profil,
        kategoriTambahan: d.kategoriTambahan,
        tambahan: d.transaksi,
        temuanDitindak: d.temuanDitindak,
        hariLibur: d.hariLibur,
        biayaRutin: d.biayaRutin,
        pengingat: d.pengingat,
        demo: d.demo,
        kur: d.kur,
        turSelesai: d.turSelesai,
        simulasi: d.simulasi,
        produk: d.produk.map((p) => ({ ...p, data: p.data ?? dataLabelKosong() })),
        ringkasanAi: d.ringkasanAi,
      };
    }
    case "keluar":
    case "reset":
      return AWAL;
  }
}

function filterDemo(transaksi: Transaksi[], demo: PengaturanDemo): Transaksi[] {
  if (demo.akunKosong) return [];
  return demo.dataTigaBulan ? transaksi.filter((t) => t.tanggal >= AWAL_DATA_TIGA_BULAN) : transaksi;
}

export type StatusSinkron = { status: "idle" | "menyimpan" | "galat"; pesan?: string };

function useNilai(keadaan: Keadaan, kirim: (a: Aksi) => void, sinkron: StatusSinkron, muatUlang: () => Promise<boolean>) {
  return useMemo(() => {
    const kategori = [...KATEGORI_BAWAAN, ...keadaan.kategoriTambahan];
    const dihapus = new Set(keadaan.dihapus);
    // Mode lokal: data contoh + tambahan pengguna. Mode server: semua dari database.
    const semua = keadaan.server
      ? filterDemo(keadaan.tambahan, keadaan.demo)
      : [...filterDemo(transaksiDemo(), keadaan.demo), ...keadaan.tambahan];
    const transaksi = semua
      .filter((t) => !dihapus.has(t.id))
      .map((t) => (keadaan.diubah[t.id] ? { ...t, ...keadaan.diubah[t.id] } : t))
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.id.localeCompare(b.id));
    const hariIni = HARI_INI_DEMO;
    const temuan = deteksiTemuan(transaksi, kategori, {
      hariIni,
      hariLibur: keadaan.hariLibur,
      diabaikan: keadaan.temuanDitindak,
    });
    const perluDicek = new Set(temuan.flatMap((t) => t.transaksiIds.slice(0, 1)));
    return { ...keadaan, kategori, transaksi, temuan, perluDicek, hariIni, kirim, sinkron, muatUlang };
  }, [keadaan, kirim, sinkron, muatUlang]);
}

export type NilaiToko = ReturnType<typeof useNilai>;
const Konteks = createContext<NilaiToko | null>(null);

export function TokoProvider({ children }: { children: ReactNode }) {
  const [keadaan, dispatch] = useReducer(reducer, undefined, muat);
  const [sinkron, setSinkron] = useState<StatusSinkron>({ status: "idle" });
  const terkini = useRef(keadaan);
  terkini.current = keadaan;
  const antrian = useRef<Promise<unknown>>(Promise.resolve());
  const tertunda = useRef(0);

  useEffect(() => {
    try {
      localStorage.setItem(KUNCI, JSON.stringify(keadaan));
    } catch {
      /* penyimpanan tidak tersedia (mode privat) — aplikasi tetap jalan */
    }
  }, [keadaan]);

  const kirim = useCallback((a: Aksi) => {
    const sebelum = terkini.current;
    dispatch(a);
    // Perbarui rujukan segera agar aksi berikutnya di tick yang sama melihat keadaan terbaru
    terkini.current = reducer(sebelum, a);
    if (!sebelum.server) return;
    const tugas = keApi(a, sebelum);
    if (!tugas) return;
    tertunda.current += 1;
    setSinkron({ status: "menyimpan" });
    // Antrean berurutan: perubahan sampai ke server sesuai urutan dilakukan
    antrian.current = antrian.current.then(async () => {
      const hasil = await tugas();
      tertunda.current -= 1;
      if (!hasil.ok) setSinkron({ status: "galat", pesan: hasil.message ?? `Galat ${hasil.status}` });
      else if (tertunda.current === 0) setSinkron((s) => (s.status === "galat" ? s : { status: "idle" }));
    });
  }, []);

  /** Muat data dari server. true bila berhasil (mode server aktif). */
  const muatUlang = useCallback(async () => {
    const res = await panggil<DataServer>("GET", "/api/data");
    if (res.ok && res.profil) {
      const aksi: Aksi = { type: "muatServer", data: res as unknown as DataServer };
      dispatch(aksi);
      terkini.current = reducer(terkini.current, aksi);
      setSinkron({ status: "idle" });
      return true;
    }
    // Sesi habis: jangan tampilkan data server milik pengguna sebelumnya
    if (res.status === 401 && terkini.current.server) dispatch({ type: "keluar" });
    return false;
  }, []);

  // Status sinkron terbaca di DOM (untuk uji & debugging) + cegah menutup tab saat masih menyimpan
  useEffect(() => {
    document.body.dataset.sinkron = sinkron.status;
  }, [sinkron.status]);
  useEffect(() => {
    const cegah = (e: BeforeUnloadEvent) => {
      if (tertunda.current > 0) e.preventDefault();
    };
    window.addEventListener("beforeunload", cegah);
    return () => window.removeEventListener("beforeunload", cegah);
  }, []);

  useEffect(() => {
    // Hanya bila pernah masuk di browser ini (cookie sesi berlaku 30 hari)
    if (sudahMasuk() || terkini.current.server) void muatUlang();
  }, [muatUlang]);

  const nilai = useNilai(keadaan, kirim, sinkron, muatUlang);
  return <Konteks.Provider value={nilai}>{children}</Konteks.Provider>;
}

export function useToko(): NilaiToko {
  const nilai = useContext(Konteks);
  if (!nilai) throw new Error("useToko harus dipakai di dalam <TokoProvider>");
  return nilai;
}

const KUNCI_MASUK = "naikin-masuk";
export function tandaiMasuk(masuk: boolean) {
  try {
    if (masuk) localStorage.setItem(KUNCI_MASUK, "1");
    else localStorage.removeItem(KUNCI_MASUK);
  } catch {
    /* abaikan */
  }
}
function sudahMasuk(): boolean {
  try {
    return localStorage.getItem(KUNCI_MASUK) === "1";
  } catch {
    return false;
  }
}

/** ID baru berformat UUID — sama di browser dan database. */
export const idBaru = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (Number(c) ^ (Math.random() * 16) >> (Number(c) / 4)).toString(16));
