import { badRequest, filePart, runRequest } from "@/lib/ai/http";

export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) return Response.json({ ok: false, fallback: true, alasan: "AI belum aktif" });
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return badRequest("Berkas label wajib diisi.");
    return runRequest(request, "label_scan", [await filePart(file)]);
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Permintaan scan label tidak valid.");
  }
}
