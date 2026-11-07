import { useState } from "react";
import { PIcon, type PIconName } from "../../components/icons";
import { Kosong } from "../../components/ui";
import type { Temuan } from "../../data/types";
import { NAMA_JENIS } from "../../lib/findings";
import { addDays, rupiah, tanggal } from "../../lib/format";
import { useToko } from "../../state/store";
import { useCatat } from "../AppShell";

const IKON: Record<Temuan["jenis"], PIconName> = {
  kemungkinan_pribadi: "user",
  pemasukan_bukan_penjualan: "download",
  duplikat: "file",
  nominal_tidak_biasa: "alert",
  tanggal_bermasalah: "calendar",
  hari_belum_dicatat: "calendar",
};

const PESAN: Record<string, string> = {
  jadikan_pribadi: "Ditandai sebagai pengeluaran pribadi",
  jadikan_pemasukan_lain: "Diubah menjadi pemasukan lain",
  hapus_duplikat: "Catatan ganda dihapus",
  tanggal_hari_ini: "Tanggal diganti ke hari ini",
  abaikan: "Ditandai sudah benar",
  tandai_libur: "Ditandai sebagai hari tutup/libur",
};

export function PerluDicek({ onBukaDetail }: { onBukaDetail: (id: string) => void }) {
  const { temuan, transaksi, hariIni, kirim } = useToko();
  const { minta } = useCatat();
  const [pesan, setPesan] = useState<string | null>(null);

  const tindak = (f: Temuan, aksi: string) => {
    const id = f.transaksiIds[0];
    switch (aksi) {
      case "jadikan_pribadi":
        kirim({ type: "ubahTransaksi", id, perubahan: { kategoriId: "pribadi" } });
        break;
      case "jadikan_pemasukan_lain":
        kirim({ type: "ubahTransaksi", id, perubahan: { kategoriId: "pemasukan-lain" } });
        break;
      case "hapus_duplikat":
        kirim({ type: "hapusTransaksi", id });
        break;
      case "tanggal_hari_ini":
        kirim({ type: "ubahTransaksi", id, perubahan: { tanggal: hariIni } });
        break;
      case "tandai_libur": {
        const hari: string[] = [];
        for (let d = f.rentang!.dari; d <= f.rentang!.sampai; d = addDays(d, 1)) hari.push(d);
        kirim({ type: "tandaiLibur", tanggal: hari, temuanId: f.id, temuan: f });
        break;
      }
      case "catat_hari":
        minta({ mode: "manual", tanggal: f.rentang?.dari });
        return;
      case "buka_detail":
        onBukaDetail(id);
        return;
      default:
        kirim({ type: "tindakTemuan", id: f.id, temuan: f, tindakan: aksi });
    }
    // Aksi yang mengubah data membuat temuan hilang dengan sendirinya; tandai juga agar tidak muncul lagi.
    if (aksi !== "abaikan" && aksi !== "tandai_libur") kirim({ type: "tindakTemuan", id: f.id, temuan: f, tindakan: aksi });
    setPesan(PESAN[aksi] ?? "Selesai");
    window.setTimeout(() => setPesan(null), 2600);
  };

  if (!temuan.length)
    return (
      <>
        {pesan && <Toast teks={pesan} />}
        <Kosong ikon="check" judul="Semua sudah dicek" teks="Tidak ada catatan yang perlu diperiksa. Laba dan rekap sudah memakai data yang bersih." />
      </>
    );

  return (
    <div className="nk-temuan">
      <p className="nk-muted kecil">Sistem menandai catatan yang mungkin keliru. Pilih tindakan, satu klik saja.</p>
      <div className="nk-temuan-grid">
        {temuan.map((f) => {
          const t = transaksi.find((x) => x.id === f.transaksiIds[0]);
          return (
            <article key={f.id} className={`nk-card nk-temuan-kartu jenis-${f.jenis}`}>
              <header>
                <span className="nk-temuan-ikon">
                  <PIcon name={IKON[f.jenis]} size={17} />
                </span>
                <span className="nk-badge kuning">{NAMA_JENIS[f.jenis]}</span>
              </header>
              <h4>{f.judul}</h4>
              {t && (
                <p className="nk-temuan-meta">
                  {tanggal(t.tanggal)} · <b className={`nominal ${t.arah}`}>{rupiah(t.nominal)}</b>
                </p>
              )}
              <p className="nk-temuan-alasan">{f.alasan}</p>
              <div className="nk-temuan-aksi">
                {f.tindakan.map((a) => (
                  <button key={a.id} className={`nk-btn kecil ${a.utama ? "" : "sekunder"}`} onClick={() => tindak(f, a.id)}>
                    {a.label}
                  </button>
                ))}
              </div>
            </article>
          );
        })}
      </div>
      {pesan && <Toast teks={pesan} />}
    </div>
  );
}

function Toast({ teks }: { teks: string }) {
  return (
    <div className="nk-toast" role="status">
      <PIcon name="check" size={16} /> {teks}
    </div>
  );
}
