import { useEffect, useRef, useState, type ReactNode } from "react";
import { rupiah, rupiahRingkas } from "../lib/format";

function useLebar<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [lebar, setLebar] = useState(240);
  useEffect(() => {
    if (!ref.current) return;
    setLebar(Math.max(240, Math.round(ref.current.getBoundingClientRect().width)));
    const ro = new ResizeObserver(([e]) => setLebar(Math.max(240, Math.round(e.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, lebar] as const;
}

function skala(min: number, max: number, langkah = 4) {
  const rentang = Math.max(1, max - Math.min(0, min));
  const kasar = rentang / langkah;
  const pangkat = 10 ** Math.floor(Math.log10(kasar));
  const rapi = [1, 2, 2.5, 5, 10].map((m) => m * pangkat).find((v) => v >= kasar) ?? kasar;
  const bawah = Math.min(0, Math.floor(min / rapi) * rapi);
  const atas = Math.max(rapi, Math.ceil(max / rapi) * rapi);
  const tik: number[] = [];
  for (let v = bawah; v <= atas + 1; v += rapi) tik.push(v);
  return { bawah, atas, tik };
}

type Seri = { kunci: string; label: string; warna: string; jenis: "batang" | "garis"; putus?: boolean; area?: boolean };

export function GrafikGabungan({
  data,
  seri,
  tinggi = 260,
  catatanKosong = "Belum ada data pada periode ini.",
}: {
  data: ({ label: string; sub?: string } & Record<string, number | string | undefined>)[];
  seri: Seri[];
  tinggi?: number;
  catatanKosong?: string;
}) {
  const [ref, lebar] = useLebar<HTMLDivElement>();
  const [sorot, setSorot] = useState<number | null>(null);
  if (!data.length) return <div className="nk-chart-kosong">{catatanKosong}</div>;

  const nilai = data.flatMap((d) => seri.map((s) => Number(d[s.kunci] ?? 0)));
  const { bawah, atas, tik } = skala(Math.min(...nilai), Math.max(...nilai));
  const kiri = 52;
  const kanan = 8;
  const atasPad = 10;
  const bawahPad = 26;
  const w = lebar - kiri - kanan;
  const h = tinggi - atasPad - bawahPad;
  const y = (v: number) => atasPad + h - ((v - bawah) / (atas - bawah)) * h;
  const lebarSlot = w / data.length;
  const batang = seri.filter((s) => s.jenis === "batang");
  const lebarBatang = Math.max(3, Math.min(22, (lebarSlot * 0.62) / Math.max(1, batang.length)));
  const xTengah = (i: number) => kiri + lebarSlot * i + lebarSlot / 2;
  const labelTiap = Math.ceil(data.length / Math.max(1, Math.floor(w / 46)));

  return (
    <div className="nk-chart" ref={ref} onMouseLeave={() => setSorot(null)}>
      <svg width={lebar} height={tinggi} role="img" aria-label={`Grafik ${seri.map((s) => s.label).join(", ")}`}>
        {tik.map((t) => (
          <g key={t}>
            <line x1={kiri} x2={lebar - kanan} y1={y(t)} y2={y(t)} className={t === 0 ? "nol" : "grid"} />
            <text x={kiri - 8} y={y(t) + 4} textAnchor="end" className="sumbu">
              {rupiahRingkas(t).replace("Rp", "")}
            </text>
          </g>
        ))}
        {sorot !== null && <rect x={kiri + lebarSlot * sorot} y={atasPad} width={lebarSlot} height={h} className="sorot" />}
        {data.map((d, i) =>
          batang.map((s, j) => {
            const v = Number(d[s.kunci] ?? 0);
            const x = xTengah(i) - (lebarBatang * batang.length) / 2 + j * lebarBatang;
            return <rect key={`${s.kunci}${i}`} x={x + 1} width={lebarBatang - 2} y={Math.min(y(v), y(0))} height={Math.abs(y(v) - y(0))} rx={3} fill={s.warna} />;
          }),
        )}
        {seri
          .filter((s) => s.jenis === "garis")
          .map((s) => (
            <g key={s.kunci}>
              {s.area && data.length > 1 && (
                <polygon
                  fill={s.warna}
                  opacity={0.14}
                  points={`${xTengah(0)},${y(0)} ${data.map((d, i) => `${xTengah(i)},${y(Number(d[s.kunci] ?? 0))}`).join(" ")} ${xTengah(data.length - 1)},${y(0)}`}
                />
              )}
              <polyline
                fill="none"
                stroke={s.warna}
                strokeWidth={2.4}
                strokeLinejoin="round"
                strokeDasharray={s.putus ? "5 5" : undefined}
                points={data.map((d, i) => `${xTengah(i)},${y(Number(d[s.kunci] ?? 0))}`).join(" ")}
              />
              {data.length <= 14 &&
                data.map((d, i) => <circle key={i} cx={xTengah(i)} cy={y(Number(d[s.kunci] ?? 0))} r={3.5} fill="#fff" stroke={s.warna} strokeWidth={2} />)}
            </g>
          ))}
        {data.map((d, i) =>
          i % labelTiap === 0 ? (
            <text key={i} x={xTengah(i)} y={tinggi - 8} textAnchor="middle" className="sumbu">
              {d.label}
            </text>
          ) : null,
        )}
        {data.map((_, i) => (
          <rect key={i} x={kiri + lebarSlot * i} y={atasPad} width={lebarSlot} height={h} fill="transparent" onMouseEnter={() => setSorot(i)} onClick={() => setSorot(i)} />
        ))}
      </svg>
      {sorot !== null && (
        <div className="nk-chart-tip" style={{ left: Math.min(lebar - 190, Math.max(0, xTengah(sorot) - 90)) }}>
          <b>{data[sorot].sub ?? data[sorot].label}</b>
          {seri.map((s) => (
            <span key={s.kunci}>
              <i style={{ background: s.warna }} />
              {s.label}
              <strong>{rupiah(Number(data[sorot][s.kunci] ?? 0))}</strong>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function Legenda({ item }: { item: { label: ReactNode; warna: string; garis?: boolean }[] }) {
  return (
    <div className="nk-legenda">
      {item.map((i, k) => (
        <span key={k}>
          <i className={i.garis ? "garis" : ""} style={{ background: i.warna }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

export const WARNA_DONAT = ["#122056", "#5B65DC", "#8D94E9", "#BFC3F3", "#D9A441", "#4E9F86", "#C77B6B", "#9AA3BF", "#E0E2F5", "#7B6FD0", "#2F3E8F"];

export function Donat({ data, total, ukuran = 168 }: { data: { nama: string; nominal: number; warna: string }[]; total: number; ukuran?: number }) {
  const r = ukuran / 2 - 12;
  const keliling = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={ukuran} height={ukuran} viewBox={`0 0 ${ukuran} ${ukuran}`} role="img" aria-label="Uang keluar per kategori">
      <circle cx={ukuran / 2} cy={ukuran / 2} r={r} fill="none" stroke="#EEEFFD" strokeWidth={22} />
      {total > 0 &&
        data.map((d) => {
          const panjang = (d.nominal / total) * keliling;
          const el = (
            <circle
              key={d.nama}
              cx={ukuran / 2}
              cy={ukuran / 2}
              r={r}
              fill="none"
              stroke={d.warna}
              strokeWidth={22}
              strokeDasharray={`${Math.max(0, panjang - 1.5)} ${keliling}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${ukuran / 2} ${ukuran / 2})`}
            >
              <title>{`${d.nama}: ${rupiah(d.nominal)}`}</title>
            </circle>
          );
          offset += panjang;
          return el;
        })}
    </svg>
  );
}

export function SparkLaba({
  seri,
  kuartilBawah,
  idTerendah,
  tinggi = 86,
}: {
  seri: { dari: string; laba: number; valid: boolean }[];
  kuartilBawah: number;
  idTerendah: string | null;
  tinggi?: number;
}) {
  const [ref, lebar] = useLebar<HTMLDivElement>();
  if (!seri.length) return null;
  const nilai = seri.filter((s) => s.valid).map((s) => s.laba);
  const min = Math.min(0, ...nilai);
  const max = Math.max(...nilai, 1);
  const pad = 8;
  const x = (i: number) => pad + (i / Math.max(1, seri.length - 1)) * (lebar - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / (max - min)) * (tinggi - pad * 2);
  const titik = seri.map((s, i) => (s.valid ? `${x(i)},${y(s.laba)}` : null));
  const potongan: string[][] = [[]];
  titik.forEach((t) => (t ? potongan[potongan.length - 1].push(t) : potongan.push([])));
  return (
    <div className="nk-spark" ref={ref}>
      <svg width={lebar} height={tinggi} role="img" aria-label="Laba mingguan 26 minggu terakhir">
        <line x1={pad} x2={lebar - pad} y1={y(kuartilBawah)} y2={y(kuartilBawah)} className="kuartil" />
        {potongan
          .filter((p) => p.length)
          .map((p, i) => (
            <polyline key={i} points={p.join(" ")} className="garis" />
          ))}
        {seri.map((s, i) =>
          !s.valid ? (
            <g key={s.dari} className="kosong">
              <line x1={x(i)} x2={x(i)} y1={pad} y2={tinggi - pad} />
              <title>Minggu belum lengkap</title>
            </g>
          ) : s.dari === idTerendah ? (
            <g key={s.dari}>
              <circle cx={x(i)} cy={y(s.laba)} r={6} className="terendah-halo" />
              <circle cx={x(i)} cy={y(s.laba)} r={3.5} className="terendah" />
            </g>
          ) : s.laba <= kuartilBawah ? (
            <circle key={s.dari} cx={x(i)} cy={y(s.laba)} r={2.6} className="bawah" />
          ) : null,
        )}
      </svg>
    </div>
  );
}
