import { z } from "zod";
import { bacaJson, denganKonteks, tanggal, uuid } from "@/lib/server/rute";

const rp = z.number().finite();
const skema = z.object({
  id: uuid,
  jendelaDari: tanggal,
  jendelaSampai: tanggal,
  mingguValid: z.number().int().min(0).max(26),
  labaRata: rp,
  labaStress: rp,
  labaTerburuk: rp,
  kebutuhanRT: rp.min(0),
  cicilanLama: rp.min(0),
  plafon: z.number().int().min(5_000_000).max(50_000_000),
  tenor: z.union([z.literal(12), z.literal(24), z.literal(36)]),
  bungaTahunan: z.number().min(0).max(1),
  jenisKur: z.enum(["KUR Super Mikro", "KUR Mikro"]),
  konservatif: z.boolean(),
  cicilan: rp,
  batasAman: rp,
  batasHatiHati: rp,
  rasioRata: z.number().nullable(),
  sisaRata: rp,
  sisaStress: rp,
  status: z.enum(["hijau", "kuning", "merah"]),
  targetCadangan: rp.nullable(),
  setoranCadangan: rp.nullable(),
  peluangBulanSulit: z.number().min(0).max(1),
  npl: z.number().min(0).max(1),
  seed: z.number().int(),
  jumlahSimulasi: z.number().int().positive(),
  penjelasan: z.string().max(4000).nullable(),
  penjelasanSumber: z.enum(["ai", "templat"]).nullable(),
  tindakan: z.array(z.record(z.string(), z.unknown())).max(20),
  diLaporan: z.boolean(),
});

const r = (n: number | null) => (n === null ? null : Math.round(n));

export async function POST(request: Request) {
  return denganKonteks(async ({ businessId, db }) => {
    const s = await bacaJson(request, skema);
    if (s.diLaporan) await db.query("UPDATE loan_simulations SET di_laporan = false WHERE business_id = $1", [businessId]);
    await db.query(
      `INSERT INTO loan_simulations (
         id, business_id, jendela_dari, jendela_sampai, minggu_valid, laba_rata, laba_stress, laba_terburuk, kebutuhan_rt, cicilan_lama,
         plafon, tenor, bunga_tahunan, jenis_kur, mode_konservatif, cicilan_baru, batas_aman, batas_hati_hati, rasio_rata, sisa_rata, sisa_stress,
         status, target_cadangan, setoran_cadangan, peluang_bulan_sulit, npl_indikatif, seed_simulasi, jumlah_simulasi,
         penjelasan, penjelasan_sumber, tindakan, di_laporan)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32)`,
      [
        s.id, businessId, s.jendelaDari, s.jendelaSampai, s.mingguValid, r(s.labaRata), r(s.labaStress), r(s.labaTerburuk), r(s.kebutuhanRT), r(s.cicilanLama),
        s.plafon, s.tenor, s.bungaTahunan, s.jenisKur, s.konservatif, r(s.cicilan), r(s.batasAman), r(s.batasHatiHati), s.rasioRata, r(s.sisaRata), r(s.sisaStress),
        s.status, r(s.targetCadangan), r(s.setoranCadangan), s.peluangBulanSulit, s.npl, s.seed, s.jumlahSimulasi,
        s.penjelasan, s.penjelasanSumber, JSON.stringify(s.tindakan), s.diLaporan,
      ],
    );
    return {};
  });
}
