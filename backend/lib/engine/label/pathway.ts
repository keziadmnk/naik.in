export type ProductType = "kering" | "keripik" | "abon" | "kue_kering" | "kembang_gula" | "emping" | "sambal_kering" | "minuman_serbuk" | "olahan_basah" | "beku" | "minuman" | "lain";
export type ProductionPlace = "rumah_tinggal" | "terpisah";
export type Equipment = "manual_semi_otomatis" | "otomatis";

export type PathwayInput = {
  productType: ProductType;
  frozen: boolean;
  packagedUht: boolean;
  mandatorySni: boolean;
  fortified: boolean;
  usesBtp: boolean;
  specialNutrition: boolean;
  productionPlace: ProductionPlace;
  equipment: Equipment;
  hasNib: boolean;
};

export type PathwayResult = {
  recommendation: "Kemungkinan wajib MD" | "Kemungkinan SPP-IRT (Dinkes kab/kota via OSS)" | "Tidak pasti, cek resmi";
  notes: string[];
  links: { label: string; href: string }[];
};

export function guidePermitPathway(input: PathwayInput): PathwayResult {
  const mandatoryMd = input.frozen || input.productType === "beku" || input.packagedUht || input.mandatorySni || input.fortified || input.usesBtp || input.specialNutrition;
  const lowRisk = ["kering", "keripik", "abon", "kue_kering", "kembang_gula", "emping", "sambal_kering", "minuman_serbuk"].includes(input.productType) && input.productionPlace === "rumah_tinggal" && input.equipment === "manual_semi_otomatis";
  return {
    recommendation: mandatoryMd ? "Kemungkinan wajib MD" : lowRisk ? "Kemungkinan SPP-IRT (Dinkes kab/kota via OSS)" : "Tidak pasti, cek resmi",
    notes: [
      "SPP-IRT hanya untuk pangan risiko rendah. Tidak ingin ribet? Produk risiko rendah tetap boleh mendaftar MD.",
      "Registrasi gratis untuk usaha mikro dan kecil.",
      input.hasNib ? "NIB tercatat pada jawaban kuesioner." : "NIB belum tercatat pada jawaban kuesioner.",
      "Jalur ini bersifat heuristik; cek persyaratan resmi sebelum mendaftar.",
    ],
    links: [
      { label: "Rumah Si-RiPO (Status Produk Pangan)", href: "https://rumahsiripo.pom.go.id/" },
      { label: "JPP Produsen BPOM", href: "https://ereg-rba.pom.go.id/front/jpprodusen" },
      { label: "Cek BPOM manual", href: "https://cekbpom.pom.go.id/" },
    ],
  };
}
