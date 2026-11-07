import { badRequest, filePart, runRequest } from "@/lib/ai/http";
import type { AiInputPart } from "@/lib/ai/schemas";

export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) return Response.json({ ok: false, fallback: true, alasan: "AI belum aktif" });
  try {
    const form = await request.formData();
    const depan = form.get("depan") ?? form.get("file");
    const belakang = form.get("belakang");
    const parts: AiInputPart[] = [];
    if (depan instanceof File) parts.push({ text: "Foto sisi DEPAN kemasan (bagian utama label, location MAIN_PANEL):" }, await filePart(depan));
    if (belakang instanceof File) parts.push({ text: "Foto sisi BELAKANG/SAMPING kemasan (bukan bagian utama, location OTHER):" }, await filePart(belakang));
    if (!parts.length) return badRequest("Foto kemasan wajib diisi.");
    return runRequest(request, "label_scan", parts);
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Permintaan scan label tidak valid.");
  }
}
