import { describe, expect, it } from "vitest";
import { bolehPindahModel, pesanGalatAi } from "./client";

describe("pesan galat AI untuk pengguna", () => {
  it("503 / model sibuk → pesan sibuk, bukan JSON mentah", () => {
    const e = new Error('{"error":{"code":503,"message":"This model is currently experiencing high demand.","status":"UNAVAILABLE"}}');
    expect(pesanGalatAi(e)).toMatch(/sedang sibuk/);
    expect(pesanGalatAi(e)).not.toMatch(/\{/);
    expect(bolehPindahModel(e)).toBe(true);
  });

  it("429 / kuota harian habis → jelaskan kuota paket gratis", () => {
    const e = new Error('{"error":{"code":429,"message":"You exceeded your current quota","status":"RESOURCE_EXHAUSTED"}}');
    expect(pesanGalatAi(e)).toMatch(/kuota AI harian/);
    expect(bolehPindahModel(e)).toBe(true);
  });

  it("timeout → sarankan coba lagi", () => {
    expect(pesanGalatAi(new Error("AI timeout setelah 50 detik (gemini-3.5-flash)."))).toMatch(/terlalu lama/);
  });
});
