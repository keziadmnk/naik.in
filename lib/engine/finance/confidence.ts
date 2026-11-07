import {
  CONFIDENCE_HIGH_SCORE,
  CONFIDENCE_MEDIUM_MINIMUM_SCORE,
  HIGH_CONFIDENCE_PERIOD_DAYS,
  RECORDED_DAYS_CONFIDENCE_RATIO,
} from "../../config/thresholds";

export type ConfidenceLevel = "Tinggi" | "Sedang" | "Rendah";

export type ConfidenceInput = {
  periodDays: number;
  hasCashSalesOrAllQrIs: boolean;
  hppSource: "nota" | "buku_kas" | "estimasi";
  recordedDayRatio: number;
  extractionConfirmed: boolean;
};

export type ConfidenceResult = {
  score: number;
  level: ConfidenceLevel;
  checks: {
    periodAtLeast90Days: boolean;
    cashSalesCovered: boolean;
    hppSourceDocumented: boolean;
    enoughRecordedDays: boolean;
    extractionConfirmed: boolean;
  };
};

export function assessConfidence(input: ConfidenceInput): ConfidenceResult {
  const checks = {
    periodAtLeast90Days: input.periodDays >= HIGH_CONFIDENCE_PERIOD_DAYS,
    cashSalesCovered: input.hasCashSalesOrAllQrIs,
    hppSourceDocumented: input.hppSource === "nota" || input.hppSource === "buku_kas",
    enoughRecordedDays: input.recordedDayRatio >= RECORDED_DAYS_CONFIDENCE_RATIO,
    extractionConfirmed: input.extractionConfirmed,
  };
  const score = Object.values(checks).filter(Boolean).length;
  const level: ConfidenceLevel = score === CONFIDENCE_HIGH_SCORE
    ? "Tinggi"
    : score >= CONFIDENCE_MEDIUM_MINIMUM_SCORE && input.hppSource !== "estimasi"
      ? "Sedang"
      : "Rendah";
  return { score, level, checks };
}
