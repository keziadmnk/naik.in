import { z } from "zod";
import { bacaJson, denganKonteks, tanggal } from "@/lib/server/rute";

// POST /api/ai-summaries — simpan ringkasan analisis keuangan yang ditampilkan (AI atau templat).
const skema = z.object({
  periodeDari: tanggal,
  periodeSampai: tanggal,
  jumlahTransaksi: z.number().int().min(0),
  angka: z.record(z.string(), z.number()),
  poin: z.array(z.string().max(1000)).min(1).max(8),
  sumber: z.enum(["ai", "templat"]),
});

export async function POST(request: Request) {
  return denganKonteks(async ({ businessId, db }) => {
    const s = await bacaJson(request, skema);
    await db.query(
      "INSERT INTO ai_summaries (business_id, periode_dari, periode_sampai, jumlah_transaksi, angka, poin, sumber) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [businessId, s.periodeDari, s.periodeSampai, s.jumlahTransaksi, JSON.stringify(s.angka), s.poin, s.sumber],
    );
    return {};
  });
}
