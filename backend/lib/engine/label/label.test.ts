import { describe, expect, it } from "vitest";
import { findProhibitedClaims } from "./claims";
import { guidePermitPathway } from "./pathway";
import { scoreLabel } from "./score";
import { validateExpiryLabel, validateNetWeight, validatePermitNumber, validateProducerAddress } from "./validators";

describe("skor label", () => {
  const completeItems = ([
    "productNameAndBrand", "ingredients", "netWeight", "producer", "halal", "productionDateAndCode", "expiry", "distributionPermit", "ingredientOrigin",
  ] as const).map((key) => ({ key, found: true, location: "utama" as const, formatValid: true }));

  it("mengeluarkan nomor izin pada mode draf", () => {
    const result = scoreLabel(completeItems, "draf");
    expect(result.score).toBe(100);
    expect(result.items.find((item) => item.key === "distributionPermit")?.status).toBe("N/A");
    expect(result.draftNote).toContain("nomor izin");
  });

  it("memberi setengah poin untuk item di bagian lain", () => {
    const result = scoreLabel([{ key: "productNameAndBrand", found: true, location: "lain" }], "beredar");
    expect(result.items[0].status).toBe("Ada tapi kurang");
    expect(result.score).toBe(50);
  });
});

describe("validator label", () => {
  it("memeriksa nomor izin aktif, lama, dan SP", () => {
    expect(validatePermitNumber("BPOM RI MD 123456789012345").valid).toBe(true);
    expect(validatePermitNumber("PIRT 123456789012345").valid).toBe(true);
    expect(validatePermitNumber("P-IRT 123456789012").warning).toBe("format_lama");
    expect(validatePermitNumber("SP").warning).toBe("bukan_izin_edar");
  });

  it("memvalidasi kedaluwarsa, alamat, dan berat", () => {
    expect(validateExpiryLabel("Baik digunakan sebelum 12/12/2027").valid).toBe(true);
    expect(validateProducerAddress("Jalan Mawar, Padang 25111, Indonesia", "Padang").valid).toBe(true);
    expect(validateNetWeight("250 g").valid).toBe(true);
  });
});

describe("klaim dan jalur izin", () => {
  it("mengembalikan kutipan dan saran klaim", () => {
    const findings = findProhibitedClaims("Keripik terbaik dan alami, tanpa BTP.");
    expect(findings.length).toBe(3);
    expect(findings[0].suggestion).toBeTruthy();
    expect(findings[0].note).toBe("Periksa ke BPOM.");
  });

  it("mengarahkan produk beku ke MD", () => {
    expect(guidePermitPathway({
      productType: "beku", frozen: true, packagedUht: false, mandatorySni: false, fortified: false, usesBtp: false, specialNutrition: false,
      productionPlace: "rumah_tinggal", equipment: "manual_semi_otomatis", hasNib: false,
    }).recommendation).toBe("Kemungkinan wajib MD");
  });
});
