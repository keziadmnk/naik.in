// Pembantu rute API data aplikasi: sesi, usaha milik pengguna, validasi, dan galat.

import { cookies } from "next/headers";
import type { PoolClient } from "pg";
import { z } from "zod";
import { getLocalUser } from "@/lib/auth/local";
import { postgresPool as pool } from "@/lib/db/pool";

export type Pengguna = { id: string; email: string; name: string };
export type Konteks = { user: Pengguna; businessId: string | null; db: PoolClient };

export class GalatApi extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const uuid = z.string().uuid();
export const tanggal = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

async function penggunaDariSesi(): Promise<Pengguna> {
  const token = (await cookies()).get("naik_session")?.value;
  const user = await getLocalUser(token);
  if (!user) throw new GalatApi(401, "Sesi berakhir. Silakan masuk lagi.");
  return user;
}

export async function usahaMilik(db: PoolClient, userId: string): Promise<string | null> {
  const { rows } = await db.query<{ id: string }>("SELECT id FROM businesses WHERE owner_id = $1 ORDER BY dibuat LIMIT 1", [userId]);
  return rows[0]?.id ?? null;
}

/** Jalankan handler dalam satu transaksi database dengan konteks pengguna yang masuk. */
export async function denganKonteks<T>(handler: (k: Konteks) => Promise<T>, opsi: { butuhUsaha?: boolean } = { butuhUsaha: true }): Promise<Response> {
  try {
    const user = await penggunaDariSesi();
    const db = await pool.connect();
    try {
      await db.query("BEGIN");
      const businessId = await usahaMilik(db, user.id);
      if (opsi.butuhUsaha !== false && !businessId) throw new GalatApi(409, "Profil usaha belum dibuat. Selesaikan onboarding dulu.");
      const hasil = await handler({ user, businessId, db });
      await db.query("COMMIT");
      return Response.json({ ok: true, ...(hasil ?? {}) });
    } catch (e) {
      await db.query("ROLLBACK").catch(() => {});
      throw e;
    } finally {
      db.release();
    }
  } catch (e) {
    if (e instanceof GalatApi) return Response.json({ ok: false, message: e.message }, { status: e.status });
    if (e instanceof z.ZodError) return Response.json({ ok: false, message: "Data tidak valid.", rincian: e.issues.slice(0, 5) }, { status: 400 });
    const pesan = e instanceof Error ? e.message : "Galat tidak dikenal";
    console.error("[api/data]", pesan);
    return Response.json({ ok: false, message: "Gagal menyimpan ke database." }, { status: 500 });
  }
}

export async function bacaJson<T>(request: Request, skema: z.ZodType<T>): Promise<T> {
  let isi: unknown;
  try {
    isi = await request.json();
  } catch {
    throw new GalatApi(400, "Isi permintaan bukan JSON.");
  }
  return skema.parse(isi);
}

/** Cari id kategori dari kode (kategori sistem atau milik usaha). */
export async function idKategori(db: PoolClient, businessId: string, kode: string): Promise<{ id: string; arah: string }> {
  const { rows } = await db.query<{ id: string; arah: string }>(
    "SELECT id, arah FROM categories WHERE kode = $1 AND (business_id IS NULL OR business_id = $2) ORDER BY business_id NULLS LAST LIMIT 1",
    [kode, businessId],
  );
  if (!rows[0]) throw new GalatApi(400, `Kategori "${kode}" tidak dikenal.`);
  return rows[0];
}
