import { useEffect, useState } from "react";
import { DemoStrip, PageHeader, PageTabs } from "../../components/figma";
import { PIcon } from "../../components/icons";
import { goTo } from "../../routes";
import { useToko } from "../../state/store";
import { useCatat } from "../AppShell";
import { PanelCatat, type HasilBaca } from "./PanelCatat";
import { PeriksaDulu } from "./PeriksaDulu";
import { RekapKas } from "./RekapKas";
import { RingkasanAiBox } from "./RingkasanAiBox";
import { DetailTransaksi, Riwayat } from "./Riwayat";

type Tab = "catat" | "riwayat" | "rekap" | "analisis";
const TAB: Tab[] = ["catat", "riwayat", "rekap", "analisis"];

export function Keuangan({ sub }: { sub: string | null }) {
  const { server } = useToko();
  const { permintaan } = useCatat();
  const tab: Tab = TAB.includes(sub as Tab) ? (sub as Tab) : "catat";
  const [periksa, setPeriksa] = useState<HasilBaca | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [tersimpan, setTersimpan] = useState<number | null>(null);

  // Permintaan "Catat" (tombol +, navigasi cepat, Perlu Dicek) ditangani di tab Upload & Scan
  useEffect(() => {
    if (permintaan && tab !== "catat") goTo("keuangan");
  }, [permintaan, tab]);

  const tabs: { id: Tab; label: string; jumlah?: number }[] = [
    { id: "catat", label: "Upload & Scan" },
    { id: "riwayat", label: "Riwayat Transaksi" },
    { id: "rekap", label: "Rekap Kas" },
    { id: "analisis", label: "Hasil Analisis AI" },
  ];

  return (
    <div className="fg-halaman">
      <PageHeader title="Keuangan" subtitle="Kelola transaksi, pahami arus kas, dan temukan insight keuangan usahamu.">
        <button className="portal-primary" onClick={() => goTo("keuangan")}>
          <PIcon name="plus" size={16} />
          Tambah Data
        </button>
      </PageHeader>
      <DemoStrip>
        {server ? (
          <>
            Data dihitung dari <b>catatan usahamu yang sudah dikonfirmasi</b>. Hasil scan & impor selalu diperiksa dulu sebelum disimpan.
          </>
        ) : (
          <>
            Data yang tampil adalah <b>data demo ilustratif</b> untuk menunjukkan cara kerja aplikasi.
          </>
        )}
      </DemoStrip>
      <PageTabs tabs={tabs} aktif={tab} onPilih={(id) => goTo("keuangan", id === "catat" ? undefined : id)} />

      {tersimpan !== null && (
        <div className="nk-sukses" role="status">
          {tersimpan} transaksi dikonfirmasi dan masuk riwayat.
          <button onClick={() => setTersimpan(null)} aria-label="Tutup pemberitahuan">
            ×
          </button>
        </div>
      )}

      {tab === "catat" && <PanelCatat onHasil={setPeriksa} />}
      {tab === "riwayat" && <Riwayat />}
      {tab === "rekap" && (
        <section className="panel">
          <RekapKas />
        </section>
      )}
      {tab === "analisis" && <RingkasanAiBox />}

      {periksa && (
        <PeriksaDulu
          sumber={periksa.sumber}
          drafAwal={periksa.draf}
          onBatal={() => setPeriksa(null)}
          onSimpan={(n) => {
            setPeriksa(null);
            setTersimpan(n);
            goTo("keuangan", "riwayat");
          }}
        />
      )}
      {detail && <DetailTransaksi id={detail} onTutup={() => setDetail(null)} />}
    </div>
  );
}
