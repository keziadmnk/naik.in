import { beforeEach, describe, expect, it } from "vitest";
import { LocalAdapter } from "./local-adapter";

describe("LocalAdapter", () => {
  let adapter: LocalAdapter;

  beforeEach(() => {
    adapter = new LocalAdapter();
  });

  it("menyimpan dan membaca business", async () => {
    const business = await adapter.businesses.create({
      nama: "Bu Sari",
      kota: "Padang",
      jenisProduk: "Keripik balado",
      usiaUsahaBulan: 24,
      legalitas: {},
    });
    await expect(adapter.businesses.getById(business.id)).resolves.toEqual(business);
  });

  it("menyimpan laporan dengan kode publik delapan karakter dan membukanya kembali", async () => {
    const report = await adapter.reports.create({
      businessId: "business-local",
      kodePublik: "",
      isi: { status: "contoh" },
    });
    expect(report.kodePublik).toMatch(/^[A-Z0-9]{8}$/);
    await expect(adapter.reports.getByPublicCode(report.kodePublik)).resolves.toEqual(report);
  });

  it("memisahkan data antar jenis repository", async () => {
    await adapter.uploads.create({ businessId: "b-1", tipe: "label", path: "label/a.png", hash: "hash", status: "baru" });
    await adapter.analyses.create({ businessId: "b-1", jenis: "label", input: {}, hasil: { score: 50 }, keyakinan: null });
    const report = await adapter.reports.create({ businessId: "b-1", kodePublik: "ABCD2345", isi: {} });
    expect(report.businessId).toBe("b-1");
  });
});
