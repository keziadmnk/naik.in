import { useState } from "react";
import { goTo } from "../../routes";
import { useToko } from "../../state/store";
import { PanelCatat, type HasilBaca } from "./PanelCatat";
import { PeriksaDulu } from "./PeriksaDulu";
import { PerluDicek } from "./PerluDicek";
import { RekapKas } from "./RekapKas";
import { RingkasanAiBox } from "./RingkasanAiBox";
import { DetailTransaksi, Riwayat } from "./Riwayat";

type Tab = "riwayat" | "rekap" | "perlu-dicek";

export function Keuangan({ sub }: { sub: string | null }) {
  const { temuan } = useToko();
  const tab: Tab = sub === "rekap" || sub === "perlu-dicek" ? sub : "riwayat";
  const [periksa, setPeriksa] = useState<HasilBaca | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [tersimpan, setTersimpan] = useState<number | null>(null);

  const tabs: { id: Tab; label: string; jumlah?: number }[] = [
    { id: "riwayat", label: "Riwayat Transaksi" },
    { id: "rekap", label: "Rekap Kas" },
    { id: "perlu-dicek", label: "Perlu Dicek", jumlah: temuan.length },
  ];

  return (
    <div className="nk-halaman">
      <div className="nk-keuangan-atas">
        <PanelCatat onHasil={setPeriksa} />
        <RingkasanAiBox />
      </div>

      {tersimpan !== null && (
        <div className="nk-sukses" role="status">
          {tersimpan} transaksi dikonfirmasi dan masuk riwayat.
          <button onClick={() => setTersimpan(null)} aria-label="Tutup pemberitahuan">
            ×
          </button>
        </div>
      )}

      <section className="nk-card nk-tab-card">
        <div className="nk-tabs" role="tablist" aria-label="Data keuangan">
          {tabs.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? "aktif" : ""} onClick={() => goTo("keuangan", t.id === "riwayat" ? undefined : t.id)}>
              {t.label}
              {t.jumlah !== undefined && t.jumlah > 0 && <i className="nk-hitung">{t.jumlah}</i>}
            </button>
          ))}
        </div>
        <div role="tabpanel">
          {tab === "riwayat" && <Riwayat />}
          {tab === "rekap" && <RekapKas />}
          {tab === "perlu-dicek" && <PerluDicek onBukaDetail={setDetail} />}
        </div>
      </section>

      {periksa && (
        <PeriksaDulu
          sumber={periksa.sumber}
          drafAwal={periksa.draf}
          onBatal={() => setPeriksa(null)}
          onSimpan={(n) => {
            setPeriksa(null);
            setTersimpan(n);
            goTo("keuangan");
          }}
        />
      )}
      {detail && <DetailTransaksi id={detail} onTutup={() => setDetail(null)} />}
    </div>
  );
}
