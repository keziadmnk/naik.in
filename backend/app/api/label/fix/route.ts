import { z } from "zod";
import { handleJsonTask } from "@/lib/ai/route-json";

const inputSchema = z.object({ label: z.record(z.string(), z.unknown()), konteks: z.string().optional() });
export async function POST(request: Request) {
  return handleJsonTask(request, "label_fix", inputSchema);
}
