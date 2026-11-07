import { z } from "zod";
import { handleJsonTask } from "@/lib/ai/route-json";

const inputSchema = z.object({ rows: z.array(z.object({ id: z.string(), uraian: z.string(), arah: z.string(), nominal: z.number() })) });
export async function POST(request: Request) {
  return handleJsonTask(request, "classify", inputSchema);
}
