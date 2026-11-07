import { beforeEach, describe, expect, it, vi } from "vitest";
import { runAiTask } from "./service";
import type { GeminiClient } from "./client";

describe("AI service", () => {
  beforeEach(() => {
    vi.stubEnv("GEMINI_API_KEY", "mock-key");
    vi.stubEnv("GEMINI_MODEL", "mock-model");
  });

  it("menerima keluaran mock yang sesuai skema", async () => {
    const client: GeminiClient = { generate: vi.fn().mockResolvedValue(JSON.stringify({ ringkasan: "Omzet Rp10", risiko: [], saran: [] })) };
    const result = await runAiTask("insight", [{ text: '{"omzet":10000000}' }], client);
    expect(result).toMatchObject({ ok: true, fallback: false, cached: false });
  });

  it("mengembalikan fallback saat skema salah setelah retry validasi", async () => {
    const client: GeminiClient = { generate: vi.fn().mockResolvedValue(JSON.stringify({ ringkasan: 10 })) };
    const result = await runAiTask("insight", [{ text: "angka" }], client);
    expect(result).toMatchObject({ ok: false, fallback: true });
    expect(client.generate).toHaveBeenCalledTimes(2);
  });

  it("mencoba ulang satu kali saat 429 lalu berhasil", async () => {
    const client: GeminiClient = { generate: vi.fn().mockRejectedValueOnce(new Error("429 rate limit")).mockResolvedValue(JSON.stringify({ ringkasan: "Sama", risiko: [], saran: [] })) };
    const result = await runAiTask("insight", [{ text: "retry-case" }], client);
    expect(result).toMatchObject({ ok: true, fallback: false });
    expect(client.generate).toHaveBeenCalledTimes(2);
  });

  it("mengembalikan fallback saat kunci kosong", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const client: GeminiClient = { generate: vi.fn() };
    const result = await runAiTask("insight", [{ text: "no-key" }], null);
    expect(result).toEqual({ ok: false, fallback: true, alasan: "AI belum aktif" });
    expect(client.generate).not.toHaveBeenCalled();
  });
});
