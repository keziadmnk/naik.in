import { useEffect, useRef, useState } from "react";
import { api } from "../../api";
import { PIcon } from "../../components/icons";
import { Modal } from "../../components/ui";
import { METODE, type Kategori } from "../../data/types";
import { barisDariTabel, barisKosong, kunciBaru, parseCsv, parseTanggal, tebakKategori, type BarisDraf } from "../../lib/importer";
import { useToko } from "../../state/store";
import { useCatat } from "../AppShell";
import type { SumberDraf } from "./PeriksaDulu";

export type HasilBaca = { sumber: SumberDraf; draf: BarisDraf[] };

const TERIMA = ".csv,.xlsx,.pdf,.jpg,.jpeg,.png";

async function bacaFile(file: File, kategori: Kategori[], hariIni: string, offline: boolean): Promise<HasilBaca> {
  const nama = file.name.toLowerCase();
  const label = `Unggah file · ${file.name}`;
  if (nama.endsWith(".csv")) {
    const draf = barisDariTabel(parseCsv(await file.text()), kategori);
    return { sumber: { jenis: "unggah_file", label, catatan: draf.length ? undefined : "Tidak ada baris yang terbaca. Pastikan baris pertama berisi judul kolom (Tanggal, Uraian, Masuk, Keluar)." }, draf };
  }
  if (nama.endsWith(".xlsx")) {
    const { default: readXlsxFile } = await import("read-excel-file");
    const baris = await readXlsxFile(file);
    const draf = barisDariTabel(baris as unknown[][], kategori);
    return { sumber: { jenis: "unggah_file", label, catatan: draf.length ? undefined : "Tidak ada baris yang terbaca di lembar pertama file." }, draf };
  }
  if (/\.(pdf|jpe?g|png)$/.test(nama)) return bacaGambar(file, kategori, hariIni, offline, "unggah_file", label);
  throw new Error("Format file belum didukung. Gunakan CSV, XLSX, PDF, JPG, atau PNG.");
}

async function bacaGambar(
  file: File,
  kategori: Kategori[],
  hariIni: string,
  offline: boolean,
  jenis: "unggah_file" | "scan_foto",
  label: string,
  jenisFoto: "buku_kas" | "nota" = "buku_kas",
): Promise<HasilBaca> {
  const pratinjau = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
  const manual = (alasan: string): HasilBaca => ({
    sumber: { jenis, label, pratinjau, catatan: `${alasan} Isi baris di bawah sesuai foto, lalu konfirmasi.` },
    draf: [barisKosong(hariIni)],
  });
  if (offline) return manual("Mode offline: pembacaan otomatis tidak tersedia.");

  if (jenisFoto === "nota" && !file.name.toLowerCase().endsWith(".pdf")) {
    const hasil = await api.ocrNota(file);
    if (!hasil.ok || !hasil.data) return manual(`Pembacaan otomatis belum tersedia (${hasil.alasan ?? "AI tidak aktif"}).`);
    const n = hasil.data;
    const uraian = `Belanja ${n.supplier ?? "nota"}${n.items.length ? `: ${n.items.map((i) => i.nama).filter(Boolean).slice(0, 3).join(", ")}` : ""}`;
    return {
      sumber: { jenis, label, pratinjau, catatan: "Hasil baca AI. Periksa tanggal dan nominal sebelum menyimpan." },
      draf: [{
        ...barisKosong(hariIni),
        tanggal: parseTanggal(n.tanggal),
        tanggalAsli: n.tanggal ?? "",
        uraian,
        kategoriId: tebakKategori(uraian, "keluar", kategori),
        nominal: Math.round(n.total ?? 0),
      }],
    };
  }

  const hasil = await api.ocrBukuKas(file);
  if (!hasil.ok || !hasil.data) return manual(`Pembacaan otomatis belum tersedia (${hasil.alasan ?? "AI tidak aktif"}).`);
  const draf: BarisDraf[] = hasil.data.rows.map((r) => {
    const arah = r.masuk ? "masuk" : "keluar";
    const uraian = r.uraian ?? "";
    return {
      key: kunciBaru(),
      baris: null,
      tanggal: parseTanggal(r.tanggal),
      tanggalAsli: r.tanggal ?? "",
      uraian,
      arah,
      kategoriId: tebakKategori(uraian, arah, kategori),
      metode: "Tunai",
      nominal: Math.round(r.masuk ?? r.keluar ?? 0),
      disertakan: true,
    };
  });
  return { sumber: { jenis, label, pratinjau, catatan: "Hasil baca AI. Baris yang ragu ditandai — periksa sebelum menyimpan." }, draf };
}

export function PanelCatat({ onHasil }: { onHasil: (h: HasilBaca) => void }) {
  const { kategori, hariIni, demo } = useToko();
  const { permintaan, selesai } = useCatat();
  const inputFile = useRef<HTMLInputElement>(null);
  const inputKamera = useRef<HTMLInputElement>(null);
  const [seret, setSeret] = useState(false);
  const [proses, setProses] = useState<string | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [pilihFoto, setPilihFoto] = useState(false);
  const [jenisFoto, setJenisFoto] = useState<"buku_kas" | "nota">("nota");
  const [halamanManual, setHalamanManual] = useState<{ tanggal?: string } | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  const jalankan = async (tugas: () => Promise<HasilBaca>, pesan: string) => {
    setGalat(null);
    setProses(pesan);
    try {
      onHasil(await tugas());
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "File tidak dapat dibaca.");
    } finally {
      setProses(null);
    }
  };

  const terimaFile = (file: File | undefined) => {
    if (!file) return;
    jalankan(() => bacaFile(file, kategori, hariIni, demo.modeOffline), `Membaca ${file.name}…`);
  };

  const manual = (tanggal?: string) => setHalamanManual({ tanggal });

  // Permintaan dari tombol "+" (HP), navigasi cepat, atau temuan "Catat sekarang"
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            <>
              <i>
                <span className="nk-spinner" />
              </i>
              <h4>{proses}</h4>
              <p>Tunggu sebentar…</p>
            </>
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
          if (file) jalankan(() => bacaGambar(file, kategori, hariIni, demo.modeOffline, "scan_foto", "Scan foto", jenisFoto), "Membaca foto…");
        }}
      />

      {pilihFoto && (
        <Modal judul="Scan foto" onTutup={() => setPilihFoto(false)} lebar={440}>
          <p className="nk-muted">Apa yang akan kamu foto?</p>
          <div className="nk-pilih-foto">
            {(
              [
                ["nota", "Nota belanja", "Satu nota / struk pembelian"],
                ["buku_kas", "Halaman buku kas", "Beberapa baris catatan tulisan tangan"],
              ] as const
            ).map(([id, judul, teks]) => (
              <button
                key={id}
                onClick={() => {
                  setJenisFoto(id);
                  setPilihFoto(false);
                  // Membuka kamera harus terjadi langsung dari klik pengguna
                  setTimeout(() => inputKamera.current?.click(), 0);
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

/** Formulir "Input Transaksi Manual" (desain Figma). Hasilnya tetap lewat layar Periksa dulu. */
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
