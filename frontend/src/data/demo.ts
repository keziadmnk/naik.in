import { addDays, monthKey, toDate } from "../lib/format";
import { dataLabelKosong, type DataLabel, type ModeLabel } from "../lib/engine/label";
import type { Metode, ProfilUsaha, Transaksi } from "./types";

export const HARI_INI_DEMO = "2026-11-06";
export const AWAL_DATA_DEMO = "2026-05-04";

export const PROFIL_DEMO: ProfilUsaha = {
  namaPemilik: "Ibu Sari Wulandari",
  email: "demo@naik.in",
  telepon: "0812-6634-2190",
  namaUsaha: "Keripik Balado Bu Sari",
  kategoriUsaha: "Makanan & Minuman",
  kota: "Padang",
  mulaiUsaha: "2024-09-06",
};


type TargetBulan = { omzet: number; hpp: number; operasional: number };

const TARGET_BULAN: Record<string, TargetBulan> = {
  "2026-05": { omzet: 19_800_000, hpp: 10_900_000, operasional: 3_800_000 },
  "2026-06": { omzet: 18_600_000, hpp: 10_300_000, operasional: 3_600_000 },
  "2026-07": { omzet: 22_900_000, hpp: 12_500_000, operasional: 4_200_000 },
  "2026-08": { omzet: 21_700_000, hpp: 11_900_000, operasional: 4_000_000 },
  "2026-09": { omzet: 21_100_000, hpp: 11_600_000, operasional: 3_900_000 },
  "2026-10": { omzet: 21_300_000, hpp: 11_800_000, operasional: 3_900_000 },
};

const LABA_MINGGU: Record<number, number> = {
  1: 1_450_000, 2: 690_000, 3: 1_480_000, 4: 1_480_000, 5: 1_850_000, 6: -300_000,
  7: 480_000, 8: 1_950_000, 9: 1_800_000, 10: 1_600_000, 11: 712_500, 12: 1_600_000,
  13: 1_600_000, 14: 1_500_000, 15: 1_500_000, 16: 650_000, 17: 1_507_500, 18: 1_850_000,
  19: 2_100_000, 20: 610_000, 21: 560_000, 22: 1_700_000, 23: 1_800_000, 24: 712_500,
  25: 1_817_500, 26: 300_000,
};

const LABA_MINGGU_BAGIAN_AWAL: Record<number, number> = {
  9: 720_000,
  13: 1_207_500,
  18: 250_000,
  22: 730_000,
};

const HARI_KOSONG = new Set([
  "2026-06-10", "2026-06-11", "2026-06-13", "2026-06-14",
  "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01",
]);

const AKHIR_DATA_HISTORIS = "2026-10-31";


function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const UNIT = 500;
const bulatkan = (value: number) => Math.round(value / UNIT) * UNIT;

function bagi(total: number, bobot: number[]): number[] {
  const jumlahBobot = bobot.reduce((a, b) => a + b, 0);
  const hasil = bobot.map((b) => bulatkan((total * b) / jumlahBobot));
  const sisa = total - hasil.reduce((a, b) => a + b, 0);
  hasil[hasil.length - 1] += sisa;
  return hasil;
}

const FAKTOR_HARI = [1.25, 0.85, 0.95, 1.0, 1.0, 1.1, 1.35];

type Segmen = { minggu: number; bulan: string; hari: string[]; laba: number };

function susunSegmen(): Segmen[] {
  const segmen: Segmen[] = [];
  for (let minggu = 1; minggu <= 26; minggu += 1) {
    const senin = addDays(AWAL_DATA_DEMO, (minggu - 1) * 7);
    const hari = Array.from({ length: 7 }, (_, i) => addDays(senin, i)).filter(
      (h) => h <= AKHIR_DATA_HISTORIS && !HARI_KOSONG.has(h),
    );
    const perBulan = new Map<string, string[]>();
    for (const h of hari) perBulan.set(monthKey(h), [...(perBulan.get(monthKey(h)) ?? []), h]);
    const bulanList = [...perBulan.keys()];
    if (bulanList.length === 1) {
      segmen.push({ minggu, bulan: bulanList[0], hari, laba: LABA_MINGGU[minggu] });
    } else {
      const awal = LABA_MINGGU_BAGIAN_AWAL[minggu];
      segmen.push({ minggu, bulan: bulanList[0], hari: perBulan.get(bulanList[0])!, laba: awal });
      segmen.push({ minggu, bulan: bulanList[1], hari: perBulan.get(bulanList[1])!, laba: LABA_MINGGU[minggu] - awal });
    }
  }
  return segmen;
}


function buatHistoris(): Transaksi[] {
  const rand = mulberry32(20260506);
  const hasil: Transaksi[] = [];
  let urut = 0;
  const tambah = (tanggal: string, uraian: string, kategoriId: string, metode: Metode, nominal: number, arah: "masuk" | "keluar") => {
    if (nominal <= 0) return;
    urut += 1;
    hasil.push({
      id: `c-${tanggal.replaceAll("-", "")}-${urut}`,
      tanggal,
      uraian,
      arah,
      kategoriId,
      metode,
      nominal,
      sumber: "contoh",
      dikonfirmasiAt: `${tanggal}T20:00:00.000Z`,
    });
  };

  const semuaSegmen = susunSegmen();
  for (const [bulan, target] of Object.entries(TARGET_BULAN)) {
    const segmen = semuaSegmen.filter((s) => s.bulan === bulan);
    const hariTercatat = segmen.reduce((n, s) => n + s.hari.length, 0);
    const opsPerHari = target.operasional / hariTercatat;
    const rasioHpp = target.hpp / target.omzet;
    const labaBulan = target.omzet - target.hpp - target.operasional;
    const labaSegmen = segmen.reduce((n, s) => n + s.laba, 0);
    if (labaSegmen !== labaBulan) throw new Error(`Laba segmen ${bulan} (${labaSegmen}) ≠ target (${labaBulan})`);

    let sisaOmzet = target.omzet;
    let sisaHpp = target.hpp;
    segmen.forEach((s, index) => {
      const terakhir = index === segmen.length - 1;
      const ops = opsPerHari * s.hari.length;
      const omzet = terakhir ? sisaOmzet : bulatkan((s.laba + ops) / (1 - rasioHpp));
      const hpp = terakhir ? sisaHpp : bulatkan(omzet * rasioHpp);
      const operasional = omzet - hpp - s.laba;
      sisaOmzet -= omzet;
      sisaHpp -= hpp;
      if (operasional <= 0) throw new Error(`Biaya operasional segmen minggu ${s.minggu} tidak valid`);

      const bobotHari = s.hari.map((h) => FAKTOR_HARI[toDate(h).getUTCDay()] * (0.88 + rand() * 0.24));
      bagi(omzet, bobotHari).forEach((omzetHari, i) => {
        const h = s.hari[i];
        const adaMarketplace = toDate(h).getUTCDay() % 3 === 0;
        const bobot = adaMarketplace ? [0.45, 0.33, 0.22] : [0.55, 0.45];
        const [qris, tunai, mp] = bagi(omzetHari, bobot);
        tambah(h, "Penjualan QRIS harian", "penjualan", "QRIS", qris, "masuk");
        tambah(h, "Penjualan tunai di kios", "penjualan", "Tunai", tunai, "masuk");
        if (adaMarketplace) tambah(h, "Pesanan Shopee", "penjualan", "Marketplace", mp, "masuk");
      });

      const hariBelanja = s.hari.filter((_, i) => i % 2 === 0);
      const [bahan, kemasan] = bagi(hpp, [0.86, 0.14]);
      const bahanBaku = ["Beli singkong 30 kg", "Beli cabai merah & bawang", "Beli minyak goreng 2 jeriken", "Beli singkong & bumbu balado"];
      bagi(bahan, hariBelanja.map(() => 0.9 + rand() * 0.2)).forEach((nominal, i) =>
        tambah(hariBelanja[i], bahanBaku[(i + s.minggu) % bahanBaku.length], "bahan-baku", i % 2 === 0 ? "Tunai" : "Transfer", nominal, "keluar"),
      );
      tambah(s.hari[0], "Plastik & stiker kemasan", "kemasan", "Transfer", kemasan, "keluar");

      const pos: [string, string, Metode, number][] = [
        ["Upah bantu goreng", "gaji", "Tunai", 0.38],
        ["Isi ulang gas LPG", "gas-listrik", "Tunai", 0.3],
        ["Ongkir pesanan", "ongkir", "Transfer", 0.2],
        ["Pulsa & biaya admin QRIS", "admin", "QRIS", 0.12],
      ];
      const dipakai = s.hari.length >= 4 ? pos : pos.slice(0, 2);
      bagi(operasional, dipakai.map((p) => p[3])).forEach((nominal, i) => {
        const [uraian, kategori, metode] = dipakai[i];
        tambah(s.hari[Math.min(s.hari.length - 1, i * 2)], uraian, kategori, metode, nominal, "keluar");
      });
    });
    if (sisaOmzet !== 0 || sisaHpp !== 0) throw new Error(`Sisa omzet/HPP ${bulan} tidak nol`);

  }
  return hasil;
}


const TERBARU: [string, string, string, Metode, number, "masuk" | "keluar"][] = [
  ["2026-11-02", "Penjualan tunai di pasar", "penjualan", "Tunai", 1_250_000, "masuk"],
  ["2026-11-02", "Beli cabai merah 5 kg", "bahan-baku", "Tunai", 425_000, "keluar"],
  ["2026-11-03", "Penjualan QRIS harian", "penjualan", "QRIS", 980_000, "masuk"],
  ["2026-11-03", "Beli beras 10 kg", "bahan-baku", "Tunai", 145_000, "keluar"],
  ["2026-11-03", "Beli tepung terigu 25 kg", "bahan-baku", "Transfer", 287_500, "keluar"],
  ["2026-11-03", "Beli tepung terigu 25 kg", "bahan-baku", "Transfer", 287_500, "keluar"],
  ["2026-11-04", "Transfer dari Mas Rudi", "penjualan", "Transfer", 2_000_000, "masuk"],
  ["2026-11-04", "Pesanan Shopee", "penjualan", "Marketplace", 1_640_000, "masuk"],
  ["2026-11-04", "Bayar sekolah Dinda", "admin", "Transfer", 350_000, "keluar"],
  ["2026-11-05", "Beli kompor gas 2 tungku", "peralatan", "Transfer", 2_400_000, "keluar"],
  ["2026-11-05", "Isi ulang gas LPG 2 tabung", "gas-listrik", "Tunai", 420_000, "keluar"],
  ["2026-11-05", "Penjualan titip warung", "penjualan", "Tunai", 760_000, "masuk"],
  ["2026-11-06", "Standing pouch 500 pcs", "kemasan", "Transfer", 550_000, "keluar"],
  ["2026-11-06", "Penjualan QRIS harian", "penjualan", "QRIS", 1_120_000, "masuk"],
  ["2026-11-07", "Ongkir JNE pesanan Bukittinggi", "ongkir", "Transfer", 85_000, "keluar"],
];

function buatTerbaru(): Transaksi[] {
  return TERBARU.map(([tanggal, uraian, kategoriId, metode, nominal, arah], i) => ({
    id: `t-${String(i + 1).padStart(2, "0")}`,
    tanggal,
    uraian,
    arah,
    kategoriId,
    metode,
    nominal,
    sumber: "contoh",
    dikonfirmasiAt: `${HARI_INI_DEMO}T08:00:00.000Z`,
  }));
}

let cache: Transaksi[] | null = null;

export function transaksiDemo(): Transaksi[] {
  if (!cache) cache = [...buatHistoris(), ...buatTerbaru()].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  return cache;
}

export const AWAL_DATA_TIGA_BULAN = "2026-08-03";


export type ProdukLabel = {
  id: string;
  nama: string;
  mode: ModeLabel;
  data: DataLabel;
  teksLain: string;
  diperiksaPada: string | null;
};

export function produkDemo(): ProdukLabel {
  const data = dataLabelKosong();
  data.namaProduk = { nilai: "Keripik Balado Bu Sari", lokasi: "lain" };
  data.beratBersih = { nilai: "200 gr", lokasi: "lain" };
  data.asalUsul = { nilai: "", lokasi: "tidak_terlihat", tidakBerlaku: true };
  return {
    id: "6b1f4f0e-6c2b-4d0a-9a51-2a8e0c3d7f10",
    nama: "Keripik Balado 200 g",
    mode: "beredar",
    data,
    teksLain: "Keripik balado terenak se-Padang, 100% alami!",
    diperiksaPada: HARI_INI_DEMO,
  };
}
