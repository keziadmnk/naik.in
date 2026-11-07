import { z } from "zod";
import { bacaJson, denganKonteks, GalatApi, uuid } from "@/lib/server/rute";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/loan-simulations/:id — { diLaporan: true } menjadikannya satu-satunya simulasi di laporan.
export async function PATCH(request: Request, { params }: Params) {
  return denganKonteks(async ({ businessId, db }) => {
    const id = uuid.parse((await params).id);
    const { diLaporan } = await bacaJson(request, z.object({ diLaporan: z.boolean() }));
    if (diLaporan) await db.query("UPDATE loan_simulations SET di_laporan = false WHERE business_id = $1", [businessId]);
    const { rowCount } = await db.query("UPDATE loan_simulations SET di_laporan = $3 WHERE id = $1 AND business_id = $2", [id, businessId, diLaporan]);
    if (!rowCount) throw new GalatApi(404, "Simulasi tidak ditemukan.");
    return {};
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  return denganKonteks(async ({ businessId, db }) => {
    const id = uuid.parse((await params).id);
    await db.query("DELETE FROM loan_simulations WHERE id = $1 AND business_id = $2", [id, businessId]);
    return {};
  });
}
