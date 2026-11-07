import { PUBLIC_REPORT_CODE_LENGTH } from "../config/thresholds";

const PUBLIC_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createPublicCode(): string {
  const values = new Uint32Array(PUBLIC_REPORT_CODE_LENGTH);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(values);
  else values.forEach((_, index) => { values[index] = Math.floor(Math.random() * 2 ** 32); });
  return Array.from(values, (value) => PUBLIC_CODE_ALPHABET[value % PUBLIC_CODE_ALPHABET.length]).join("");
}

export function nowIso(): string {
  return new Date().toISOString();
}
