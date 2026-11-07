import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { PIcon, type PIconName } from "./icons";

export function Istilah({ children, arti }: { children: ReactNode; arti: string }) {
  return (
    <span className="nk-istilah">
      {children}
      <ArtinyaApa arti={arti} />
    </span>
  );
}

export function ArtinyaApa({ arti }: { arti: string }) {
  const [buka, setBuka] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!buka) return;
    const tutup = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setBuka(false);
    document.addEventListener("mousedown", tutup);
    return () => document.removeEventListener("mousedown", tutup);
  }, [buka]);
  return (
    <span className="nk-tip" ref={ref}>
      <button
        type="button"
        className="nk-tip-btn"
        aria-label="Artinya apa?"
        aria-expanded={buka}
        aria-describedby={buka ? id : undefined}
        onClick={(e) => {
          e.stopPropagation();
          setBuka(!buka);
        }}
      >
        ?
      </button>
      {buka && (
        <span role="tooltip" id={id} className="nk-tip-box">
          <b>Artinya apa?</b>
          {arti}
        </span>
      )}
    </span>
  );
}

export const ARTI = {
  hpp: "HPP (Harga Pokok Penjualan) adalah biaya bahan baku dan kemasan yang langsung dipakai untuk membuat produk yang dijual.",
  labaUsaha: "Laba usaha = penjualan dikurangi HPP dan biaya operasional.",
  selisihKas: "Selisih kas = semua uang masuk dikurangi semua uang keluar. Menunjukkan uang tunai bertambah atau berkurang.",
  operasional: "Biaya operasional adalah biaya menjalankan usaha selain bahan baku, misalnya gas, upah, ongkir, dan sewa.",
  kuartilBawah: "Kuartil bawah: 1 dari 4 minggu labanya berada di bawah angka ini. Gambaran minggu-minggu yang sedang sepi.",
  stressOut: "Uji kas saat sepi: melihat laba di minggu-minggu terburuk untuk menilai apakah cicilan tetap aman dibayar.",
  kelengkapan: "Persentase minggu (Senin–Minggu) yang tercatat lengkap, minimal 5 dari 7 hari, dalam 26 minggu terakhir.",
  rasioHpp: "Rasio HPP = HPP dibagi penjualan. Misalnya 55% berarti setiap Rp100 penjualan, Rp55 habis untuk bahan & kemasan.",
  kur: "KUR (Kredit Usaha Rakyat) adalah pinjaman modal usaha berbunga rendah dari pemerintah yang disalurkan lewat bank.",
};

export const PERNYATAAN = "Ini alat bantu persiapan, bukan keputusan kredit atau persetujuan izin.";

export function Pernyataan() {
  return (
    <p className="nk-pernyataan">
      <PIcon name="info" size={15} />
      {PERNYATAAN}
    </p>
  );
}

export function Modal({
  judul,
  children,
  onTutup,
  lebar = 480,
  aksi,
  nada,
}: {
  judul: string;
  children: ReactNode;
  onTutup: () => void;
  lebar?: number;
  aksi?: ReactNode;
  nada?: "bahaya" | "info";
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onTutup();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onTutup]);
  return (
    <div className="nk-overlay" onMouseDown={onTutup}>
      <div
        className={`nk-modal ${nada ? `nk-modal-nada ${nada}` : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={judul}
        style={{ maxWidth: lebar }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header>
          {nada && (
            <span className="nk-modal-ikon" aria-hidden="true">
              <PIcon name={nada === "bahaya" ? "alert" : "info"} size={22} />
            </span>
          )}
          <h3>{judul}</h3>
          <button className="nk-icon-btn nk-modal-tutup" onClick={onTutup} aria-label="Tutup">
            <PIcon name="close" size={18} />
          </button>
        </header>
        <div className="nk-modal-body">{children}</div>
        {aksi && <footer>{aksi}</footer>}
      </div>
    </div>
  );
}

export function Panel({ judul, children, onTutup }: { judul: string; children: ReactNode; onTutup: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onTutup();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onTutup]);
  return (
    <div className="nk-overlay nk-overlay-panel" onMouseDown={onTutup}>
      <aside className="nk-panel" role="dialog" aria-modal="true" aria-label={judul} onMouseDown={(e) => e.stopPropagation()}>
        <header>
          <h3>{judul}</h3>
          <button className="nk-icon-btn" onClick={onTutup} aria-label="Tutup">
            <PIcon name="close" size={18} />
          </button>
        </header>
        <div className="nk-panel-body">{children}</div>
      </aside>
    </div>
  );
}

export function Segmen<T extends string>({
  pilihan,
  nilai,
  onPilih,
  label,
}: {
  pilihan: { id: T; label: string }[];
  nilai: T;
  onPilih: (id: T) => void;
  label: string;
}) {
  return (
    <div className="nk-segmen" role="radiogroup" aria-label={label}>
      {pilihan.map((p) => (
        <button key={p.id} role="radio" aria-checked={nilai === p.id} className={nilai === p.id ? "aktif" : ""} onClick={() => onPilih(p.id)}>
          {p.label}
        </button>
      ))}
    </div>
  );
}

export function Saklar({ nyala, onUbah, label, keterangan }: { nyala: boolean; onUbah: (v: boolean) => void; label: string; keterangan?: string }) {
  return (
    <label className="nk-saklar-row">
      <span>
        <b>{label}</b>
        {keterangan && <small>{keterangan}</small>}
      </span>
      <button type="button" role="switch" aria-checked={nyala} aria-label={label} className={`nk-saklar ${nyala ? "nyala" : ""}`} onClick={() => onUbah(!nyala)}>
        <i />
      </button>
    </label>
  );
}

export function Cincin({ rasio, ukuran = 92, tebal = 9, children }: { rasio: number; ukuran?: number; tebal?: number; children?: ReactNode }) {
  const r = (ukuran - tebal) / 2;
  const keliling = 2 * Math.PI * r;
  return (
    <div className="nk-cincin" style={{ width: ukuran, height: ukuran }}>
      <svg width={ukuran} height={ukuran} viewBox={`0 0 ${ukuran} ${ukuran}`} aria-hidden="true">
        <circle cx={ukuran / 2} cy={ukuran / 2} r={r} className="jalur" strokeWidth={tebal} />
        <circle
          cx={ukuran / 2}
          cy={ukuran / 2}
          r={r}
          className="isi"
          strokeWidth={tebal}
          strokeDasharray={keliling}
          strokeDashoffset={keliling * (1 - Math.max(0, Math.min(1, rasio)))}
          transform={`rotate(-90 ${ukuran / 2} ${ukuran / 2})`}
        />
      </svg>
      <div className="nk-cincin-isi">{children}</div>
    </div>
  );
}

export function Kosong({ ikon = "file", judul, teks, aksi }: { ikon?: PIconName; judul: string; teks: string; aksi?: ReactNode }) {
  return (
    <div className="nk-kosong">
      <span>
        <PIcon name={ikon} size={22} />
      </span>
      <b>{judul}</b>
      <p>{teks}</p>
      {aksi}
    </div>
  );
}

export function Perubahan({ nilai, kebalikan = false }: { nilai: number | null; kebalikan?: boolean }) {
  if (nilai === null) return <span className="nk-delta netral">Belum ada pembanding</span>;
  const naik = nilai >= 0;
  const baik = kebalikan ? !naik : naik;
  return (
    <span className={`nk-delta ${Math.abs(nilai) < 0.005 ? "netral" : baik ? "baik" : "buruk"}`}>
      {naik ? "▲" : "▼"} {Math.abs(nilai * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%
      <small> vs periode sebelumnya</small>
    </span>
  );
}
