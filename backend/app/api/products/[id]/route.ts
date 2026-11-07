import { z } from "zod";
import { bacaJson, denganKonteks, GalatApi, uuid } from "@/lib/server/rute";

type Params = { params: Promise<{ id: string }> };

const lokasi = z.enum(["utama", "lain", "tidak_terlihat"]);
const isian = z.object({ nilai: z.string().max(1000), lokasi, tidakBerlaku: z.boolean().optional() });
const KUNCI = ["namaProduk", "daftarBahan", "beratBersih", "produsen", "halal", "kodeProduksi", "kedaluwarsa", "nomorIzin", "asalUsul"] as const;

const skema = z.object({
  nama: z.string().trim().min(1).max(150),
  // Diisi bila pengguna menekan "Konfirmasi & hitung skor": satu baris label_checks baru.
  pemeriksaan: z
    .object({
      mode: z.enum(["draf", "beredar"]),
      isian: z.object(Object.fromEntries(KUNCI.map((k) => [k, isian])) as Record<(typeof KUNCI)[number], typeof isian>),
      teksLain: z.string().max(2000),
      skor: z.number().min(0).max(100),
      kategori: z.enum(["Lengkap", "Hampir lengkap", "Perlu dilengkapi"]),
      rincian: z.array(z.record(z.string(), z.unknown())).max(9),
      klaim: z.array(z.record(z.string(), z.unknown())).max(20),
      sumberIsian: z.enum(["manual", "ai_dikonfirmasi"]).default("manual"),
    })
    .optional(),
});

// PUT /api/products/:id — buat/ubah produk; sertakan `pemeriksaan` untuk menyimpan hasil cek label.
export async function PUT(request: Request, { params }: Params) {
  return denganKonteks(async ({ user, businessId, db }) => {
    const id = uuid.parse((await params).id);
    const p = await bacaJson(request, skema);
    const { rows: [ada] } = await db.query("SELECT business_id FROM products WHERE id = $1", [id]);
    if (ada && ada.business_id !== businessId) throw new GalatApi(404, "Produk tidak ditemukan.");
    if (ada) await db.query("UPDATE products SET nama = $2, dihapus_at = NULL WHERE id = $1", [id, p.nama]);
    else await db.query("INSERT INTO products (id, business_id, nama) VALUES ($1, $2, $3)", [id, businessId, p.nama]);
    if (p.pemeriksaan) {
      const c = p.pemeriksaan;
      await db.query(
        `INSERT INTO label_checks (product_id, mode, isian, teks_lain, sumber_isian, skor, kategori, rincian, klaim, dikonfirmasi_at, dikonfirmasi_oleh)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), $10)`,
        [id, c.mode, JSON.stringify(c.isian), c.teksLain, c.sumberIsian, Math.round(c.skor * 100) / 100, c.kategori, JSON.stringify(c.rincian), JSON.stringify(c.klaim), user.id],
      );
    }
    return {};
  });
}

// DELETE /api/products/:id — hapus lunak (riwayat pemeriksaan tetap ada)
export async function DELETE(_request: Request, { params }: Params) {
  return denganKonteks(async ({ businessId, db }) => {
    const id = uuid.parse((await params).id);
    await db.query("UPDATE products SET dihapus_at = now() WHERE id = $1 AND business_id = $2", [id, businessId]);
    return {};
  });
}
