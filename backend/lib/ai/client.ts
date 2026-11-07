import { GoogleGenAI, MediaResolution } from "@google/genai";
import { taskPrompts, temperatureFor } from "./prompts";
import { ARAH_AI, ITEM_LABEL_AI, JENIS_DOKUMEN_AI, KATEGORI_AI, KOLOM_AI, METODE_AI, type AiInputPart, type AiTask } from "./schemas";

export interface GeminiClient {
  generate(task: AiTask, parts: AiInputPart[]): Promise<string>;
}

type JsonSchema = Record<string, unknown>;

const STR = { type: "STRING" };
const STR_NULL = { type: "STRING", nullable: true };
const NUM = { type: "NUMBER" };
const BOOL = { type: "BOOLEAN" };
const daftar = (items: JsonSchema) => ({ type: "ARRAY", items });
const objek = (properties: Record<string, JsonSchema>) => ({ type: "OBJECT", properties, required: Object.keys(properties) });

const skemaDokumenKeuangan = objek({
  document_type: { type: "STRING", enum: [...JENIS_DOKUMEN_AI] },
  image_quality: objek({ readable: BOOL, problem: STR_NULL }),
  schema_gap_report: objek({
    original_columns_found: daftar(STR),
    missing_columns_auto_filled: daftar(STR),
    extra_columns_detected: daftar(STR),
    incomplete_rows_count: { type: "INTEGER" },
    settlement_rows_filtered: { type: "INTEGER" },
    summary_message: STR,
  }),
  written_totals: objek({
    opening_balance: { type: "NUMBER", nullable: true },
    total_in: { type: "NUMBER", nullable: true },
    total_out: { type: "NUMBER", nullable: true },
    closing_balance: { type: "NUMBER", nullable: true },
  }),
  transactions: daftar(objek({
    row_index: { type: "INTEGER" },
    transaction_date: STR_NULL,
    transaction_time: STR_NULL,
    raw_text: STR_NULL,
    description: STR,
    direction: { type: "STRING", enum: [...ARAH_AI] },
    amount: { type: "NUMBER", nullable: true },
    balance_after: { type: "NUMBER", nullable: true },
    payment_method: { type: "STRING", enum: [...METODE_AI] },
    category: { type: "STRING", enum: [...KATEGORI_AI] },
    is_unclear: BOOL,
    confidence: NUM,
    review_note: STR_NULL,
    field_issues: daftar(objek({ field: { type: "STRING", enum: [...KOLOM_AI] }, problem: STR, suggestion: STR_NULL })),
  })),
});

const skemaItemLabel = objek({
  found: BOOL,
  raw_text: STR_NULL,
  location: { type: "STRING", enum: ["MAIN_PANEL", "OTHER", "NOT_VISIBLE"] },
  status_hint: { type: "STRING", enum: ["FULL", "PARTIAL", "MISSING", "UNREADABLE", "NOT_APPLICABLE"] },
  confidence: NUM,
  note: STR,
});

const responseSchemas: Record<AiTask, JsonSchema> = {
  ocr_cashbook: skemaDokumenKeuangan,
  ocr_nota: skemaDokumenKeuangan,
  ocr_pdf_mutasi: skemaDokumenKeuangan,
  classify: daftar(objek({ id: STR, kategori: STR_NULL, confidence: NUM, alasan: STR_NULL })),
  label_scan: objek({
    executive_summary: daftar(STR),
    extracted_items: objek(Object.fromEntries(ITEM_LABEL_AI.map((k) => [k, skemaItemLabel]))),
    additional_retail_checks: objek({ has_nutrition_facts_ing: BOOL, has_bpom_2d_barcode: BOOL, has_gs1_retail_barcode: BOOL, has_allergen_warning: BOOL }),
    prohibited_claims_detected: daftar(objek({ quoted_text: STR, violation_reason: STR, suggested_replacement: STR })),
  }),
  insight: objek({ ringkasan: STR, risiko: daftar(STR), saran: daftar(STR) }),
  label_fix: objek({ label_depan: STR, label_belakang: STR, deskripsi_marketplace: STR, placeholder: daftar(STR) }),
};

const BACA_GAMBAR = new Set<AiTask>(["ocr_cashbook", "ocr_nota", "ocr_pdf_mutasi", "label_scan"]);

export function batasWaktuPerModel(task: AiTask): number {
  if (task === "ocr_cashbook" || task === "ocr_nota" || task === "ocr_pdf_mutasi") return 75_000;
  if (task === "label_scan") return 50_000;
  return 25_000;
}

export const MODEL_BAWAAN = "gemini-3.5-flash";
export const MODEL_CADANGAN_BAWAAN = "gemini-3.7-flash,gemini-3.8-flash,gemini-3.5-flash-lite,gemini-3.1-flash-lite";

const JEDA_PUTARAN_ULANG_MS = 2_500;

const kodeGalat = (error: unknown) => {
  const pesan = error instanceof Error ? error.message : String(error);
  if (/\b429\b|RESOURCE_EXHAUSTED|quota/i.test(pesan)) return "kuota";
  if (/\b503\b|UNAVAILABLE|high demand|overloaded/i.test(pesan)) return "sibuk";
  if (/timeout/i.test(pesan)) return "lambat";
  if (/\b404\b|NOT_FOUND|no longer available/i.test(pesan)) return "tidak_ada";
  return "lain";
};

export function pesanGalatAi(error: unknown): string {
  switch (kodeGalat(error)) {
    case "kuota":
      return "kuota AI harian sudah habis — paket gratis Gemini dibatasi per model per hari. Coba lagi besok, atau aktifkan billing di Google AI Studio";
    case "sibuk":
      return "server AI Google sedang sibuk. Coba lagi beberapa saat lagi";
    case "lambat":
      return "AI terlalu lama merespons. Coba lagi, atau gunakan foto yang lebih jelas";
    case "tidak_ada":
      return "model AI tidak tersedia. Periksa GEMINI_MODEL di file .env";
    default:
      return error instanceof Error && error.message.length < 160 ? error.message : "AI sedang bermasalah. Coba lagi beberapa saat lagi";
  }
}

export function bolehPindahModel(error: unknown): boolean {
  const pesan = error instanceof Error ? error.message : String(error);
  return /\b(503|429|404)\b|UNAVAILABLE|RESOURCE_EXHAUSTED|NOT_FOUND|high demand|overloaded|no longer available|timeout/i.test(pesan);
}

export class GoogleGeminiClient implements GeminiClient {
  private readonly client: GoogleGenAI;
  private readonly models: string[];

  constructor(apiKey: string, model = MODEL_BAWAAN, cadangan: string[] = [MODEL_CADANGAN_BAWAAN]) {
    this.client = new GoogleGenAI({ apiKey });
    this.models = [...new Set([model, ...cadangan].filter(Boolean))];
  }

  async generate(task: AiTask, parts: AiInputPart[]): Promise<string> {
    let galat: unknown = new Error("Tidak ada model AI yang dikonfigurasi.");
    const kuotaHabis = new Set<string>();
    for (let putaran = 0; putaran < 2; putaran += 1) {
      const daftar = this.models.filter((m) => !kuotaHabis.has(m));
      if (!daftar.length) break;
      if (putaran > 0) await new Promise((r) => setTimeout(r, JEDA_PUTARAN_ULANG_MS));
      for (const model of daftar) {
        try {
          return await this.coba(model, task, parts);
        } catch (error) {
          galat = error;
          if (!bolehPindahModel(error)) throw error;
          if (kodeGalat(error) === "kuota" || kodeGalat(error) === "tidak_ada") kuotaHabis.add(model);
        }
      }
    }
    throw galat;
  }

  private async coba(model: string, task: AiTask, parts: AiInputPart[]): Promise<string> {
    const batas = batasWaktuPerModel(task);
    const response = await Promise.race([
      this.client.models.generateContent({
        model,
        contents: [{ role: "user", parts }],
        config: {
          systemInstruction: taskPrompts[task],
          temperature: temperatureFor(task),
          responseMimeType: "application/json",
          responseSchema: responseSchemas[task],
          ...(BACA_GAMBAR.has(task)
            ? {
                mediaResolution: MediaResolution.MEDIA_RESOLUTION_HIGH,
                maxOutputTokens: 65_536,
              }
            : {}),
        },
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`AI timeout setelah ${batas / 1000} detik (${model}).`)), batas)),
    ]);
    if (!response.text) throw new Error("Respons AI kosong.");
    return response.text;
  }
}

export function createGeminiClient(): GeminiClient | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const cadangan = (process.env.GEMINI_MODEL_CADANGAN || MODEL_CADANGAN_BAWAAN).split(",").map((m) => m.trim());
  return new GoogleGeminiClient(key, process.env.GEMINI_MODEL || MODEL_BAWAAN, cadangan);
}
