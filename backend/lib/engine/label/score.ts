import {
  LABEL_CHECKLIST_WEIGHTS,
  LABEL_CIRCULATING_MODE,
  LABEL_DRAFT_MODE,
  LABEL_HALF_SCORE,
  LABEL_LOCATION_MAIN,
  LABEL_LOCATION_NOT_VISIBLE,
  LABEL_LOCATION_OTHER,
  LABEL_MAIN_LOCATION_REQUIRED,
} from "../../config/thresholds";
import { validateExpiryLabel, validateNetWeight, validatePermitNumber, validateProducerAddress } from "./validators";

export type LabelMode = typeof LABEL_DRAFT_MODE | typeof LABEL_CIRCULATING_MODE;
export type LabelLocation = typeof LABEL_LOCATION_MAIN | typeof LABEL_LOCATION_OTHER | typeof LABEL_LOCATION_NOT_VISIBLE;
export type LabelItemStatus = "Sesuai" | "Ada tapi kurang" | "Tidak ada" | "N/A";
export type LabelChecklistKey = keyof typeof LABEL_CHECKLIST_WEIGHTS;

export type LabelChecklistItem = {
  key: LabelChecklistKey;
  found: boolean;
  location: LabelLocation;
  formatValid?: boolean;
  notApplicable?: boolean;
};

export type LabelScoreItem = LabelChecklistItem & { status: LabelItemStatus; points: number; weight: number };

function itemStatus(item: LabelChecklistItem): LabelItemStatus {
  if (item.notApplicable) return "N/A";
  if (item.key === "distributionPermit" && item.location === LABEL_LOCATION_NOT_VISIBLE) return "Tidak ada";
  if (!item.found) return "Tidak ada";
  if (item.location === LABEL_LOCATION_OTHER || item.formatValid === false || (LABEL_MAIN_LOCATION_REQUIRED.includes(item.key as (typeof LABEL_MAIN_LOCATION_REQUIRED)[number]) && item.location !== LABEL_LOCATION_MAIN)) return "Ada tapi kurang";
  return "Sesuai";
}

export function scoreLabel(items: LabelChecklistItem[], mode: LabelMode): { score: number; applicableWeight: number; items: LabelScoreItem[]; draftNote?: string } {
  const scored = items.map((item) => {
    const weight = LABEL_CHECKLIST_WEIGHTS[item.key];
    const excluded = mode === LABEL_DRAFT_MODE && item.key === "distributionPermit";
    const status = excluded ? "N/A" : itemStatus(item);
    const points = status === "Sesuai" ? weight : status === "Ada tapi kurang" ? weight * LABEL_HALF_SCORE : 0;
    return { ...item, status, points, weight };
  });
  const applicableWeight = scored.filter((item) => item.status !== "N/A").reduce((sum, item) => sum + item.weight, 0);
  const score = applicableWeight === 0 ? 0 : scored.reduce((sum, item) => sum + item.points, 0) / applicableWeight * 100;
  return { score, applicableWeight, items: scored, ...(mode === LABEL_DRAFT_MODE ? { draftNote: "Sisakan ruang untuk nomor izin dan 2D barcode." } : {}) };
}

export type LabelFieldSnapshot = {
  nama?: string;
  merek?: string;
  komposisi?: string;
  beratBersih?: string;
  produsen?: string;
  halal?: string;
  kodeProduksi?: string;
  kedaluwarsa?: string;
  nomorIzin?: string;
  kota?: string;
  locations?: Record<string, LabelLocation>;
};

export function scoreLabelFields(fields: LabelFieldSnapshot, mode: LabelMode): ReturnType<typeof scoreLabel> {
  const locations = fields.locations ?? {};
  const location = (key: string): LabelLocation => locations[key] ?? LABEL_LOCATION_NOT_VISIBLE;
  return scoreLabel([
    { key: "productNameAndBrand", found: Boolean(fields.nama && fields.merek), location: location("nama") },
    { key: "ingredients", found: Boolean(fields.komposisi), location: location("komposisi") },
    { key: "netWeight", found: Boolean(fields.beratBersih), location: location("beratBersih"), formatValid: validateNetWeight(fields.beratBersih ?? "").valid },
    { key: "producer", found: Boolean(fields.produsen), location: location("produsen"), formatValid: validateProducerAddress(fields.produsen ?? "", fields.kota ?? "").valid },
    { key: "halal", found: Boolean(fields.halal), location: location("halal") },
    { key: "productionDateAndCode", found: Boolean(fields.kodeProduksi), location: location("kodeProduksi") },
    { key: "expiry", found: Boolean(fields.kedaluwarsa), location: location("kedaluwarsa"), formatValid: validateExpiryLabel(fields.kedaluwarsa ?? "").valid },
    { key: "distributionPermit", found: Boolean(fields.nomorIzin), location: location("nomorIzin"), formatValid: validatePermitNumber(fields.nomorIzin ?? "").valid },
    { key: "ingredientOrigin", found: false, location: LABEL_LOCATION_NOT_VISIBLE, notApplicable: true },
  ], mode);
}
