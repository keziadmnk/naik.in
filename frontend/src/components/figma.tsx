import { useId, type CSSProperties, type ReactNode } from "react";
import { PIcon } from "./icons";

export function PageHeader({ title, subtitle, children }: { title: ReactNode; subtitle: string; children?: ReactNode }) {
  return (
    <div className="inner-page-header">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

export function DemoStrip({ children }: { children: ReactNode }) {
  return (
    <div className="demo-strip">
      <PIcon name="sparkle" size={14} />
      <span>{children}</span>
    </div>
  );
}

export function PageTabs<T extends string>({
  tabs,
  aktif,
  onPilih,
}: {
  tabs: { id: T; label: string; jumlah?: number }[];
  aktif: T;
  onPilih: (id: T) => void;
}) {
  return (
    <div className="page-tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={aktif === t.id} className={aktif === t.id ? "active" : ""} onClick={() => onPilih(t.id)}>
          {t.label}
          {t.jumlah !== undefined && t.jumlah > 0 && <i>{t.jumlah}</i>}
        </button>
      ))}
    </div>
  );
}

export function MiniTren({ nilai, turun = false }: { nilai: number[]; turun?: boolean }) {
  const id = useId().replace(/:/g, "");
  const n = nilai.length;
  if (n < 2) return <svg className="mini-chart" viewBox="0 0 160 55" aria-hidden="true" />;
  const min = Math.min(...nilai);
  const max = Math.max(...nilai);
  const y = (v: number) => 8 + (1 - (v - min) / (max - min || 1)) * 40;
  const x = (i: number) => (i / (n - 1)) * 160;
  const titik = nilai.map((v, i) => [x(i), y(v)] as const);
  let d = `M${titik[0][0]} ${titik[0][1]}`;
  for (let i = 0; i < n - 1; i += 1) {
    const [x0, y0] = titik[Math.max(0, i - 1)];
    const [x1, y1] = titik[i];
    const [x2, y2] = titik[i + 1];
    const [x3, y3] = titik[Math.min(n - 1, i + 2)];
    d += ` C${x1 + (x2 - x0) / 6} ${y1 + (y2 - y0) / 6} ${x2 - (x3 - x1) / 6} ${y2 - (y3 - y1) / 6} ${x2} ${y2}`;
  }
  return (
    <svg className="mini-chart" viewBox="0 0 160 55" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={`mf${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor={turun ? "#C77B6B" : "#5B65DC"} stopOpacity=".25" />
          <stop offset="1" stopColor={turun ? "#C77B6B" : "#5B65DC"} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path fill={`url(#mf${id})`} d={`${d} V55H0Z`} />
      <path className="mini-line" d={d} style={turun ? { stroke: "#C77B6B" } : undefined} />
    </svg>
  );
}

export function GaugeFigma({ nilai, label, sub }: { nilai: number; label: string; sub: string }) {
  const v = Math.max(0, Math.min(100, Math.round(nilai)));
  return (
    <article>
      <div className="gauge" style={{ "--score": `${v}%` } as CSSProperties}>
        <b>{v}</b>
        <span>%</span>
      </div>
      <h3>{label}</h3>
      <p>{sub}</p>
    </article>
  );
}
