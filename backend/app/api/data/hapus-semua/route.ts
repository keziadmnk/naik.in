import { z } from "zod";
import { bacaJson, denganKonteks } from "@/lib/server/rute";

export async function POST(request: Request) {
  return denganKonteks(async ({ businessId, db }) => {
    await bacaJson(request, z.object({ konfirmasi: z.literal("HAPUS") }));
    const { rowCount } = await db.query("UPDATE transactions SET dihapus_at = now() WHERE business_id = $1 AND dihapus_at IS NULL", [businessId]);
    await db.query("DELETE FROM findings WHERE business_id = $1", [businessId]);
    await db.query("DELETE FROM closed_days WHERE business_id = $1", [businessId]);
    await db.query("DELETE FROM ai_summaries WHERE business_id = $1", [businessId]);
    return { transaksiDihapus: rowCount };
  });
}
