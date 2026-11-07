import { GoogleGenAI } from "@google/genai";
import { taskPrompts, temperatureFor } from "./prompts";
import type { AiInputPart, AiTask } from "./schemas";

export interface GeminiClient {
  generate(task: AiTask, parts: AiInputPart[]): Promise<string>;
}

type JsonSchema = Record<string, unknown>;

const responseSchemas: Record<AiTask, JsonSchema> = {
  ocr_cashbook: { type: "OBJECT", properties: { rows: { type: "ARRAY", items: { type: "OBJECT", properties: { tanggal: { type: "STRING", nullable: true }, uraian: { type: "STRING", nullable: true }, masuk: { type: "NUMBER", nullable: true }, keluar: { type: "NUMBER", nullable: true }, confidence: { type: "NUMBER" }, raw: { type: "STRING", nullable: true } }, required: ["tanggal", "uraian", "masuk", "keluar", "confidence", "raw"] } } }, required: ["rows"] },
  ocr_nota: { type: "OBJECT", properties: { supplier: { type: "STRING", nullable: true }, tanggal: { type: "STRING", nullable: true }, items: { type: "ARRAY", items: { type: "OBJECT", properties: { nama: { type: "STRING", nullable: true }, jumlah: { type: "NUMBER", nullable: true }, harga: { type: "NUMBER", nullable: true } }, required: ["nama", "jumlah", "harga"] } }, total: { type: "NUMBER", nullable: true }, confidence: { type: "NUMBER" } }, required: ["supplier", "tanggal", "items", "total", "confidence"] },
  ocr_pdf_mutasi: { type: "OBJECT", properties: { rows: { type: "ARRAY", items: { type: "OBJECT", properties: { tanggal: { type: "STRING", nullable: true }, nominal: { type: "NUMBER", nullable: true }, ref: { type: "STRING", nullable: true } }, required: ["tanggal", "nominal", "ref"] } } }, required: ["rows"] },
  classify: { type: "ARRAY", items: { type: "OBJECT", properties: { id: { type: "STRING" }, kategori: { type: "STRING", nullable: true }, confidence: { type: "NUMBER" }, alasan: { type: "STRING", nullable: true } }, required: ["id", "kategori", "confidence", "alasan"] } },
  label_scan: { type: "OBJECT", properties: { fields: { type: "OBJECT", additionalProperties: { type: "OBJECT", properties: { value: { type: "STRING", nullable: true }, found: { type: "BOOLEAN" }, lokasi: { type: "STRING", enum: ["utama", "lain", "tidak_terlihat"] }, confidence: { type: "NUMBER" } }, required: ["value", "found", "lokasi", "confidence"] } }, kualitas_gambar: { type: "OBJECT", properties: { resolusi_cukup: { type: "BOOLEAN" }, buram: { type: "BOOLEAN" }, silau: { type: "BOOLEAN" } }, required: ["resolusi_cukup", "buram", "silau"] } }, required: ["fields", "kualitas_gambar"] },
  insight: { type: "OBJECT", properties: { ringkasan: { type: "STRING" }, risiko: { type: "ARRAY", items: { type: "STRING" } }, saran: { type: "ARRAY", items: { type: "STRING" } } }, required: ["ringkasan", "risiko", "saran"] },
  label_fix: { type: "OBJECT", properties: { label_belakang: { type: "STRING" }, deskripsi_marketplace: { type: "STRING" }, placeholder: { type: "ARRAY", items: { type: "STRING" } } }, required: ["label_belakang", "deskripsi_marketplace", "placeholder"] },
};

export class GoogleGeminiClient implements GeminiClient {
  private readonly client: GoogleGenAI;
  private readonly model: string;

  constructor(apiKey: string, model = "gemini-2.5-flash") {
    this.client = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  async generate(task: AiTask, parts: AiInputPart[]): Promise<string> {
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: [{ role: "user", parts: [{ text: taskPrompts[task] }, ...parts] }],
      config: {
        temperature: temperatureFor(task),
        responseMimeType: "application/json",
        responseSchema: responseSchemas[task],
      },
    });
    if (!response.text) throw new Error("Respons AI kosong.");
    return response.text;
  }
}

export function createGeminiClient(): GeminiClient | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  return new GoogleGeminiClient(key, process.env.GEMINI_MODEL || "gemini-2.5-flash");
}
