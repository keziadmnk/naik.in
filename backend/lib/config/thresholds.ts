export const CAUTION_RATIO = 0.3;
export const DANGER_RATIO = 0.4;
export const WEEKS_PER_MONTH = 4.333;
export const WEEKS_PER_YEAR = 52;
export const MONTH_NORMALIZATION_DAYS = 30;
export const MINIMUM_STRESS_DAYS = 28;
export const FULL_WEEK_MINIMUM_RECORDED_DAYS = 5;
export const HIGH_CONFIDENCE_PERIOD_DAYS = 90;
export const RECORDED_DAYS_CONFIDENCE_RATIO = 0.8;
export const HPP_DEVIATION_PERCENTAGE_POINTS = 15;
export const MISSING_DAYS_CONSISTENCY_RATIO = 0.2;
export const SINGLE_TRANSACTION_MEDIAN_MULTIPLIER = 5;
export const HPP_OVER_TURNOVER_RATIO = 1;
export const CONFIDENCE_HIGH_SCORE = 5;
export const CONFIDENCE_MEDIUM_MINIMUM_SCORE = 3;
export const KUR_RATE_SWITCH_PRINCIPAL = 10_000_000;
export const KUR_SUPER_MIKRO_RATE = 0.03;
export const KUR_MIKRO_RATE = 0.06;
export const KUR_TRADE_RATES = [0.06, 0.07, 0.08, 0.09] as const;
export const KUR_TENORS = [12, 24, 36] as const;
export const SAFE_RATIO_LABEL = "ambang kehati-hatian NAIK.IN, bukan standar bank";
export const STATUS_LABELS = {
  ready: "Siap",
  caution: "Hati-hati",
  notReady: "Belum siap",
} as const;
export const LABEL_LOCATION_MAIN = "utama";
export const LABEL_LOCATION_OTHER = "lain";
export const LABEL_LOCATION_NOT_VISIBLE = "tidak_terlihat";
export const LABEL_HALF_SCORE = 0.5;
export const LABEL_DRAFT_MODE = "draf";
export const LABEL_CIRCULATING_MODE = "beredar";
export const PERMIT_OLD_DIGIT_COUNT = 12;
export const PERMIT_CURRENT_DIGIT_COUNT = 15;
export const POSTAL_CODE_DIGIT_COUNT = 5;
export const PUBLIC_REPORT_CODE_LENGTH = 8;
export const MIN_NET_WEIGHT_UNITS = ["mg", "g", "kg", "ml", "l"] as const;
export const LABEL_MAIN_LOCATION_REQUIRED = [
  "productNameAndBrand",
  "netWeight",
  "producer",
  "halal",
  "expiry",
  "distributionPermit",
] as const;
export const CLAIM_RULES = [
  { keywords: ["terbaik", "paling", "nomor satu", "terenak"], reason: "Klaim superlatif memerlukan dasar yang dapat diperiksa.", suggestion: "Pilihan rasa yang cocok untuk menemani harimu." },
  { keywords: ["menyehatkan", "menyembuhkan", "obat", "meningkatkan kecerdasan"], reason: "Klaim kesehatan atau pengobatan tidak boleh digunakan tanpa dasar dan izin yang sesuai.", suggestion: "Dibuat dengan bahan yang dipilih dengan cermat." },
  { keywords: ["satu-satunya", "hanya", "cuma"], reason: "Klaim eksklusif perlu bukti yang memadai.", suggestion: "Salah satu pilihan camilan untuk momenmu." },
  { keywords: ["tanpa BTP", "bebas BTP"], reason: "Klaim ini tidak sesuai; gunakan klaim spesifik hanya jika ada dasar.", suggestion: "Tanpa pengawet* (cantumkan penjelasan dan dasar)." },
  { keywords: ["alami", "murni", "100%", "asli", "segar"], reason: "Klaim bahan atau kemurnian perlu dasar yang jelas.", suggestion: "Menggunakan bahan yang dipilih dengan cermat." },
  { keywords: ["premium", "spesial", "gold", "ekstra"], reason: "Klaim ini memerlukan tanda bintang dan penjelasan.", suggestion: "Rasa khas untuk menemani momen spesial." },
  { keywords: ["modern", "terbaru"], reason: "Klaim kebaruan perlu dasar yang dapat diperiksa.", suggestion: "Dikemas praktis untuk aktivitas sehari-hari." },
] as const;

export const LABEL_CHECKLIST_WEIGHTS = {
  productNameAndBrand: 12,
  ingredients: 14,
  netWeight: 12,
  producer: 12,
  halal: 8,
  productionDateAndCode: 10,
  expiry: 12,
  distributionPermit: 15,
  ingredientOrigin: 5,
} as const;
