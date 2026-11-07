import type { AiInputPart, AiTask } from "./schemas";
import { createGeminiClient } from "./client";
import { runAiTask } from "./service";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;
const rateBuckets = new Map<string, { started: number; count: number }>();
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf", "text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]);

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.started >= WINDOW_MS) {
    rateBuckets.set(ip, { started: now, count: 1 });
    return true;
  }
  if (bucket.count >= MAX_REQUESTS_PER_WINDOW) return false;
  bucket.count += 1;
  return true;
}

export function fallbackIfInactive(): Response | null {
  return process.env.GEMINI_API_KEY ? null : Response.json({ ok: false, fallback: true, alasan: "AI belum aktif" });
}

export async function filePart(file: File): Promise<AiInputPart> {
  if (!allowedTypes.has(file.type)) throw new Error("Tipe berkas tidak didukung.");
  if (file.size > MAX_FILE_BYTES) throw new Error("Ukuran berkas melebihi 8 MB.");
  return { inlineData: { mimeType: file.type, data: Buffer.from(await file.arrayBuffer()).toString("base64") } };
}

export async function runRequest<T extends AiTask>(request: Request, task: T, parts: AiInputPart[]): Promise<Response> {
  const inactive = fallbackIfInactive();
  if (inactive) return inactive;
  if (!checkRateLimit(clientIp(request))) return Response.json({ ok: false, fallback: true, alasan: "Terlalu banyak permintaan. Coba lagi sebentar." }, { status: 429 });
  const result = await runAiTask(task, parts, createGeminiClient());
  return Response.json(result, { status: result.ok ? 200 : 200 });
}

export function badRequest(message: string): Response {
  return Response.json({ ok: false, fallback: true, alasan: message }, { status: 400 });
}
