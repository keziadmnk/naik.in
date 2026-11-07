import { createServerAdapter } from "@/lib/data/server-adapter";
import { PUBLIC_REPORT_CODE_LENGTH } from "@/lib/config/thresholds";

export async function GET(_request: Request, context: { params: Promise<{ kode: string }> }) {
  const { kode } = await context.params;
  if (kode.length !== PUBLIC_REPORT_CODE_LENGTH || !/^[A-Z0-9]+$/.test(kode)) return Response.json({ error: "Kode laporan tidak valid." }, { status: 400 });
  try {
    const report = await (await createServerAdapter()).reports.getByPublicCode(kode);
    if (!report) return Response.json({ error: "Laporan tidak ditemukan." }, { status: 404 });
    return Response.json({ report });
  } catch {
    return Response.json({ error: "Laporan tidak dapat dibuka." }, { status: 500 });
  }
}
