import { z } from "zod";

const confidence = z.number().min(0).max(1);

export const KATEGORI_AI = ["penjualan", "pemasukan-lain", "bahan-baku", "kemasan", "gas-listrik", "sewa", "gaji", "ongkir", "peralatan", "admin"] as const;
export const METODE_AI = ["TUNAI", "QRIS", "TRANSFER", "MARKETPLACE"] as const;
export const ARAH_AI = ["IN", "OUT", "SETTLEMENT"] as const;
export const JENIS_DOKUMEN_AI = ["CASHBOOK", "RECEIPT", "QRIS_MUTATION"] as const;
export const KOLOM_AI = ["date", "description", "amount", "direction", "category"] as const;

const dokumenKeuangan = z.object({
  document_type: z.enum(JENIS_DOKUMEN_AI),
  image_quality: z.object({ readable: z.boolean(), problem: z.string().nullable() }),
  schema_gap_report: z.object({
    original_columns_found: z.array(z.string()),
    missing_columns_auto_filled: z.array(z.string()),
    extra_columns_detected: z.array(z.string()),
    incomplete_rows_count: z.number().int().min(0),
    settlement_rows_filtered: z.number().int().min(0),
    summary_message: z.string(),
  }),
  written_totals: z.object({
    opening_balance: z.number().nullable(),
    total_in: z.number().nullable(),
    total_out: z.number().nullable(),
    closing_balance: z.number().nullable(),
  }),
  transactions: z.array(z.object({
    row_index: z.number().int(),
    transaction_date: z.string().nullable(),
    transaction_time: z.string().nullable(),
    raw_text: z.string().nullable(),
    description: z.string(),
    direction: z.enum(ARAH_AI),
    amount: z.number().nullable(),
    balance_after: z.number().nullable(),
    payment_method: z.enum(METODE_AI),
    category: z.string(),
    is_unclear: z.boolean(),
    confidence,
    review_note: z.string().nullable(),
    field_issues: z.array(z.object({
      field: z.enum(KOLOM_AI),
      problem: z.string(),
      suggestion: z.string().nullable(),
    })),
  })),
});

export const ITEM_LABEL_AI = [
  "product_name_and_brand", "ingredients_list", "net_weight", "manufacturer_address", "halal_info",
  "production_code", "expiry_date", "registration_number", "special_ingredient_origin",
] as const;

const itemLabel = z.object({
  found: z.boolean(),
  raw_text: z.string().nullable(),
  location: z.enum(["MAIN_PANEL", "OTHER", "NOT_VISIBLE"]),
  status_hint: z.enum(["FULL", "PARTIAL", "MISSING", "UNREADABLE", "NOT_APPLICABLE"]),
  confidence,
  note: z.string(),
});

export const taskSchemas = {
  ocr_cashbook: dokumenKeuangan,
  ocr_nota: dokumenKeuangan,
  ocr_pdf_mutasi: dokumenKeuangan,
  classify: z.array(z.object({
    id: z.string(),
    kategori: z.string().nullable(),
    confidence,
    alasan: z.string().nullable(),
  })),
  label_scan: z.object({
    executive_summary: z.array(z.string()),
    extracted_items: z.object(Object.fromEntries(ITEM_LABEL_AI.map((k) => [k, itemLabel])) as Record<(typeof ITEM_LABEL_AI)[number], typeof itemLabel>),
    additional_retail_checks: z.object({
      has_nutrition_facts_ing: z.boolean(),
      has_bpom_2d_barcode: z.boolean(),
      has_gs1_retail_barcode: z.boolean(),
      has_allergen_warning: z.boolean(),
    }),
    prohibited_claims_detected: z.array(z.object({
      quoted_text: z.string(),
      violation_reason: z.string(),
      suggested_replacement: z.string(),
    })),
  }),
  insight: z.object({
    ringkasan: z.string(),
    risiko: z.array(z.string()),
    saran: z.array(z.string()),
  }),
  label_fix: z.object({
    label_depan: z.string(),
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
