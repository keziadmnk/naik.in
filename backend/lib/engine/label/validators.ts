import {
  MIN_NET_WEIGHT_UNITS,
  PERMIT_CURRENT_DIGIT_COUNT,
  PERMIT_OLD_DIGIT_COUNT,
  POSTAL_CODE_DIGIT_COUNT,
} from "../../config/thresholds";

export type PermitValidation = {
  valid: boolean;
  type: "MD" | "P-IRT" | null;
  warning?: "format_lama" | "bukan_izin_edar";
  message: string;
};

export function validatePermitNumber(value: string): PermitValidation {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, " ");
  if (normalized === "SP") return { valid: false, type: null, warning: "bukan_izin_edar", message: "SP bukan izin edar." };
  const md = new RegExp(`^BPOM RI MD\\s*\\d{${PERMIT_CURRENT_DIGIT_COUNT}}$`);
  const pirt = new RegExp(`^P-?IRT\\s*\\d{${PERMIT_CURRENT_DIGIT_COUNT}}$`);
  const oldMd = new RegExp(`^BPOM RI MD\\s*\\d{${PERMIT_OLD_DIGIT_COUNT}}$`);
  const oldPirt = new RegExp(`^P-?IRT\\s*\\d{${PERMIT_OLD_DIGIT_COUNT}}$`);
  if (md.test(normalized)) return { valid: true, type: "MD", message: "Format nomor izin MD sesuai pola." };
  if (pirt.test(normalized)) return { valid: true, type: "P-IRT", message: "Format nomor izin P-IRT sesuai pola." };
  if (oldMd.test(normalized) || oldPirt.test(normalized)) return { valid: false, type: oldMd.test(normalized) ? "MD" : "P-IRT", warning: "format_lama", message: "Format nomor izin lama terdeteksi (12 digit)." };
  return { valid: false, type: null, message: "Format nomor izin belum sesuai pola yang diperiksa." };
}

export function validateExpiryLabel(value: string): { valid: boolean; message: string } {
  const valid = /baik\s+digunakan\s+sebelum/i.test(value);
  return { valid, message: valid ? "Keterangan kedaluwarsa ditemukan." : 'Kedaluwarsa perlu didahului "Baik digunakan sebelum".' };
}

export function validateProducerAddress(value: string, city: string): { valid: boolean; message: string } {
  const hasCity = city.trim().length > 0 && value.toLocaleLowerCase().includes(city.trim().toLocaleLowerCase());
  const hasPostalCode = new RegExp(`\\b\\d{${POSTAL_CODE_DIGIT_COUNT}}\\b`).test(value);
  const hasCountry = /\bindonesia\b/i.test(value);
  const valid = hasCity && hasPostalCode && hasCountry;
  return { valid, message: valid ? "Nama kota, kode pos, dan Indonesia ditemukan." : "Alamat produsen perlu memuat nama kota, kode pos 5 digit, dan Indonesia." };
}

export function validateNetWeight(value: string): { valid: boolean; message: string } {
  const units = MIN_NET_WEIGHT_UNITS.join("|");
  const valid = new RegExp(`\\b\\d+(?:[.,]\\d+)?\\s*(?:${units})\\b`, "i").test(value);
  return { valid, message: valid ? "Berat bersih memakai satuan metrik." : "Berat bersih perlu memakai satuan mg, g, kg, mL, atau L." };
}
