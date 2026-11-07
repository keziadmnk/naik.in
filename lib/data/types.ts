export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export type Business = {
  id: string;
  nama: string;
  kota: string;
  jenisProduk: string;
  usiaUsahaBulan: number;
  legalitas: JsonValue;
  dibuat: string;
};

export type UploadType = "qris" | "cashbook" | "nota" | "label" | "pdf";

export type Upload = {
  id: string;
  businessId: string;
  tipe: UploadType;
  path: string;
  hash: string;
  status: string;
  dibuat: string;
};

export type AnalysisType = "finance" | "label";

export type Analysis = {
  id: string;
  businessId: string;
  jenis: AnalysisType;
  input: JsonValue;
  hasil: JsonValue;
  keyakinan: number | null;
  dibuat: string;
};

export type Report = {
  id: string;
  businessId: string;
  kodePublik: string;
  isi: JsonValue;
  dibuat: string;
};

export type AiCacheEntry = {
  key: string;
  value: JsonValue;
  dibuat: string;
};

export interface Repository {
  businesses: {
    create(input: Omit<Business, "id" | "dibuat"> & { id?: string; dibuat?: string }): Promise<Business>;
    getById(id: string): Promise<Business | null>;
  };
  uploads: {
    create(input: Omit<Upload, "id" | "dibuat"> & { id?: string; dibuat?: string }): Promise<Upload>;
  };
  analyses: {
    create(input: Omit<Analysis, "id" | "dibuat"> & { id?: string; dibuat?: string }): Promise<Analysis>;
  };
  reports: {
    create(input: Omit<Report, "id" | "dibuat"> & { id?: string; dibuat?: string }): Promise<Report>;
    getByPublicCode(kodePublik: string): Promise<Report | null>;
  };
  aiCache: {
    get(key: string): Promise<JsonValue | null>;
    set(key: string, value: JsonValue): Promise<void>;
  };
}

export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") return true;
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).every(isJsonValue);
  return false;
}

export function asJsonValue(value: unknown, fieldName: string): JsonValue {
  if (!isJsonValue(value)) throw new Error(`${fieldName} harus berupa JSON yang valid.`);
  return value;
}
