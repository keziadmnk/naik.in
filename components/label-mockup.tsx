import type { DemoPreset } from "@/lib/data/presets";

export function LabelMockup({ preset }: { preset: DemoPreset }) {
  const isSari = preset.id === "bu-sari";
  return (
    <div className="grid gap-4 sm:grid-cols-2" aria-label={`Mockup kemasan ${preset.name}`}>
      {["Depan", "Belakang"].map((side) => (
        <div key={side} className="overflow-hidden rounded-card border border-border bg-white shadow-soft">
          <svg viewBox="0 0 240 300" className="h-auto w-full" role="img" aria-label={`Label ${side} ${preset.name}`}>
            <rect width="240" height="300" fill={isSari ? "#E9B949" : "#6F2D22"} />
            <rect x="18" y="18" width="204" height="264" rx="18" fill={isSari ? "#FFF7DC" : "#F8E8C8"} />
            <text x="120" y="68" textAnchor="middle" fill="#122056" fontSize="18" fontWeight="700">{preset.name}</text>
            <text x="120" y="102" textAnchor="middle" fill="#5B65DC" fontSize="13">{isSari ? "KERIPIK BALADO" : "RENDANG KEMASAN"}</text>
            {side === "Depan" ? <><circle cx="120" cy="170" r="48" fill={isSari ? "#C0392B" : "#8A4B2D"} /><text x="120" y="176" textAnchor="middle" fill="white" fontSize="13">Sampel {preset.label.sample}</text></> : <><text x="38" y="160" fill="#2B3563" fontSize="11">Komposisi</text><line x1="38" y1="170" x2="202" y2="170" stroke="#E7E5DD" /><text x="38" y="198" fill="#2B3563" fontSize="11">Baik digunakan sebelum</text><line x1="38" y1="208" x2="202" y2="208" stroke="#E7E5DD" /><text x="38" y="240" fill="#6B7399" fontSize="10">{isSari ? "Stiker tulisan tangan" : "ING perlu dicek • GS1 belum ada"}</text></>}
          </svg>
          <p className="px-4 py-3 text-sm font-bold text-navy">Label {side}</p>
        </div>
      ))}
    </div>
  );
}
