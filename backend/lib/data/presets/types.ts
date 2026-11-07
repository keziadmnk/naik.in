import type { JsonValue } from "../types";

export type PresetId = "bu-sari" | "uni-dewi";

export type PresetTransaction = {
  id: string;
  tanggal: string;
  uraian: string;
  kategori: "Pemasukan usaha" | "HPP" | "Opex tetap" | "Opex variabel" | "Pribadi/rumah tangga";
  nominal: number;
  arah: "masuk" | "keluar";
};

export type LabelCache = {
  sample: "A" | "B";
  fields: JsonValue;
  notes: string[];
};

export type AiCache = {
  insight: JsonValue;
  labelFix: JsonValue;
};

export type DemoPreset = {
  id: PresetId;
  name: "Bu Sari" | "Uni Dewi";
  business: {
    id: string;
    nama: string;
    kota: string;
    jenisProduk: string;
    usiaUsahaBulan: number;
    legalitas: JsonValue;
    dibuat: string;
  };
  transactions: PresetTransaction[];
  costs: {
    kebutuhanRtMin: number;
    cicilanLama: number;
    biayaTetap: Record<string, number>;
  };
  label: LabelCache;
  ai: AiCache;
  stressTargetMonthly: number;
};
