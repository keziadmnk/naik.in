import { CLAIM_RULES } from "../../config/thresholds";

export type ClaimFinding = {
  quote: string;
  reason: string;
  suggestion: string;
  note: "Periksa ke BPOM.";
};

export function findProhibitedClaims(text: string): ClaimFinding[] {
  const findings: ClaimFinding[] = [];
  for (const rule of CLAIM_RULES) {
    for (const keyword of rule.keywords) {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const match = text.match(new RegExp(escaped, "i"));
      if (match) {
        findings.push({ quote: match[0], reason: rule.reason, suggestion: rule.suggestion, note: "Periksa ke BPOM." });
        break;
      }
    }
  }
  return findings;
}
