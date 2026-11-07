import { z } from "zod";
import { handleJsonTask } from "@/lib/ai/route-json";

const inputSchema = z.object({ angka: z.record(z.string(), z.number()), konteks: z.string().optional() });
export async function POST(request: Request) {
  return handleJsonTask(request, "insight", inputSchema);
}
