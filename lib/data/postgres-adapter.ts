import { createId, createPublicCode, nowIso } from "./ids";
import type { Analysis, Business, JsonValue, Report, Repository, Upload } from "./types";
import { postgresPool } from "../db/pool";

export class PostgresAdapter implements Repository {
  businesses = {
    create: async (input: Parameters<Repository["businesses"]["create"]>[0]): Promise<Business> => {
      const result = await postgresPool.query<Business>(
        "INSERT INTO businesses (id, nama, kota, jenis_produk, usia_usaha_bln, legalitas, dibuat, owner_id) VALUES ($1,$2,$3,$4,$5,$6,$7,(SELECT id FROM users ORDER BY created_at LIMIT 1)) RETURNING id,nama,kota,jenis_produk AS \"jenisProduk\",usia_usaha_bln AS \"usiaUsahaBulan\",legalitas,dibuat",
        [input.id ?? createId(), input.nama, input.kota, input.jenisProduk, input.usiaUsahaBulan, input.legalitas, input.dibuat ?? nowIso()],
      );
      return result.rows[0];
    },
    getById: async (id: string) => {
      const result = await postgresPool.query<Business>(
        "SELECT id,nama,kota,jenis_produk AS \"jenisProduk\",usia_usaha_bln AS \"usiaUsahaBulan\",legalitas,dibuat FROM businesses WHERE id=$1",
        [id],
      );
      return result.rows[0] ?? null;
    },
  };

  uploads = {
    create: async (input: Parameters<Repository["uploads"]["create"]>[0]): Promise<Upload> => {
      const result = await postgresPool.query<Upload>(
        "INSERT INTO uploads (id,business_id,tipe,path,hash,status,dibuat) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id,business_id AS \"businessId\",tipe,path,hash,status,dibuat",
        [input.id ?? createId(), input.businessId, input.tipe, input.path, input.hash, input.status, input.dibuat ?? nowIso()],
      );
      return result.rows[0];
    },
  };

  analyses = {
    create: async (input: Parameters<Repository["analyses"]["create"]>[0]): Promise<Analysis> => {
      const result = await postgresPool.query<Analysis>(
        "INSERT INTO analyses (id,business_id,jenis,input,hasil,keyakinan,dibuat) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id,business_id AS \"businessId\",jenis,input,hasil,keyakinan,dibuat",
        [input.id ?? createId(), input.businessId, input.jenis, input.input, input.hasil, input.keyakinan, input.dibuat ?? nowIso()],
      );
      return result.rows[0];
    },
  };

  reports = {
    create: async (input: Parameters<Repository["reports"]["create"]>[0]): Promise<Report> => {
      const result = await postgresPool.query<Report>(
        "INSERT INTO reports (id,business_id,kode_publik,isi,dibuat) VALUES ($1,$2,$3,$4,$5) RETURNING id,business_id AS \"businessId\",kode_publik AS \"kodePublik\",isi,dibuat",
        [input.id ?? createId(), input.businessId, input.kodePublik || createPublicCode(), input.isi, input.dibuat ?? nowIso()],
      );
      return result.rows[0];
    },
    getByPublicCode: async (code: string) => {
      const result = await postgresPool.query<Report>(
        "SELECT id,business_id AS \"businessId\",kode_publik AS \"kodePublik\",isi,dibuat FROM reports WHERE kode_publik=$1",
        [code],
      );
      return result.rows[0] ?? null;
    },
  };

  aiCache = {
    get: async (): Promise<JsonValue | null> => null,
    set: async (): Promise<void> => undefined,
  };
}
