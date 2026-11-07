import { z } from "zod";
import { bacaJson, denganKonteks, GalatApi, idKategori, tanggal, uuid } from "@/lib/server/rute";

type Params = { params: Promise<{ id: string }> };

const skemaUbah = z
  .object({
    tanggal: tanggal.optional(),
    uraian: z.string().trim().min(1).max(500).optional(),
    kategoriId: z.string().min(1).optional(),
    metode: z.enum(["Tunai", "QRIS", "Transfer", "Marketplace"]).optional(),
    nominal: z.number().int().positive().optional(),
  })
  .strict();

export async function PATCH(request: Request, { params }: Params) {
  return denganKonteks(async ({ businessId, db }) => {
    const id = uuid.parse((await params).id);
    const p = await bacaJson(request, skemaUbah);
    const { rows: [t] } = await db.query("SELECT arah FROM transactions WHERE id = $1 AND business_id = $2 AND dihapus_at IS NULL", [id, businessId]);
    if (!t) throw new GalatApi(404, "Transaksi tidak ditemukan.");
    const set: string[] = [];
    const nilai: unknown[] = [];
    const tambah = (kolom: string, v: unknown) => {
      nilai.push(v);
      set.push(`${kolom} = $${nilai.length}`);
    };
    if (p.kategoriId) {
      const k = await idKategori(db, businessId!, p.kategoriId);
      if (k.arah !== t.arah) throw new GalatApi(400, "Kategori tidak cocok dengan arah transaksi.");
      tambah("category_id", k.id);
    }
    if (p.tanggal) tambah("tanggal", p.tanggal);
    if (p.uraian) tambah("uraian", p.uraian);
    if (p.metode) tambah("metode", p.metode);
    if (p.nominal) tambah("nominal", p.nominal);
    if (!set.length) return { diubah: 0 };
    nilai.push(id, businessId);
    await db.query(`UPDATE transactions SET ${set.join(", ")} WHERE id = $${nilai.length - 1} AND business_id = $${nilai.length}`, nilai);
    return { diubah: 1 };
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  return denganKonteks(async ({ businessId, db }) => {
    const id = uuid.parse((await params).id);
    const { rowCount } = await db.query("UPDATE transactions SET dihapus_at = now() WHERE id = $1 AND business_id = $2 AND dihapus_at IS NULL", [id, businessId]);
    if (!rowCount) throw new GalatApi(404, "Transaksi tidak ditemukan.");
    return { dihapus: 1 };
  });
}
