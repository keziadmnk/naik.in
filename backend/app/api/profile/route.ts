import { z } from "zod";
import { bacaJson, denganKonteks, GalatApi, tanggal } from "@/lib/server/rute";

// PUT /api/profile — data akun & profil usaha. Membuat usaha baru bila belum ada (onboarding).
const skema = z.object({
  namaPemilik: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().optional(),
  telepon: z.string().trim().max(30).optional(),
  namaUsaha: z.string().trim().min(1).max(150).optional(),
  kategoriUsaha: z.string().trim().min(1).max(60).optional(),
  kota: z.string().trim().max(80).optional(),
  // "" = belum diisi
  mulaiUsaha: tanggal.or(z.literal("").transform(() => undefined)).optional(),
});

export async function PUT(request: Request) {
  return denganKonteks(
    async ({ user, businessId, db }) => {
      const p = await bacaJson(request, skema);
      if (p.namaPemilik || p.email || p.telepon !== undefined) {
        try {
          await db.query("UPDATE users SET name = COALESCE($2, name), email = COALESCE($3, email), phone = COALESCE($4, phone) WHERE id = $1", [
            user.id, p.namaPemilik ?? null, p.email?.toLowerCase() ?? null, p.telepon ?? null,
          ]);
        } catch (e) {
          if (e instanceof Error && e.message.includes("users_email_key")) throw new GalatApi(409, "Email sudah dipakai akun lain.");
          throw e;
        }
      }
      const adaUsaha = p.namaUsaha || p.kategoriUsaha || p.kota !== undefined || p.mulaiUsaha;
      if (!adaUsaha) return {};
      if (!businessId) {
        if (!p.namaUsaha) throw new GalatApi(400, "Nama usaha wajib diisi.");
        await db.query(
          `INSERT INTO businesses (owner_id, nama, kota, kategori_usaha, mulai_usaha, onboarding_selesai_at) VALUES ($1, $2, $3, $4, $5, now())`,
          [user.id, p.namaUsaha, p.kota ?? "", p.kategoriUsaha ?? "Makanan & Minuman", p.mulaiUsaha ?? null],
        );
        return { usahaDibuat: true };
      }
      await db.query(
        `UPDATE businesses SET nama = COALESCE($2, nama), kota = COALESCE($3, kota), kategori_usaha = COALESCE($4, kategori_usaha),
                mulai_usaha = COALESCE($5, mulai_usaha), diubah = now() WHERE id = $1`,
        [businessId, p.namaUsaha ?? null, p.kota ?? null, p.kategoriUsaha ?? null, p.mulaiUsaha ?? null],
      );
      return {};
    },
    { butuhUsaha: false },
  );
}
