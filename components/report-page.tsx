"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button, Card, EmptyState } from "./ui";
import { useSessionStore } from "@/lib/state/session-store";
import { classifyKnown } from "@/lib/engine/finance/classification";
import { summarizeFinance, type FinanceSummary } from "@/lib/engine/finance/summary";
import { evaluateStressScenario, type StressScenarioResult } from "@/lib/engine/finance/stress-scenario";
import { scoreLabelFields } from "@/lib/engine/label/score";

const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
const dateText = (value: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(value));

export type ReportSnapshot = {
  business: { id: string; nama: string; kota: string; jenisProduk: string; usiaUsahaBulan: number } | null;
  finance: FinanceSummary | null;
  stress: StressScenarioResult | null;
  label: { score: number; items: Array<{ key: string; status: string }>; findings: string[] } | null;
  pathway: string | null;
  nextSteps: string[];
  dibuat: string;
};

export function ReportPage({ snapshot: initialSnapshot, readOnly = false, code = "" }: { snapshot?: ReportSnapshot; readOnly?: boolean; code?: string }) {
  const session = useSessionStore();
  const [savedCode, setSavedCode] = useState(code);
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const generatedSnapshot = useMemo(() => buildSnapshot(session), [session]);
  const snapshot = initialSnapshot ?? generatedSnapshot;

  async function saveAndShare() {
    if (!snapshot.business) { setSaveError("Profil usaha belum diisi."); return; }
    setSaving(true); setSaveError("");
    try {
      const response = await fetch("/api/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId: snapshot.business.id ?? "local-business", isi: snapshot }) });
      const result = await response.json() as { report?: { kodePublik: string }; error?: string };
      if (!response.ok || !result.report) throw new Error(result.error ?? "Laporan tidak dapat disimpan.");
      setSavedCode(result.report.kodePublik);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Laporan tidak dapat disimpan.");
    } finally { setSaving(false); }
  }

  if (!snapshot.business && !readOnly) return <EmptyState title="Profil usaha belum diisi" description="Isi profil terlebih dahulu agar laporan dapat dibuat." action={<Link className="inline-flex min-h-11 items-center rounded-control bg-navy px-4 text-sm font-bold text-white" href="/">Isi profil usaha</Link>} />;
  return <div className={`report-page space-y-4 ${readOnly ? "report-readonly" : ""}`}>
    {!readOnly && <div className="no-print flex flex-wrap justify-end gap-2"><Button variant="secondary" onClick={() => window.print()}>Cetak/Simpan PDF</Button><Button onClick={() => void saveAndShare()} disabled={saving}>{saving ? "Menyimpan…" : "Simpan dan bagikan"}</Button></div>}
    {saveError && <p className="no-print rounded-control bg-danger-bg p-3 text-sm font-bold text-danger" role="alert">{saveError}</p>}
    {savedCode && <Card className="no-print border-accent/30 bg-tint"><p className="text-sm font-bold text-navy">Kode laporan: {savedCode}</p><p className="mt-1 break-all text-sm text-text-body">Baca-saja: {typeof window !== "undefined" ? `${window.location.origin}/laporan/${savedCode}` : `/laporan/${savedCode}`}</p><p className="mt-1 break-all text-xs text-muted">API: /api/report/{savedCode}</p></Card>}
    <article className="report-sheet">
      <header className="report-header"><div><p className="text-xs font-bold tracking-widest text-accent">NAIK.IN</p><h1>Laporan Kesiapan Usaha</h1><p>Know Your Business. Prepare to Grow.</p></div><div className="report-meta"><strong>{snapshot.business?.nama ?? "Belum diisi"}</strong><span>{dateText(snapshot.dibuat)}</span><span>{savedCode ? `Kode ${savedCode}` : "Kode belum dibuat"}</span></div></header>
      <section className="report-section"><h2>Profil usaha</h2>{snapshot.business ? <p>{snapshot.business.nama} · {snapshot.business.kota} · {snapshot.business.jenisProduk} · usia {snapshot.business.usiaUsahaBulan} bulan</p> : <p>Belum diisi</p>}</section>
      <FinanceReport summary={snapshot.finance} stress={snapshot.stress} />
      <section className="report-grid"><div className="report-section"><h2>Label dan izin</h2>{snapshot.label ? <><p><strong>Skor label:</strong> {Math.round(snapshot.label.score)}/100</p><p>{snapshot.label.items.filter((item) => item.status !== "Sesuai").slice(0, 3).map((item) => item.key).join(", ") || "Tidak ada temuan utama."}</p></> : <p>Belum diisi</p>}</div><div className="report-section"><h2>Jalur izin</h2><p>{snapshot.pathway ?? "Belum diisi"}</p></div></section>
      <section className="report-section"><h2>Langkah berikutnya</h2><ol>{snapshot.nextSteps.map((step) => <li key={step}>{step}</li>)}</ol></section>
      <footer className="report-disclaimer">Laporan ini bukan keputusan kredit atau persetujuan izin. Keputusan ada pada lembaga keuangan dan BPOM/Dinkes.</footer>
    </article>
  </div>;
}

function FinanceReport({ summary, stress }: { summary: FinanceSummary | null; stress: StressScenarioResult | null }) {
  return <section className="report-section"><h2>Ringkasan keuangan</h2>{summary ? <><div className="report-metrics"><span>Omzet<strong>{money(summary.omzet)}</strong></span><span>HPP<strong>{money(summary.hpp)}</strong></span><span>Pengeluaran pribadi<strong>{money(summary.pengeluaranPribadi)}</strong></span><span>Laba usaha<strong>{money(summary.labaUsaha)}</strong></span></div>{stress ? <><h3>Status cicilan</h3><table><thead><tr><th>Tenor</th><th>Cicilan</th><th>Status</th><th>Plafon aman</th></tr></thead><tbody>{stress.tenors.map((item) => <tr key={item.tenor}><td>{item.tenor} bulan</td><td>{money(item.cicilan)}</td><td>{item.status === "ready" ? "Hijau" : item.status === "caution" ? "Kuning" : "Merah"}</td><td>{money(item.plafonAman)}</td></tr>)}</tbody></table><p>Keyakinan data: {summary.confidence.level} ({summary.confidence.score}/5) · Batas aman cicilan: {money(stress.batasAmanCicilan)}</p></> : <p>Stress test belum diisi.</p>}<p>{summary.consistency.length ? `Temuan: ${summary.consistency.map((item) => item.message).join(" ")}` : "Tidak ada temuan yang perlu dicek."}</p></> : <p>Belum diisi</p>}</section>;
}

function buildSnapshot(session: ReturnType<typeof useSessionStore.getState>): ReportSnapshot {
  const finance = session.financeIntake && session.confirmedTransactions.length ? summarizeFinance(session.confirmedTransactions.map(classifyKnown), { periodDays: session.financeIntake.periodeHari, fixedMonthly: Object.values(session.financeIntake.biayaTetap).reduce((sum, value) => sum + value, 0), hasCashSalesOrAllQrIs: session.financeIntake.penjualanTunai === true || session.financeIntake.semuaPenjualanQris === true, hppSource: session.financeIntake.estimasiHppRasio === null ? "buku_kas" : "estimasi", extractionConfirmed: session.financeIntake.extractionConfirmed }) : null;
  const stress = finance && session.financeIntake ? evaluateStressScenario({ transactions: session.confirmedTransactions.map(classifyKnown), periodDays: session.financeIntake.periodeHari, fixedMonthly: Object.values(session.financeIntake.biayaTetap).reduce((sum, value) => sum + value, 0), kebutuhanRtMin: session.financeIntake.kebutuhanRtMin, cicilanLama: session.financeIntake.cicilanLama, plafon: session.loanScenario?.plafon ?? 6_000_000, tenor: (session.loanScenario?.tenorBulan as 12 | 24 | 36) ?? 12, sector: "produksi", akadKe: 1, bungaTahunan: session.loanScenario?.bungaTahunan, omzetShock: 0, hppShock: 0, extractionConfirmed: session.financeIntake.extractionConfirmed }) : null;
  const rawLabel = session.labelResult && typeof session.labelResult === "object" && !Array.isArray(session.labelResult) ? session.labelResult as { mode?: "draf" | "beredar"; fields?: Record<string, unknown> } : null;
  const labelScore = rawLabel?.fields ? scoreLabelFields({ ...rawLabel.fields, kota: session.business?.kota }, rawLabel.mode ?? "draf") : null;
  const label = labelScore ? { score: labelScore.score, items: labelScore.items.map((item) => ({ key: item.key, status: item.status })), findings: [] } : null;
  return { business: session.business ? { ...session.business, id: session.business.id } : null, finance, stress, label, pathway: null, nextSteps: buildNextSteps(finance, label), dibuat: new Date().toISOString() };
}

function buildNextSteps(finance: FinanceSummary | null, label: ReportSnapshot["label"]): string[] {
  const steps: string[] = [];
  if (!finance) steps.push("Lengkapi intake dan konfirmasi transaksi keuangan.");
  if (finance?.confidence.level !== "Tinggi") steps.push("Tambahkan catatan transaksi atau dokumen bahan untuk meningkatkan keyakinan data.");
  if (finance?.consistency.length) steps.push("Periksa temuan konsistensi yang ditandai sebelum mengambil keputusan.");
  if (!label) steps.push("Lengkapi pemeriksaan label depan dan belakang.");
  if (label && label.score < 100) steps.push("Lengkapi item label yang belum sesuai dan cek persyaratan resmi.");
  return steps.slice(0, 5);
}
