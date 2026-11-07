import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { AMBANG_HIJAU } from "../../lib/config/thresholds";
import { LABEL_STATUS, type Kapasitas, type Penilaian, type Status, type Tindakan } from "../../lib/engine/loan";
import { persen, rupiah, rupiahRingkas } from "../../lib/format";
import { useToko } from "../../state/store";

type Isi = { kesimpulan: string; insight: string[] };

const cacheAi = new Map<string, Isi>();
const JEDA_AI_MS = 1500;

export function rapikanAngka(teks: string): string {
  return teks
    .replace(/Rp\s?(\d{4,})(?![\d.,])/g, (_, n: string) => rupiah(Number(n)))
    .replace(/(^|[^\d.,])(\d{5,})(?![\d.,])/g, (_, depan: string, n: string) => depan + rupiah(Number(n)));
}

export function kesimpulanTemplat(p: Penilaian, kap: Kapasitas, zona: { plafon: number; status: Status }[], tindakan: Tindakan[]): Isi {
  const rencana = `Dengan pinjaman ${rupiah(p.plafon)} selama ${p.tenor} bulan, cicilannya sekitar ${rupiah(p.beban)} per bulan.`;
  const kesimpulan =
    p.status === "hijau"
      ? `${rencana} Laba usahamu rata-rata ${rupiah(kap.labaRata)} per bulan, jadi cicilan ini masih ringan dan tetap bisa dibayar bahkan saat usaha sedang sepi.`
      : p.status === "kuning"
        ? `${rencana} Cicilan ini masih bisa dibayar saat usaha berjalan normal, tetapi saat bulan sepi uang yang tersisa terlalu tipis. Sebaiknya siapkan tabungan cadangan dulu atau pilih pinjaman yang lebih kecil.`
        : `${rencana} Untuk kondisi usaha sekarang, cicilan ini terlalu berat dibanding laba yang didapat. Kecilkan jumlah pinjaman atau pilih jangka waktu yang lebih panjang agar cicilan lebih ringan.`;

  const insight: string[] = [];
  if (Number.isFinite(p.rasioRata))
    insight.push(`Cicilan memakai sekitar ${persen(p.rasioRata)} dari laba rata-rata per bulan. Agar tetap aman, usahakan tidak lebih dari ${persen(AMBANG_HIJAU)}.`);
  insight.push(
    p.sisaStress >= 0
      ? `Saat bulan paling sepi, laba sekitar ${rupiah(kap.labaStress)} masih cukup untuk membayar cicilan, dengan sisa sekitar ${rupiah(p.sisaStress)}.`
      : `Saat bulan paling sepi, laba sekitar ${rupiah(kap.labaStress)} belum cukup untuk membayar cicilan; kurang sekitar ${rupiah(-p.sisaStress)} per bulan.`,
  );
  const berubah = zona.find((z) => z.plafon > p.plafon && z.status !== p.status);
  if (p.status === "hijau" && berubah)
    insight.push(`Bila pinjaman dinaikkan menjadi ${rupiahRingkas(berubah.plafon)}, statusnya berubah menjadi ${LABEL_STATUS[berubah.status]}.`);
  else if (p.status !== "hijau") {
    const amanTerbesar = [...zona].reverse().find((z) => z.status === "hijau");
    insight.push(
      amanTerbesar
        ? `Pinjaman sampai sekitar ${rupiahRingkas(amanTerbesar.plafon)} dengan tenor ${p.tenor} bulan masih masuk status ${LABEL_STATUS.hijau}.`
        : `Belum ada jumlah pinjaman dengan tenor ${p.tenor} bulan yang masuk status ${LABEL_STATUS.hijau}; coba tenor lebih panjang atau tingkatkan laba dulu.`,
    );
  }
  const langkah = tindakan[0];
  if (langkah) insight.push(`${langkah.judul}. ${langkah.teks}`);
  return { kesimpulan, insight: insight.slice(0, 4) };
}

export function KesimpulanKur({
  p,
  kap,
  zona,
  tindakan,
  batasAman,
  konservatif,
}: {
  p: Penilaian;
  kap: Kapasitas;
  zona: { plafon: number; status: Status }[];
  tindakan: Tindakan[];
  batasAman: number;
  konservatif: boolean;
}) {
  const { demo } = useToko();
  const templat = useMemo(() => kesimpulanTemplat(p, kap, zona, tindakan), [p, kap, zona, tindakan]);
  const kunci = `${p.plafon}|${p.tenor}|${konservatif}|${kap.cicilanLama}|${Math.round(kap.labaRata)}|${Math.round(kap.labaStress)}`;
  const [ai, setAi] = useState<{ kunci: string; isi: Isi } | null>(null);

  useEffect(() => {
    if (demo.modeOffline) return;
    const tersimpan = cacheAi.get(kunci);
    if (tersimpan) {
      setAi({ kunci, isi: tersimpan });
      return;
    }
    let batal = false;
    const t = window.setTimeout(async () => {
      const res = await api.insight(
        {
          jumlahPinjaman: p.plafon,
          tenorBulan: p.tenor,
          cicilanPerBulan: Math.round(p.beban),
          persenCicilanDariLaba: Number.isFinite(p.rasioRata) ? Math.round(p.rasioRata * 1000) / 10 : 0,
          batasAmanPersen: AMBANG_HIJAU * 100,
          batasCicilanAman: Math.round(batasAman),
          labaRataRataPerBulan: Math.round(kap.labaRata),
          labaSaatBulanSepi: Math.round(kap.labaStress),
          sisaSetelahCicilanRataRata: Math.round(p.sisaRata),
          sisaSetelahCicilanSaatSepi: Math.round(p.sisaStress),
        },
        `Status simulasi: ${LABEL_STATUS[p.status]}. Pembaca adalah pemilik UMKM awam. ` +
          "Tulis 'ringkasan' 2-3 kalimat bahasa Indonesia sehari-hari: apakah cicilan ini bisa dibayar dari laba usaha, termasuk saat bulan sepi. " +
          "Isi 'risiko' (maks 2 poin) dan 'saran' (maks 2 poin) berupa kalimat pendek yang praktis. " +
          "Hanya kutip angka yang diberikan, jangan menghitung angka baru. Tulis nilai uang dalam format rupiah dengan titik ribuan (mis. Rp1.564.809) dan persen dengan koma (mis. 28,5%). Hindari istilah teknis (rasio, kuartil, NPL, stress test). " +
          "Jangan menyebut layak, disetujui, atau terjamin.",
      );
      if (batal || !res.ok || !res.data?.ringkasan) return;
      const isi = {
        kesimpulan: rapikanAngka(res.data.ringkasan),
        insight: [...res.data.risiko, ...res.data.saran].filter(Boolean).slice(0, 4).map(rapikanAngka),
      };
      cacheAi.set(kunci, isi);
      setAi({ kunci, isi });
    }, JEDA_AI_MS);
    return () => {
      batal = true;
      window.clearTimeout(t);
    };
  }, [kunci, demo.modeOffline]);

  const dariAi = ai?.kunci === kunci && ai.isi.insight.length > 0;
  const isi = dariAi ? ai!.isi : templat;

  return (
    <section className="kur-kesimpulan" aria-live="polite">
      <div className="kur-kesimpulan-kepala">
        <h3>Kesimpulan</h3>
        <span className={`kur-status ${p.status}`}>{LABEL_STATUS[p.status]}</span>
      </div>
      <p className="kur-kesimpulan-teks">{isi.kesimpulan}</p>
      <ul className="kur-insight">
        {isi.insight.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
      <small className="kur-sumber">{dariAi ? "Ditulis AI dari angka simulasi" : "Ringkasan otomatis dari angka simulasi"}</small>
    </section>
  );
}
