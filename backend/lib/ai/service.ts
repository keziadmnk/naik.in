import { createHash } from "node:crypto";
import { createServerAdapter } from "../data/server-adapter";
import { asJsonValue } from "../data/types";
import { batasWaktuPerModel, createGeminiClient, pesanGalatAi, type GeminiClient } from "./client";
import { taskPrompts } from "./prompts";
import { taskSchemas, type AiInputPart, type AiResult, type AiTask, type AiTaskOutput } from "./schemas";

const MAX_PARALLEL = 2;
const RETRY_COUNT = 1;
const RETRY_BASE_MS = 250;
let activeCalls = 0;
const waiters: Array<() => void> = [];

async function acquire(): Promise<void> {
  if (activeCalls < MAX_PARALLEL) {
    activeCalls += 1;
    return;
  }
  await new Promise<void>((resolve) => waiters.push(resolve));
  activeCalls += 1;
}

function release(): void {
  activeCalls -= 1;
  waiters.shift()?.();
}

function isRateLimitError(error: unknown): boolean {
  return error instanceof Error && (error.message.includes("429") || error.message.toLowerCase().includes("rate limit"));
}

function inputBytes(parts: AiInputPart[]): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(parts));
}

async function hashInput(task: AiTask, parts: AiInputPart[]): Promise<string> {
  return createHash("sha256")
    .update(task)
    .update(taskPrompts[task])
    .update(process.env.GEMINI_MODEL ?? "")
    .update(inputBytes(parts))
    .digest("hex");
}

async function callWithTimeout(client: GeminiClient, task: AiTask, parts: AiInputPart[]): Promise<string> {
  const total = batasWaktuPerModel(task) * 2 + 10_000;
  return Promise.race([
    client.generate(task, parts),
    new Promise<string>((_, reject) => setTimeout(() => reject(new Error(`AI timeout setelah ${Math.round(total / 1000)} detik.`)), total)),
  ]);
}

export async function runAiTask<T extends AiTask>(task: T, parts: AiInputPart[], client: GeminiClient | null = createGeminiClient()): Promise<AiResult<AiTaskOutput<T>>> {
  if (!client) return { ok: false, fallback: true, alasan: "AI belum aktif" };
  const cache = (await createServerAdapter()).aiCache;
  const key = await hashInput(task, parts);
  const cached = await cache.get(key);
  if (cached) {
    const parsed = taskSchemas[task].safeParse(cached);
    if (parsed.success) return { ok: true, fallback: false, data: parsed.data as AiTaskOutput<T>, cached: true };
  }
  await acquire();
  try {
    let lastError: unknown = new Error("Validasi keluaran AI gagal.");
    for (let attempt = 0; attempt <= RETRY_COUNT; attempt += 1) {
      try {
        const raw = await callWithTimeout(client, task, parts);
        const parsedJson: unknown = JSON.parse(raw);
        const parsed = taskSchemas[task].safeParse(parsedJson);
        if (!parsed.success) {
          lastError = new Error("Skema keluaran AI tidak sesuai.");
          continue;
        }
        await cache.set(key, asJsonValue(parsed.data, "hasil AI"));
        return { ok: true, fallback: false, data: parsed.data as AiTaskOutput<T>, cached: false };
      } catch (error) {
        lastError = error;
        if (!isRateLimitError(error) || attempt === RETRY_COUNT) break;
        await new Promise((resolve) => setTimeout(resolve, RETRY_BASE_MS * 2 ** attempt));
      }
    }
    return { ok: false, fallback: true, alasan: pesanGalatAi(lastError) };
  } finally {
    release();
  }
}

export { taskPrompts };
