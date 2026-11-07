import { z } from "zod";

const confidence = z.number().min(0).max(1);

export const taskSchemas = {
  ocr_cashbook: z.object({
    rows: z.array(z.object({
      tanggal: z.string().nullable(),
      uraian: z.string().nullable(),
      masuk: z.number().nullable(),
      keluar: z.number().nullable(),
      confidence,
      raw: z.string().nullable(),
    })),
  }),
  ocr_nota: z.object({
    supplier: z.string().nullable(),
    tanggal: z.string().nullable(),
    items: z.array(z.object({ nama: z.string().nullable(), jumlah: z.number().nullable(), harga: z.number().nullable() })),
    total: z.number().nullable(),
    confidence,
  }),
  ocr_pdf_mutasi: z.object({
    rows: z.array(z.object({ tanggal: z.string().nullable(), nominal: z.number().nullable(), ref: z.string().nullable() })),
  }),
  classify: z.array(z.object({
    id: z.string(),
    kategori: z.string().nullable(),
    confidence,
    alasan: z.string().nullable(),
  })),
  label_scan: z.object({
    fields: z.record(z.string(), z.object({
      value: z.string().nullable(),
      found: z.boolean(),
      lokasi: z.enum(["utama", "lain", "tidak_terlihat"]),
      confidence,
    })),
    kualitas_gambar: z.object({
      resolusi_cukup: z.boolean(),
      buram: z.boolean(),
      silau: z.boolean(),
    }),
  }),
  insight: z.object({
    ringkasan: z.string(),
    risiko: z.array(z.string()),
    saran: z.array(z.string()),
  }),
  label_fix: z.object({
    label_belakang: z.string(),
    deskripsi_marketplace: z.string(),
    placeholder: z.array(z.string()),
  }),
} as const;

export type AiTask = keyof typeof taskSchemas;
export type AiTaskOutput<T extends AiTask> = z.infer<(typeof taskSchemas)[T]>;

export type AiResult<T> =
  | { ok: true; fallback: false; data: T; cached: boolean }
  | { ok: false; fallback: true; alasan: string };

export type AiInputPart = {
  text?: string;
  inlineData?: { mimeType: string; data: string };
};
