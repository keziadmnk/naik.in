import { z } from "zod";
import { bacaJson, denganKonteks, GalatApi } from "@/lib/server/rute";

const skema = z.object({
  id: z.string().regex(/^k-[\w-]{4,80}$/),
  nama: z.string().trim().min(1).max(80),
  arah: z.enum(["masuk", "keluar"]),
  kelompok: z.enum(["penjualan", "pemasukan_lain", "hpp", "operasional"]),
  tetap: z.boolean().optional(),
});

export async function POST(request: Request) {
  return denganKonteks(async ({ businessId, db }) => {
    const k = await bacaJson(request, skema);
    await db.query(
      `INSERT INTO categories (business_id, kode, nama, arah, kelompok, tetap) VALUES ($1, $2, $3, $4, $5, $6)`,
      [businessId, k.id, k.nama, k.arah, k.kelompok, Boolean(k.tetap && k.kelompok === "operasional")],
    );
    return {};
  });
}

export async function DELETE(request: Request) {
  return denganKonteks(async ({ businessId, db }) => {
    const kode = new URL(request.url).searchParams.get("kode") ?? "";
    const { rows: [k] } = await db.query("SELECT id FROM categories WHERE business_id = $1 AND kode = $2", [businessId, kode]);
    if (!k) throw new GalatApi(404, "Kategori tidak ditemukan.");
    const { rows: [pakai] } = await db.query("SELECT COUNT(*)::int AS n FROM transactions WHERE category_id = $1 AND dihapus_at IS NULL", [k.id]);
    if (pakai.n > 0) await db.query("UPDATE categories SET aktif = false WHERE id = $1", [k.id]);
    else await db.query("DELETE FROM categories WHERE id = $1", [k.id]);
    return {};
  });
}
