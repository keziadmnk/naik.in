import { useEffect, useState } from "react";
import { DemoStrip, PageHeader, PageTabs } from "../../components/figma";
import { goTo } from "../../routes";
import { useToko } from "../../state/store";
import { useCatat } from "../AppShell";
import { PanelCatat, type HasilBaca } from "./PanelCatat";
import { PeriksaDulu } from "./PeriksaDulu";
import { RingkasanAiBox } from "./RingkasanAiBox";
import { DetailTransaksi, Riwayat } from "./Riwayat";

type Tab = "catat" | "riwayat" | "analisis";
const TAB: Tab[] = ["catat", "riwayat", "analisis"];

export function Keuangan({ sub }: { sub: string | null }) {
  const { server } = useToko();
  const { permintaan } = useCatat();
  const tab: Tab = TAB.includes(sub as Tab) ? (sub as Tab) : "catat";
  const [periksa, setPeriksa] = useState<HasilBaca | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [tersimpan, setTersimpan] = useState<number | null>(null);

  useEffect(() => {
    if (permintaan && tab !== "catat") goTo("keuangan");
  }, [permintaan, tab]);

  const tabs: { id: Tab; label: string; jumlah?: number }[] = [
    { id: "catat", label: "Upload & Scan" },
    { id: "riwayat", label: "Riwayat Transaksi" },
    { id: "analisis", label: "Hasil Analisis AI" },
  ];

  return (
    <div className="fg-halaman">
      <PageHeader title="Keuangan" subtitle="Kelola transaksi, pahami arus kas, dan temukan insight keuangan usahamu." />
      {!server && (
        <DemoStrip>
          Data yang tampil adalah <b>data demo ilustratif</b> untuk menunjukkan cara kerja aplikasi.
        </DemoStrip>
      )}
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
