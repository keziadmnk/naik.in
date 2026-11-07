import { z } from "zod";
import { bacaJson, denganKonteks, GalatApi, idKategori, tanggal, uuid } from "@/lib/server/rute";


const skema = z.object({
  sumber: z.enum(["manual", "unggah_file", "scan_foto"]),
  namaFile: z.string().max(255).optional(),
  transaksi: z
    .array(
      z.object({
        id: uuid,
        tanggal,
        uraian: z.string().trim().min(1).max(500),
        arah: z.enum(["masuk", "keluar"]),
        kategoriId: z.string().min(1),
        metode: z.enum(["Tunai", "QRIS", "Transfer", "Marketplace"]),
        nominal: z.number().int().positive(),
      }),
    )
    .min(1)
    .max(2000),
});

const TIPE: Record<string, string> = { csv: "csv", xlsx: "xlsx", pdf: "pdf", jpg: "jpg", jpeg: "jpg", png: "png" };

export async function POST(request: Request) {
  return denganKonteks(async ({ user, businessId, db }) => {
    const data = await bacaJson(request, skema);
    const tanggalList = data.transaksi.map((t) => t.tanggal).sort();
    const ext = data.namaFile?.split(".").pop()?.toLowerCase() ?? "";
    const { rows: [batch] } = await db.query(
      `INSERT INTO import_batches (business_id, sumber, nama_file, tipe_file, status, rentang_dari, rentang_sampai, jumlah_baris, dikonfirmasi_at)
       VALUES ($1, $2, $3, $4, 'dikonfirmasi', $5, $6, $7, now()) RETURNING id`,
      [businessId, data.sumber, data.namaFile ?? null, TIPE[ext] ?? null, tanggalList[0], tanggalList[tanggalList.length - 1], data.transaksi.length],
    );
    for (const t of data.transaksi) {
      const kategori = await idKategori(db, businessId!, t.kategoriId);
      if (kategori.arah !== t.arah) throw new GalatApi(400, `Kategori "${t.kategoriId}" tidak cocok untuk uang ${t.arah}.`);
      await db.query(
        `INSERT INTO transactions (id, business_id, tanggal, uraian, arah, category_id, metode, nominal, sumber, import_batch_id, dikonfirmasi_at, dikonfirmasi_oleh)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), $11)`,
        [t.id, businessId, t.tanggal, t.uraian, t.arah, kategori.id, t.metode, t.nominal, data.sumber, batch.id, user.id],
      );
    }
    return { disimpan: data.transaksi.length, batchId: batch.id };
  });
}
