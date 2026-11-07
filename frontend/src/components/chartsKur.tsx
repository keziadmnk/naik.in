import { useEffect, useRef, useState } from "react";
import { rupiah, rupiahRingkas } from "../lib/format";

function useLebar<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [lebar, setLebar] = useState(240);
  useEffect(() => {
    if (!ref.current) return;
    setLebar(Math.max(220, Math.round(ref.current.getBoundingClientRect().width)));
    const ro = new ResizeObserver(([e]) => setLebar(Math.max(220, Math.round(e.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, lebar] as const;
}

const HIJAU = "#3c9c74";
const KUNING = "#d9a441";
const MERAH = "#d0503f";

export function GaugeRisiko({ nilai }: { nilai: number }) {
  const w = 200;
  const h = 112;
  const r = 82;
  const cx = w / 2;
  const cy = 98;
  const sudut = (v: number) => Math.PI * (1 - v);
  const titik = (v: number, rr = r) => [cx + rr * Math.cos(sudut(v)), cy - rr * Math.sin(sudut(v))];
  const busur = (a: number, b: number) => {
    const [x1, y1] = titik(a);
    const [x2, y2] = titik(b);
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  };
  const v = Math.max(0, Math.min(1, nilai));
  const [jx, jy] = titik(v, r - 22);
  const warna = v < 0.1 ? HIJAU : v < 0.3 ? KUNING : MERAH;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Risiko kredit macet ${Math.round(v * 100)}%`} className="nk-gauge">
      <path d={busur(0, 0.1)} stroke={HIJAU} className="zona" />
      <path d={busur(0.1, 0.3)} stroke={KUNING} className="zona" />
      <path d={busur(0.3, 1)} stroke={MERAH} className="zona" />
      <line x1={cx} y1={cy} x2={jx} y2={jy} className="jarum" />
      <circle cx={cx} cy={cy} r={6} className="poros" />
      <text x={cx} y={cy - 26} textAnchor="middle" className="angka" fill={warna}>
        {(v * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%
      </text>
      <text x={titik(0)[0]} y={h - 2} textAnchor="middle" className="skala">0%</text>
      <text x={titik(1)[0]} y={h - 2} textAnchor="middle" className="skala">100%</text>
    </svg>
  );
}

export function BatangSkenario({ data }: { data: { label: string; sub: string; nilai: number }[] }) {
  const [ref, lebar] = useLebar<HTMLDivElement>();
  const tinggi = 220;
  const atas = 26;
  const bawah = 44;
  const maksPos = Math.max(0, ...data.map((d) => d.nilai));
  const maksNeg = Math.max(0, ...data.map((d) => -d.nilai));
  const area = tinggi - atas - bawah - (maksNeg > 0 ? 24 : 0);
  const total = maksPos + maksNeg || 1;
  const y0 = atas + (area * maksPos) / total;
  const skala = area / total;
  const slot = lebar / data.length;
  const bw = Math.min(64, slot * 0.46);
  return (
    <div ref={ref} className="nk-chart">
      <svg width={lebar} height={tinggi} role="img" aria-label="Sisa kas setelah cicilan per skenario">
        {data.map((d, i) => {
          const x = slot * i + slot / 2;
          const hBar = Math.abs(d.nilai) * skala;
          const y = d.nilai >= 0 ? y0 - hBar : y0;
          return (
            <g key={d.label}>
              <rect x={x - bw / 2} y={y} width={bw} height={Math.max(2, hBar)} rx={6} fill={d.nilai < 0 ? MERAH : HIJAU} opacity={0.9} />
              <text x={x} y={d.nilai >= 0 ? y - 8 : y + hBar + 16} textAnchor="middle" className={`nilai ${d.nilai < 0 ? "neg" : ""}`}>
                {rupiahRingkas(d.nilai)}
              </text>
              <text x={x} y={tinggi - 24} textAnchor="middle" className="label">{d.label}</text>
              <text x={x} y={tinggi - 8} textAnchor="middle" className="sumbu">{d.sub}</text>
            </g>
          );
        })}
        <line x1={0} x2={lebar} y1={y0} y2={y0} className="garis-nol" />
        <text x={4} y={y0 - 5} className="sumbu">0</text>
      </svg>
    </div>
  );
}

export function GrafikKipas({ data }: { data: { bulan: number; p10: number; p50: number; p90: number }[] }) {
  const [ref, lebar] = useLebar<HTMLDivElement>();
  const [sorot, setSorot] = useState<number | null>(null);
  const tinggi = 240;
  const kiri = 54;
  const kanan = 10;
  const atas = 12;
  const bawah = 28;
  const semua = data.flatMap((d) => [d.p10, d.p90, 0]);
  const min = Math.min(...semua);
  const maks = Math.max(...semua);
  const rentang = maks - min || 1;
  const y = (v: number) => atas + (1 - (v - min) / rentang) * (tinggi - atas - bawah);
  const x = (i: number) => kiri + (i / Math.max(1, data.length - 1)) * (lebar - kiri - kanan);
  const pita = `${data.map((d, i) => `${x(i)},${y(d.p90)}`).join(" ")} ${[...data].reverse().map((d, i) => `${x(data.length - 1 - i)},${y(d.p10)}`).join(" ")}`;
  const tik = [min, (min + maks) / 2, maks];
  return (
    <div ref={ref} className="nk-chart" onMouseLeave={() => setSorot(null)}>
      <svg width={lebar} height={tinggi} role="img" aria-label="Proyeksi saldo kas bebas 12 bulan">
        {tik.map((t) => (
          <g key={t}>
            <line x1={kiri} x2={lebar - kanan} y1={y(t)} y2={y(t)} className="grid" />
            <text x={kiri - 6} y={y(t) + 4} textAnchor="end" className="sumbu">{rupiahRingkas(t).replace("Rp", "")}</text>
          </g>
        ))}
        <polygon points={pita} fill="#5B65DC" opacity={0.16} />
        <polyline points={data.map((d, i) => `${x(i)},${y(d.p90)}`).join(" ")} fill="none" stroke="#5B65DC" strokeOpacity={0.35} strokeWidth={1} />
        <polyline points={data.map((d, i) => `${x(i)},${y(d.p10)}`).join(" ")} fill="none" stroke="#5B65DC" strokeOpacity={0.35} strokeWidth={1} />
        <line x1={kiri} x2={lebar - kanan} y1={y(0)} y2={y(0)} className="garis-nol" />
        <polyline points={data.map((d, i) => `${x(i)},${y(d.p50)}`).join(" ")} fill="none" stroke="#122056" strokeWidth={2.5} />
        {data.map((d, i) => (
          <text key={d.bulan} x={x(i)} y={tinggi - 8} textAnchor="middle" className="sumbu">
            {i % 2 === 0 || data.length <= 6 ? d.bulan : ""}
          </text>
        ))}
        {sorot !== null && <line x1={x(sorot)} x2={x(sorot)} y1={atas} y2={tinggi - bawah} stroke="#122056" strokeOpacity={0.25} />}
        {data.map((d, i) => (
          <rect key={i} x={x(i) - (lebar - kiri) / data.length / 2} y={atas} width={(lebar - kiri) / data.length} height={tinggi - atas - bawah} fill="transparent" onMouseEnter={() => setSorot(i)} onClick={() => setSorot(i)} />
        ))}
      </svg>
      {sorot !== null && (
        <div className="nk-chart-tip" style={{ left: Math.min(lebar - 190, Math.max(0, x(sorot) - 95)) }}>
          <b>Bulan ke-{data[sorot].bulan}</b>
          <span>Optimis (P90)<strong>{rupiah(data[sorot].p90)}</strong></span>
          <span>Median<strong>{rupiah(data[sorot].p50)}</strong></span>
          <span>Pesimis (P10)<strong>{rupiah(data[sorot].p10)}</strong></span>
        </div>
      )}
    </div>
  );
}

export const WARNA_STATUS = { hijau: HIJAU, kuning: KUNING, merah: MERAH };
