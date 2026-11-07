import { badRequest, filePart, runRequest } from "@/lib/ai/http";

export async function POST(request: Request) {
  try {
    const inactive = process.env.GEMINI_API_KEY ? null : { ok: false, fallback: true, alasan: "AI belum aktif" };
    if (inactive) return Response.json(inactive);
    const form = await request.formData();
    const file = form.get("file");
    const task = form.get("task");
    if (!(file instanceof File) || !["ocr_cashbook", "ocr_nota", "ocr_pdf_mutasi"].includes(String(task))) return badRequest("Berkas dan jenis OCR wajib diisi.");
    return runRequest(request, task as "ocr_cashbook" | "ocr_nota" | "ocr_pdf_mutasi", [await filePart(file)]);
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Permintaan OCR tidak valid.");
  }
}
