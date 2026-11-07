import { createGeminiClient } from "@/lib/ai/client";
import { badRequest, checkRateLimit, clientIp, filePart } from "@/lib/ai/http";
import type { AiInputPart, AiTaskOutput } from "@/lib/ai/schemas";
import { runAiTask } from "@/lib/ai/service";
import { instruksiBacaUlang, skorMasalah, tandaiBarisTidakCocok, verifikasiKas, type HasilVerifikasi } from "@/lib/ai/verifikasi-kas";

const TUGAS_OCR = ["ocr_cashbook", "ocr_nota", "ocr_pdf_mutasi"] as const;
type TugasOcr = (typeof TUGAS_OCR)[number];
type Dokumen = AiTaskOutput<"ocr_cashbook">;

const MAKS_TEKS_TABEL = 60_000;

async function bagianDokumen(file: File): Promise<AiInputPart> {
  if (file.type === "text/csv" || file.type === "text/plain" || /\.(csv|txt)$/i.test(file.name)) {
    const teks = (await file.text()).slice(0, MAKS_TEKS_TABEL);
    return { text: `Isi file tabel "${file.name}" (baris dipisah enter, kolom dipisah koma/titik koma/tab):\n${teks}` };
  }
  return filePart(file);
}

function periksa(data: Dokumen): { data: Dokumen; verifikasi: HasilVerifikasi } {
  const verifikasi = verifikasiKas(data.transactions, data.written_totals);
  return { data: { ...data, transactions: tandaiBarisTidakCocok(data.transactions, verifikasi) }, verifikasi };
}

export async function POST(request: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) return Response.json({ ok: false, fallback: true, alasan: "AI belum aktif" });
    if (!checkRateLimit(clientIp(request))) return Response.json({ ok: false, fallback: true, alasan: "Terlalu banyak permintaan. Coba lagi sebentar." }, { status: 429 });
    const form = await request.formData();
    const file = form.get("file");
    const task = String(form.get("task")) as TugasOcr;
    if (!(file instanceof File) || !TUGAS_OCR.includes(task)) return badRequest("Berkas dan jenis OCR wajib diisi.");
    const kiriman = String(form.get("hariIni") ?? "");
    const hariIni = /^\d{4}-\d{2}-\d{2}$/.test(kiriman) ? kiriman : new Date().toISOString().slice(0, 10);
    const parts: AiInputPart[] = [{ text: `Tanggal hari ini: ${hariIni}.` }, await bagianDokumen(file)];

    const client = createGeminiClient();
    const pertama = await runAiTask(task, parts, client);
    if (!pertama.ok) return Response.json(pertama);
    let terbaik = periksa(pertama.data);
    let dibacaUlang = false;

    if (skorMasalah(terbaik.verifikasi) > 0) {
      const ulang = await runAiTask(task, [...parts, { text: instruksiBacaUlang(terbaik.verifikasi) }], client);
      if (ulang.ok) {
        dibacaUlang = true;
        const kedua = periksa(ulang.data);
        if (skorMasalah(kedua.verifikasi) < skorMasalah(terbaik.verifikasi)) terbaik = kedua;
      }
    }

    const v = terbaik.verifikasi;
    const totalTidakCocok = v.total_masuk_cocok === false || v.total_keluar_cocok === false || v.saldo_akhir_cocok === false;
    const tidakTerbaca = !terbaik.data.image_quality.readable;
    const peringatan = tidakTerbaca
      ? `Foto sulit dibaca${terbaik.data.image_quality.problem ? ` (${terbaik.data.image_quality.problem})` : ""}. Sebaiknya foto ulang lebih dekat, terang, dan tajam.`
      : totalTidakCocok
        ? "Jumlah hasil baca tidak sama dengan total/saldo yang tertulis di dokumen. Cocokkan setiap baris dengan foto sebelum menyimpan."
        : null;
    let data = terbaik.data;
    if (peringatan)
      data = {
        ...data,
        transactions: data.transactions.map((t) => ({
          ...t,
          is_unclear: true,
          confidence: Math.min(t.confidence, 0.6),
          review_note: t.review_note ?? (tidakTerbaca ? "Foto sulit dibaca — cocokkan dengan dokumen asli." : "Total dokumen tidak cocok — cocokkan baris ini dengan foto."),
          field_issues: t.field_issues.some((f) => f.field === "amount")
            ? t.field_issues
            : [...t.field_issues, { field: "amount" as const, problem: tidakTerbaca ? "Foto sulit dibaca" : "Total dokumen tidak cocok", suggestion: null }],
        })),
      };

    return Response.json({
      ok: true,
      fallback: false,
      cached: pertama.cached,
      data: { ...data, verification: { ...v, dibaca_ulang: dibacaUlang, peringatan } },
    });
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Permintaan OCR tidak valid.");
  }
}
