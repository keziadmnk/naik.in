import { z } from "zod";
import { createServerAdapter } from "@/lib/data/server-adapter";
import { createId, createPublicCode } from "@/lib/data/ids";
import { asJsonValue } from "@/lib/data/types";

const reportSchema = z.object({
  businessId: z.string().min(1),
  isi: z.unknown(),
});

export async function POST(request: Request) {
  try {
    const parsed = reportSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Data laporan tidak valid." }, { status: 400 });
    const adapter = await createServerAdapter();
    const report = await adapter.reports.create({
      id: createId(),
      businessId: parsed.data.businessId,
      kodePublik: createPublicCode(),
      isi: asJsonValue(parsed.data.isi, "isi"),
    });
    return Response.json({ report }, { status: 201 });
  } catch {
    return Response.json({ error: "Laporan tidak dapat disimpan." }, { status: 500 });
  }
}
