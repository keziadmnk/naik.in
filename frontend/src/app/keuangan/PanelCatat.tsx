import { useEffect, useRef, useState } from "react";
import { api } from "../../api";
import { PIcon } from "../../components/icons";
import { Modal } from "../../components/ui";
import type { Kategori } from "../../data/types";
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
  const panel = useRef<HTMLElement>(null);

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

  const manual = (tanggal?: string) =>
    onHasil({ sumber: { jenis: "manual", label: "Input manual" }, draf: [barisKosong(hariIni, tanggal ? { tanggal } : {})] });

  // Permintaan dari tombol "+" (HP), navigasi cepat, atau temuan "Catat sekarang"
  useEffect(() => {
    if (!permintaan) return;
    panel.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (permintaan.mode === "manual") manual(permintaan.tanggal);
    if (permintaan.mode === "scan") setPilihFoto(true);
    if (permintaan.mode === "unggah") inputFile.current?.click();
    selesai();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permintaan]);

  return (
    <section className="nk-card nk-catat" ref={panel} aria-labelledby="judul-catat">
      <div className="nk-card-head">
        <div>
          <span className="nk-eyebrow">Tambah catatan</span>
          <h3 id="judul-catat">Catat</h3>
        </div>
      </div>
      <div
        className={`nk-dropzone ${seret ? "seret" : ""}`}
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
        <span className="nk-dropzone-ikon">
          <PIcon name="upload" size={24} />
        </span>
        <b>Scan atau unggah</b>
        <p>Seret file ke sini, atau pilih cara di bawah</p>
        <div className="nk-dropzone-aksi">
          <button className="nk-btn" onClick={() => setPilihFoto(true)} disabled={!!proses}>
            <PIcon name="camera" size={17} /> Scan foto
          </button>
          <button className="nk-btn sekunder" onClick={() => inputFile.current?.click()} disabled={!!proses}>
            <PIcon name="file" size={17} /> Unggah file
          </button>
        </div>
        <small>CSV, XLSX, PDF, JPG, PNG</small>
        {proses && (
          <div className="nk-dropzone-proses" role="status">
            <i className="nk-spinner" /> {proses}
          </div>
        )}
      </div>
      {galat && (
        <p className="nk-galat" role="alert">
          <PIcon name="alert" size={15} /> {galat}
        </p>
      )}
      <button className="nk-btn hantu penuh" onClick={() => manual()}>
        <PIcon name="pen" size={16} /> Input manual
      </button>
      <p className="nk-catat-catatan">
        <PIcon name="check" size={14} /> Semua hasil masuk ke layar <b>Periksa dulu</b> sebelum disimpan.
      </p>

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
    </section>
  );
}
