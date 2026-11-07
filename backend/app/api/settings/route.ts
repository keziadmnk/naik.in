import { z } from "zod";
import { bacaJson, denganKonteks } from "@/lib/server/rute";

// PUT /api/settings — pengaturan per pengguna: demo, Simulasi KUR, pengingat, biaya rutin, tur.
const skema = z.object({
  demo: z.object({ akunKosong: z.boolean().optional(), dataTigaBulan: z.boolean().optional(), modeOffline: z.boolean().optional() }).optional(),
  kur: z
    .object({
      cicilanLama: z.number().int().min(0).optional(),
      konservatif: z.boolean().optional(),
      kebutuhanRT: z.number().int().min(0).nullable().optional(),
    })
    .optional(),
  turSelesai: z.boolean().optional(),
  pengingat: z.object({ harian: z.boolean().optional(), jam: z.string().regex(/^\d{2}:\d{2}$/).optional(), mingguan: z.boolean().optional() }).optional(),
  biayaRutin: z
    .array(z.object({ nama: z.string().trim().min(1).max(120), jenis: z.enum(["usaha", "rumah_tangga"]), nominalBulanan: z.number().int().min(0) }))
    .max(50)
    .optional(),
});

export async function PUT(request: Request) {
  return denganKonteks(
    async ({ user, businessId, db }) => {
      const p = await bacaJson(request, skema);
      if (p.demo || p.kur || p.turSelesai !== undefined) {
        await db.query("INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING", [user.id]);
        // Akun kosong & data 3 bulan saling meniadakan
        const akunKosong = p.demo?.akunKosong;
        const tigaBulan = p.demo?.dataTigaBulan;
        await db.query(
          `UPDATE user_settings SET
             demo_akun_kosong = COALESCE($2, CASE WHEN $3 THEN false ELSE demo_akun_kosong END),
             demo_data_tiga_bulan = COALESCE($3, CASE WHEN $2 THEN false ELSE demo_data_tiga_bulan END),
             mode_offline = COALESCE($4, mode_offline),
             kur_cicilan_lama = COALESCE($5, kur_cicilan_lama),
             kur_konservatif = COALESCE($6, kur_konservatif),
             kur_kebutuhan_rt = CASE WHEN $7 THEN $8 ELSE kur_kebutuhan_rt END,
             tur_selesai = COALESCE($9, tur_selesai),
             diubah = now()
           WHERE user_id = $1`,
          [
            user.id, akunKosong ?? null, tigaBulan ?? null, p.demo?.modeOffline ?? null,
            p.kur?.cicilanLama ?? null, p.kur?.konservatif ?? null, p.kur ? "kebutuhanRT" in p.kur : false, p.kur?.kebutuhanRT ?? null,
            p.turSelesai ?? null,
          ],
        );
      }
      if (businessId && p.pengingat) {
        if (p.pengingat.harian !== undefined || p.pengingat.jam)
          await db.query(
            `INSERT INTO reminders (business_id, jenis, jam, aktif) VALUES ($1, 'catat_harian', COALESCE($2::time, '20:00'), COALESCE($3, true))
             ON CONFLICT (business_id, jenis) DO UPDATE SET jam = COALESCE($2::time, reminders.jam), aktif = COALESCE($3, reminders.aktif)`,
            [businessId, p.pengingat.jam ?? null, p.pengingat.harian ?? null],
          );
        if (p.pengingat.mingguan !== undefined)
          await db.query(
            `INSERT INTO reminders (business_id, jenis, jam, aktif) VALUES ($1, 'ringkasan_mingguan', '08:00', $2)
             ON CONFLICT (business_id, jenis) DO UPDATE SET aktif = $2`,
            [businessId, p.pengingat.mingguan],
          );
      }
      if (businessId && p.biayaRutin) {
        await db.query("DELETE FROM recurring_costs WHERE business_id = $1", [businessId]);
        for (const [i, b] of p.biayaRutin.entries())
          await db.query("INSERT INTO recurring_costs (business_id, nama, jenis, nominal_bulanan, urutan) VALUES ($1, $2, $3, $4, $5)", [
            businessId, b.nama, b.jenis, b.nominalBulanan, i,
          ]);
      }
      return {};
    },
    { butuhUsaha: false },
  );
}
