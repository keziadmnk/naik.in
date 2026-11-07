import { useEffect, useRef, useState } from "react";
import { api, type TransaksiOcr } from "../../api";
import { PIcon } from "../../components/icons";
import { KameraLangsung, kameraLangsungTersedia } from "../../components/KameraLangsung";
import { Pemindai } from "../../components/Pemindai";
import { Modal } from "../../components/ui";
import { METODE, type Kategori, type Metode } from "../../data/types";
import { barisDariTabel, barisKosong, kunciBaru, parseCsv, parseTanggal, tebakKategori, type BarisDraf, type KolomDraf } from "../../lib/importer";
import { useToko } from "../../state/store";
import { useCatat } from "../AppShell";
import type { SumberDraf } from "./PeriksaDulu";

export type HasilBaca = { sumber: SumberDraf; draf: BarisDraf[] };

const TERIMA = ".csv,.xlsx,.pdf,.jpg,.jpeg,.png";

async function bacaFile(file: File, kategori: Kategori[], hariIni: string, offline: boolean): Promise<HasilBaca> {
  const nama = file.name.toLowerCase();
  const label = `Unggah file · ${file.name}`;
  if (nama.endsWith(".csv") || nama.endsWith(".xlsx")) {
    let tabel: unknown[][];
    if (nama.endsWith(".csv")) tabel = parseCsv(await file.text());
    else {
      const { default: readXlsxFile } = await import("read-excel-file");
      tabel = (await readXlsxFile(file)) as unknown[][];
    }
    const draf = barisDariTabel(tabel, kategori);
    const barisData = tabel.filter((r) => r.some((c) => String(c ?? "").trim())).length - 1;
    const terbacaLokal = draf.filter((d) => d.uraian.trim() && d.nominal > 0).length;
    if (!offline && barisData > 0 && terbacaLokal < barisData * 0.8) {
      const csv = tabel.map((r) => r.map((c) => (c instanceof Date ? c.toISOString().slice(0, 10) : String(c ?? "")).replace(/[\n;]/g, " ")).join(";")).join("\n");
      const hasilAi = await bacaGambar(new File([csv], file.name.replace(/\.\w+$/, ".csv"), { type: "text/csv" }), kategori, hariIni, offline, "unggah_file", label);
      const terbacaAi = hasilAi.draf.filter((d) => d.uraian.trim() && d.nominal > 0).length;
      if (terbacaAi > terbacaLokal) return hasilAi;
    }
    return {
      sumber: {
        jenis: "unggah_file",
        label,
        catatan: draf.length ? undefined : "Tidak ada baris yang terbaca. Pastikan file berisi kolom tanggal, keterangan, dan nominal masuk/keluar.",
      },
      draf,
    };
  }
  if (/\.(pdf|jpe?g|png)$/.test(nama)) return bacaGambar(file, kategori, hariIni, offline, "unggah_file", label);
  throw new Error("Format file belum didukung. Gunakan CSV, XLSX, PDF, JPG, atau PNG.");
}

type JenisFoto = "buku_kas" | "nota" | "mutasi";

export const buangJumlah = (teks: string) =>
  teks
    .trim()
    .replace(/\s*(?:[×xX]\s*\d+|\(\s*\d+\s*[×xX]?\s*\)|\d+\s*[×xX])\s*$/u, "")
    .trim();

const METODE_DARI_AI: Record<TransaksiOcr["payment_method"], Metode> = { TUNAI: "Tunai", QRIS: "QRIS", TRANSFER: "Transfer", MARKETPLACE: "Marketplace" };
const BATAS_YAKIN = 0.7;
const KOLOM_DARI_AI: Record<TransaksiOcr["field_issues"][number]["field"], KolomDraf> = {
  date: "tanggal",
  description: "uraian",
  amount: "nominal",
  direction: "arah",
  category: "kategoriId",
};

export const barisRagu = (t: TransaksiOcr) => t.is_unclear || t.confidence < BATAS_YAKIN || /\[\?\]/.test(`${t.description} ${t.raw_text ?? ""}`);

async function bacaGambar(
  file: File,
  kategori: Kategori[],
  hariIni: string,
  offline: boolean,
  jenis: "unggah_file" | "scan_foto",
  label: string,
  jenisFoto: JenisFoto = "buku_kas",
): Promise<HasilBaca> {
  const pratinjau = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
  const manual = (alasan: string): HasilBaca => ({
    sumber: { jenis, label, pratinjau, catatan: `${alasan} Isi baris di bawah sesuai foto, lalu konfirmasi.` },
    draf: [barisKosong(hariIni)],
  });
  if (offline) return manual("Mode offline: pembacaan otomatis tidak tersedia.");

  const petunjuk = file.name.toLowerCase().endsWith(".pdf") || jenisFoto === "mutasi" ? "ocr_pdf_mutasi" : jenisFoto === "nota" ? "ocr_nota" : "ocr_cashbook";
  const hasil = await api.ocrDokumen(file, petunjuk, hariIni);
  if (!hasil.ok || !hasil.data) return manual(`Pembacaan otomatis belum tersedia (${hasil.alasan ?? "AI tidak aktif"}).`);
  const { transactions } = hasil.data;

  const draf: BarisDraf[] = transactions
    .filter((t) => t.direction !== "SETTLEMENT")
    .map((t) => {
      const arah = t.direction === "IN" ? "masuk" : "keluar";
      const uraian = buangJumlah(t.description);
      const kat = kategori.find((k) => k.id === t.category && k.arah === arah);
      const ragu = barisRagu(t);
      const isianRagu: BarisDraf["isianRagu"] = {};
      for (const f of t.field_issues ?? []) {
        const kolom = KOLOM_DARI_AI[f.field];
        const lama = isianRagu[kolom];
        isianRagu[kolom] = { pesan: lama ? `${lama.pesan}; ${f.problem}` : f.problem, saran: f.suggestion?.trim() || lama?.saran };
      }
      if (ragu && !Object.keys(isianRagu).length) {
        const pesan = t.review_note || "AI ragu membaca bagian ini";
        if (/\[\?\]/.test(t.description)) isianRagu.uraian = { pesan };
        else isianRagu.nominal = { pesan };
      }
      return {
        key: kunciBaru(),
        baris: t.row_index || null,
        tanggal: parseTanggal(t.transaction_date ?? ""),
        tanggalAsli: t.transaction_date ?? "",
        uraian,
        arah,
        kategoriId: kat?.id ?? tebakKategori(uraian, arah, kategori),
        metode: METODE_DARI_AI[t.payment_method] ?? "Tunai",
        nominal: Math.max(0, Math.round(t.amount ?? 0)),
        disertakan: true,
        ragu,
        catatanAi: ragu ? t.review_note || "AI ragu membaca baris ini. Cocokkan dengan foto." : undefined,
        isianRagu: Object.keys(isianRagu).length ? isianRagu : undefined,
      };
    });
  return {
    sumber: {
      jenis,
      label,
      pratinjau,
      catatan: draf.length ? undefined : "AI tidak menemukan baris transaksi di dokumen ini. Isi manual bila perlu.",
    },
    draf: draf.length ? draf : [barisKosong(hariIni)],
  };
}

export function PanelCatat({ onHasil }: { onHasil: (h: HasilBaca) => void }) {
  const { kategori, hariIni, demo } = useToko();
  const { permintaan, selesai } = useCatat();
  const inputFile = useRef<HTMLInputElement>(null);
  const inputKamera = useRef<HTMLInputElement>(null);
  const [seret, setSeret] = useState(false);
  const [proses, setProses] = useState<string | null>(null);
  const [pratinjauProses, setPratinjauProses] = useState<string | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [pilihFoto, setPilihFoto] = useState(false);
  const [jenisFoto, setJenisFoto] = useState<JenisFoto>("nota");
  const [kameraBuka, setKameraBuka] = useState(false);
  const [halamanManual, setHalamanManual] = useState<{ tanggal?: string } | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  const jalankan = async (tugas: () => Promise<HasilBaca>, pesan: string, file?: File) => {
    setGalat(null);
    setProses(pesan);
    const url = file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    setPratinjauProses(url);
    try {
      onHasil(await tugas());
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "File tidak dapat dibaca.");
    } finally {
      setProses(null);
      setPratinjauProses(null);
      if (url) URL.revokeObjectURL(url);
    }
  };

  const terimaFile = (file: File | undefined) => {
    if (!file) return;
    jalankan(() => bacaFile(file, kategori, hariIni, demo.modeOffline), `Membaca ${file.name}…`, file);
  };

  const manual = (tanggal?: string) => setHalamanManual({ tanggal });

  const bacaFoto = (file: File) =>
    jalankan(() => bacaGambar(file, kategori, hariIni, demo.modeOffline, "scan_foto", "Scan foto", jenisFoto), "Membaca foto…", file);

  useEffect(() => {
    if (!permintaan) return;
    panel.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (permintaan.mode === "manual") manual(permintaan.tanggal);
    if (permintaan.mode === "scan") {
      setHalamanManual(null);
      setPilihFoto(true);
    }
    if (permintaan.mode === "unggah") {
      setHalamanManual(null);
      setTimeout(() => inputFile.current?.click(), 0);
    }
    selesai();
  }, [permintaan]);

  return (
    halamanManual ? (
      <div ref={panel}>
        <InputManual
          tanggalAwal={halamanManual.tanggal}
          onKembali={() => setHalamanManual(null)}
          onPeriksa={(baris) => onHasil({ sumber: { jenis: "manual", label: "Input manual" }, draf: [baris] })}
        />
      </div>
    ) : (
    <div className="upload-layout fg-scan-penuh" ref={panel}>
      <div className="upload-main">
        <div className="subsection-heading">
          <span>AI Financial Scanner</span>
          <h3>Scan & Analisis Data Keuangan</h3>
          <p>Unggah catatan transaksi usahamu untuk dibaca dan dirapikan otomatis. Semua hasil masuk layar Periksa dulu sebelum disimpan.</p>
        </div>
        <label
          className={`dropzone ${seret ? "has-file" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setSeret(true);
          }}
          onDragLeave={() => setSeret(false)}
          onDrop={(e) => {
            e.preventDefault();
            setSeret(false);
            terimaFile(e.dataTransfer.files[0]);
          }}
        >
          <input type="file" accept={TERIMA} onChange={(e) => (terimaFile(e.target.files?.[0]), (e.target.value = ""))} />
          {proses ? (
            <Pemindai src={pratinjauProses} teks={proses} subteks="AI sedang membaca dokumen. Buku kas yang padat bisa butuh hingga 1 menit." />
          ) : (
            <>
              <i>
                <PIcon name="upload" size={28} />
              </i>
              <h4>Tarik dan letakkan file di sini</h4>
              <p>atau klik untuk memilih dari perangkatmu</p>
              <small>CSV, XLSX, PDF, JPG, atau PNG</small>
            </>
          )}
        </label>
        {galat && (
          <p className="nk-galat" role="alert">
            <PIcon name="alert" size={15} /> {galat}
          </p>
        )}
        <div className="file-types">
          {["Buku Kas", "Mutasi Rekening", "Rekap QRIS", "Nota Penjualan", "Nota Pengeluaran"].map((item) => (
            <span key={item}>
              <PIcon name="file" size={16} />
              {item}
            </span>
          ))}
        </div>
        <div className="upload-actions">
          <button className="portal-secondary" onClick={() => manual()} disabled={!!proses}>
            <PIcon name="pen" size={16} />
            Input Manual
          </button>
          <button className="portal-secondary" onClick={() => inputFile.current?.click()} disabled={!!proses}>
            <PIcon name="upload" size={16} />
            Pilih File
          </button>
          <button className="portal-primary" onClick={() => setPilihFoto(true)} disabled={!!proses}>
            <PIcon name="camera" size={16} />
            Scan Foto dengan AI
          </button>
        </div>
      </div>

      <input ref={inputFile} type="file" accept={TERIMA} hidden onChange={(e) => (terimaFile(e.target.files?.[0]), (e.target.value = ""))} />
      <input
        ref={inputKamera}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) bacaFoto(file);
        }}
      />
      {kameraBuka && (
        <KameraLangsung
          judul={jenisFoto === "nota" ? "Foto nota belanja" : jenisFoto === "mutasi" ? "Foto mutasi QRIS" : "Foto halaman buku kas"}
          petunjuk="Letakkan dokumen di tempat terang, foto tegak lurus, dan pastikan seluruh halaman masuk bingkai."
          onAmbil={(f) => {
            setKameraBuka(false);
            bacaFoto(f);
          }}
          onTutup={() => setKameraBuka(false)}
          onGagal={() => {
            setKameraBuka(false);
            inputKamera.current?.click();
          }}
        />
      )}

      {pilihFoto && (
        <Modal judul="Scan foto" onTutup={() => setPilihFoto(false)} lebar={440}>
          <p className="nk-muted">Apa yang akan kamu foto?</p>
          <div className="nk-pilih-foto">
            {(
              [
                ["nota", "Nota belanja", "Satu nota / struk pembelian"],
                ["buku_kas", "Halaman buku kas", "Beberapa baris catatan tulisan tangan"],
                ["mutasi", "Mutasi QRIS", "Riwayat transaksi QRIS / e-wallet merchant"],
              ] as const
            ).map(([id, judul, teks]) => (
              <button
                key={id}
                onClick={() => {
                  setJenisFoto(id);
                  setPilihFoto(false);
                  if (kameraLangsungTersedia()) setKameraBuka(true);
                  else setTimeout(() => inputKamera.current?.click(), 0);
                }}
              >
                <PIcon name={id === "nota" ? "file" : "report"} size={20} />
                <span>
                  <b>{judul}</b>
                  <small>{teks}</small>
                </span>
              </button>
            ))}
          </div>
          {demo.modeOffline && <p className="nk-muted kecil">Mode offline: foto tetap bisa dipakai sebagai acuan, isinya kamu ketik sendiri.</p>}
        </Modal>
      )}
    </div>
    )
  );
}

function InputManual({ onPeriksa, onKembali, tanggalAwal }: { onPeriksa: (b: BarisDraf) => void; onKembali: () => void; tanggalAwal?: string }) {
  const { kategori, hariIni } = useToko();
  const [b, setB] = useState<BarisDraf>(() => barisKosong(hariIni, { arah: "masuk", kategoriId: "penjualan", metode: "QRIS", ...(tanggalAwal ? { tanggal: tanggalAwal, tanggalAsli: tanggalAwal } : {}) }));
  const ubah = (p: Partial<BarisDraf>) => setB((x) => ({ ...x, ...p }));
  return (
    <aside className="manual-card fg-manual-halaman">
      <button className="fg-kembali" onClick={onKembali}>
        ← Kembali ke Upload & Scan
      </button>
      <span>Input manual</span>
      <h3>Input Transaksi Manual</h3>
      <p>Tambahkan satu transaksi tanpa mengunggah dokumen.</p>
      <label className="form-field">
        <span>Tanggal Transaksi</span>
        <div className="field-control">
          <input type="date" value={b.tanggal} max={hariIni} onChange={(e) => ubah({ tanggal: e.target.value, tanggalAsli: e.target.value })} />
        </div>
      </label>
      <label className="form-field">
        <span>Jenis</span>
        <select
          value={b.arah}
          onChange={(e) => {
            const arah = e.target.value as BarisDraf["arah"];
            ubah({ arah, kategoriId: arah === "masuk" ? "penjualan" : "bahan-baku" });
          }}
        >
          <option value="masuk">Pemasukan</option>
          <option value="keluar">Pengeluaran</option>
        </select>
      </label>
      <label className="form-field">
        <span>Kategori</span>
        <select value={b.kategoriId} onChange={(e) => ubah({ kategoriId: e.target.value })}>
          {kategori
            .filter((k) => k.arah === b.arah)
            .map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama}
              </option>
            ))}
        </select>
      </label>
      <label className="form-field">
        <span>Nominal</span>
        <div className="field-control">
          <input inputMode="numeric" placeholder="0" value={b.nominal ? b.nominal.toLocaleString("id-ID") : ""} onChange={(e) => ubah({ nominal: Number(e.target.value.replace(/\D/g, "")) || 0 })} />
        </div>
      </label>
      <label className="form-field">
        <span>Metode Pembayaran</span>
        <select value={b.metode} onChange={(e) => ubah({ metode: e.target.value as BarisDraf["metode"] })}>
          {METODE.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </label>
      <label className="form-field">
        <span>Keterangan</span>
        <div className="field-control">
          <input placeholder="Contoh: Penjualan harian" value={b.uraian} onChange={(e) => ubah({ uraian: e.target.value })} />
        </div>
      </label>
      <button
        className="portal-primary"
        onClick={() => {
          onPeriksa({ ...b, key: kunciBaru() });
          setB(barisKosong(hariIni, { arah: b.arah, kategoriId: b.kategoriId, metode: b.metode }));
        }}
      >
        <PIcon name="plus" size={15} />
        Tambah Transaksi
      </button>
      <small className="nk-muted kecil">Kamu akan diminta memeriksa dulu sebelum transaksi tersimpan.</small>
    </aside>
  );
}
