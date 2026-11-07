import { z } from "zod";
import { badRequest, runRequest } from "./http";
import type { AiInputPart, AiTask } from "./schemas";

export async function handleJsonTask(request: Request, task: AiTask, schema: z.ZodType<unknown>): Promise<Response> {
  if (!process.env.GEMINI_API_KEY) return Response.json({ ok: false, fallback: true, alasan: "AI belum aktif" });
  try {
    const input: unknown = await request.json();
    const parsed = schema.safeParse(input);
    if (!parsed.success) return badRequest("Input tugas AI tidak valid.");
    const parts: AiInputPart[] = [{ text: JSON.stringify(parsed.data) }];
    return runRequest(request, task, parts);
  } catch {
    return badRequest("JSON permintaan tidak valid.");
  }
}
