import { z } from "zod";
import { bacaJson, denganKonteks, tanggal, uuid } from "@/lib/server/rute";


const skema = z.object({
  kunci: z.string().min(1).max(200),
  jenis: z.enum(["kemungkinan_pribadi", "pemasukan_bukan_penjualan", "duplikat", "nominal_tidak_biasa", "tanggal_bermasalah", "hari_belum_dicatat"]),
  alasan: z.string().min(1).max(2000),
  transaksiIds: z.array(uuid).max(10).default([]),
  rentang: z.object({ dari: tanggal, sampai: tanggal }).optional(),
  status: z.enum(["ditindak", "diabaikan"]),
  tindakan: z.string().max(60),
  hariLibur: z.array(tanggal).max(366).optional(),
});

export async function POST(request: Request) {
  return denganKonteks(async ({ user, businessId, db }) => {
    const f = await bacaJson(request, skema);
    await db.query(
      `INSERT INTO findings (business_id, kunci, jenis, transaction_id, transaksi_terkait, rentang_dari, rentang_sampai, alasan, status, tindakan, ditindak_at, ditindak_oleh)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), $11)
       ON CONFLICT (business_id, kunci) DO UPDATE SET status = EXCLUDED.status, tindakan = EXCLUDED.tindakan, ditindak_at = now(), ditindak_oleh = EXCLUDED.ditindak_oleh`,
      [businessId, f.kunci, f.jenis, f.transaksiIds?.[0] ?? null, f.transaksiIds ?? [], f.rentang?.dari ?? null, f.rentang?.sampai ?? null, f.alasan, f.status, f.tindakan, user.id],
    );
    for (const hari of f.hariLibur ?? []) {
      await db.query("INSERT INTO closed_days (business_id, tanggal, alasan) VALUES ($1, $2, 'Ditandai tutup/libur') ON CONFLICT DO NOTHING", [businessId, hari]);
    }
    return {};
  });
}
