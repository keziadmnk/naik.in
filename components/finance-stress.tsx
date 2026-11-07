"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Button, Card, Input, Select, Slider, Tooltip } from "./ui";
import { classifyKnown } from "@/lib/engine/finance/classification";
import { evaluateStressScenario, type StressScenarioResult } from "@/lib/engine/finance/stress-scenario";
import { automaticKurRate, type KurSector } from "@/lib/engine/finance/kur";
import { useSessionStore } from "@/lib/state/session-store";
import { fetchAi } from "@/lib/ai/browser";

const StressChart = dynamic(() => import("./finance-charts").then((module) => module.StressChart), { ssr: false, loading: () => <div className="h-full rounded-control bg-tint" aria-label="Memuat grafik" /> });

const TENORS = [12, 24, 36] as const;
const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

export function FinanceStress() {
  const { confirmedTransactions, financeIntake, setLoanScenario } = useSessionStore();
  const [plafon, setPlafon] = useState(6_000_000);
  const [tenor, setTenor] = useState<12 | 24 | 36>(12);
  const [sector, setSector] = useState<KurSector>("produksi");
  const [akadKe, setAkadKe] = useState<1 | 2 | 3 | 4>(1);
  const [manualRate, setManualRate] = useState<number | null>(null);
  const [omzetShock, setOmzetShock] = useState(0);
  const [hppShock, setHppShock] = useState(0);
  const [cicilanLama, setCicilanLama] = useState(financeIntake?.cicilanLama ?? 0);
  const [kebutuhanRtMin, setKebutuhanRtMin] = useState(financeIntake?.kebutuhanRtMin ?? 2_000_000);
  const [requirements, setRequirements] = useState<Record<string, boolean>>({});
  const [explanation, setExplanation] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const intake = financeIntake;
  const rate = manualRate ?? automaticKurRate(plafon, sector, akadKe);
  const result = useMemo<StressScenarioResult | null>(() => {
    if (!intake || confirmedTransactions.length === 0) return null;
    return evaluateStressScenario({
      transactions: confirmedTransactions.map(classifyKnown),
      periodDays: intake.periodeHari,
      fixedMonthly: Object.values(intake.biayaTetap).reduce((sum, value) => sum + value, 0),
      kebutuhanRtMin,
      cicilanLama,
      plafon,
      tenor,
      sector,
      akadKe,
      bungaTahunan: rate,
      omzetShock: omzetShock / 100,
      hppShock: hppShock / 100,
      hasCashSalesOrAllQrIs: intake.penjualanTunai === true || intake.semuaPenjualanQris === true,
      hppSource: intake.estimasiHppRasio === null ? "buku_kas" : "estimasi",
      extractionConfirmed: intake.extractionConfirmed,
    });
  }, [akadKe, cicilanLama, confirmedTransactions, hppShock, intake, kebutuhanRtMin, omzetShock, plafon, rate, sector, tenor]);

  function updateLoan() {
    setLoanScenario({ plafon, bungaTahunan: rate, tenorBulan: tenor });
  }

  async function askExplanation() {
    if (!result) return;
    setAiLoading(true);
    const numbers = { plafon, tenor, bunga: rate, cicilan: result.cicilan, rasioBeban: result.rasioBeban, sisaKas: result.sisaKas, status: result.status, labaStress: result.labaSkenario };
    try {
      const response = await fetchAi("/api/finance/insight", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ angka: numbers }) });
      const data = await response.json() as { fallback?: boolean; data?: { ringkasan?: string }; alasan?: string };
      setExplanation(data.data?.ringkasan ?? templateExplanation(result));
      if (data.fallback) setExplanation(`${data.alasan ?? "AI belum aktif"}. ${templateExplanation(result)}`);
    } catch { setExplanation(templateExplanation(result)); }
    setAiLoading(false);
  }

  if (!intake || confirmedTransactions.length === 0) return <Card><h2 className="text-xl font-bold text-navy">Data keuangan belum siap</h2><p className="mt-2 text-sm text-muted">Selesaikan intake dan konfirmasi transaksi terlebih dahulu.</p><Link className="mt-4 inline-flex min-h-11 items-center rounded-control bg-navy px-4 text-sm font-bold text-white" href="/keuangan">Ke langkah intake</Link></Card>;
  if (intake.periodeHari < 28) return <Card><div className="flex items-start gap-3"><AlertCircle className="text-warn" /><div><h2 className="text-xl font-bold text-navy">Stress test belum tersedia</h2><p className="mt-2 text-sm text-text-body">Data baru {intake.periodeHari} hari. Minimal 28 hari diperlukan untuk stress test.</p><Link className="mt-4 inline-flex min-h-11 items-center rounded-control bg-navy px-4 text-sm font-bold text-white" href="/keuangan">Lengkapi periode di intake</Link></div></div></Card>;
  if (!result) return null;
  const statusText = result.status === "ready" ? "Hijau" : result.status === "caution" ? "Kuning" : "Merah";
  const statusDescription = result.status === "ready" ? "Cicilan masih menyisakan ruang kas setelah kebutuhan rumah tangga." : result.status === "caution" ? "Cicilan perlu dipantau karena mendekati ambang kehati-hatian." : "Cicilan belum menyisakan ruang kas yang cukup pada skenario ini.";
  const chartData = [{ nama: "Laba normal", nilai: result.labaNormal }, { nama: "Laba saat sepi", nilai: result.labaSkenario ?? 0 }, { nama: "Cicilan", nilai: result.cicilan }];
  return <div className="space-y-5">
    <Card><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-navy">Stress Test Kesiapan Bayar</h2><p className="mt-1 text-sm text-muted">Skenario Sepi adalah dasar keputusan. Semua angka dihitung lokal oleh engine.</p></div><span className={`inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-bold ${result.status === "ready" ? "bg-ok-bg text-ok" : result.status === "caution" ? "bg-warn-bg text-warn" : "bg-danger-bg text-danger"}`}>{result.status === "ready" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />} {statusText}</span></div><div className="mt-5 grid gap-5 sm:grid-cols-2"><Slider label="Plafon" value={plafon} min={5_000_000} max={50_000_000} step={500_000} onChange={(value) => { setPlafon(value); setManualRate(null); }} /><Select label="Tenor" value={tenor} onChange={(event) => setTenor(Number(event.target.value) as 12 | 24 | 36)}>{TENORS.map((item) => <option key={item} value={item}>{item} bulan</option>)}</Select><Select label="Sektor" value={sector} onChange={(event) => { setSector(event.target.value as KurSector); setManualRate(null); }}><option value="produksi">Produksi</option><option value="perdagangan_non_ekspor">Perdagangan non-ekspor</option></Select><Select label="Akad ke-" value={akadKe} onChange={(event) => { setAkadKe(Number(event.target.value) as 1 | 2 | 3 | 4); setManualRate(null); }}>{[1, 2, 3, 4].map((item) => <option key={item} value={item}>{item}</option>)}</Select><Input label="Bunga tahunan (%)" type="number" min="0" max="100" step="0.1" value={rate * 100} onChange={(event) => setManualRate(Number(event.target.value) / 100)} hint="Otomatis dari engine; boleh diubah manual." /><Input label="Cicilan lama per bulan" type="number" min="0" value={cicilanLama} onChange={(event) => setCicilanLama(Number(event.target.value) || 0)} /><Input label="Kebutuhan rumah tangga minimal" type="number" min="0" value={kebutuhanRtMin} onChange={(event) => setKebutuhanRtMin(Number(event.target.value) || 0)} /></div><p className="mt-4 text-sm text-muted">Bunga otomatis {Math.round(automaticKurRate(plafon, sector, akadKe) * 100)}%. Konfirmasi bunga dan syarat ke bank.</p><div className="mt-5 rounded-control bg-tint p-4"><p className="font-bold text-navy">Skenario tambahan (opsional)</p><div className="mt-3 grid gap-4 sm:grid-cols-2"><Slider label="Omzet turun (%)" value={omzetShock} max={50} onChange={setOmzetShock} /><Slider label="Harga bahan naik (%)" value={hppShock} max={50} onChange={setHppShock} /></div></div><div className="mt-5 flex flex-wrap justify-end gap-2"><Button variant="secondary" onClick={updateLoan}>Simpan skenario</Button><Button onClick={() => void askExplanation()} disabled={aiLoading}>{aiLoading ? "Menyiapkan…" : "Minta penjelasan AI"}</Button></div>{explanation && <p className="mt-4 rounded-control bg-tint p-4 text-sm text-text-body">{explanation}</p>}</Card>
    <Card><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-navy">Hasil skenario {omzetShock || hppShock ? "guncangan" : "Sepi"}</h2><p className="mt-1 text-sm text-muted">{statusDescription}</p></div><Tooltip text="Ambang kehati-hatian NAIK-KELAS adalah 30% dan 40%, bukan standar bank.">Ambang kehati-hatian</Tooltip></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Cicilan per bulan" value={money(result.cicilan)} /><Metric label="Rasio beban" value={`${Math.round(result.rasioBeban * 1000) / 10}%`} /><Metric label="Sisa kas" value={money(result.sisaKas)} /><Metric label="Batas aman cicilan" value={money(result.batasAmanCicilan)} /></div><div className="mt-5 h-64"><StressChart data={chartData} /></div><p className="mt-3 text-sm text-muted">Bunga: {Math.round(result.bungaTahunan * 1000) / 10}% · {result.summary.confidence.level === "Rendah" ? "Hijau (data belum lengkap, hasil perkiraan)" : `Keyakinan data ${result.summary.confidence.level}`}</p></Card>
    <Card><h2 className="text-lg font-bold text-navy">Status per tenor</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead><tr>{["Tenor", "Cicilan", "Rasio beban", "Sisa kas", "Status", "Plafon aman"].map((heading) => <th className="border-b border-border p-3 text-navy" key={heading}>{heading}</th>)}</tr></thead><tbody>{result.tenors.map((item) => <tr className="odd:bg-tint/40" key={item.tenor}><td className="p-3 font-bold">{item.tenor} bulan</td><td className="p-3">{money(item.cicilan)}</td><td className="p-3">{Math.round(item.rasioBeban * 1000) / 10}%</td><td className="p-3">{money(item.sisaKas)}</td><td className="p-3 font-bold">{item.status === "ready" ? "Hijau" : item.status === "caution" ? "Kuning" : "Merah"}</td><td className="p-3">{money(item.plafonAman)}</td></tr>)}</tbody></table></div></Card>
    <Requirements values={requirements} setValues={setRequirements} />
  </div>;
}

function Requirements({ values, setValues }: { values: Record<string, boolean>; setValues: (value: Record<string, boolean>) => void }) {
  const items = ["NIB atau SKU", "e-KTP", "NPWP jika plafon di atas Rp50 juta", "Usaha aktif minimal 6 bulan (ada pengecualian Super Mikro)"];
  return <Card><h2 className="text-lg font-bold text-navy">Syarat umum KUR</h2><p className="mt-1 text-sm text-muted">Informasi saja, tidak masuk skor.</p><div className="mt-4 space-y-3">{items.map((item) => <label className="flex min-h-11 items-center gap-3 text-sm text-text-body" key={item}><input type="checkbox" checked={values[item] ?? false} onChange={(event) => setValues({ ...values, [item]: event.target.checked })} />{item}</label>)}</div></Card>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-control bg-tint p-4"><p className="text-xs text-muted">{label}</p><p className="mt-1 text-lg font-bold text-navy">{value}</p></div>; }
function templateExplanation(result: StressScenarioResult) { return `Pada skenario ini, cicilan ${money(result.cicilan)} per bulan dibandingkan dengan laba saat sepi ${money(result.labaSkenario ?? 0)}. Sisa kasnya ${money(result.sisaKas)}, sehingga statusnya ${result.status === "ready" ? "Hijau" : result.status === "caution" ? "Kuning" : "Merah"}.`; }
