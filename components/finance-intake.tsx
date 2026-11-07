"use client";

import { useState } from "react";
import Link from "next/link";
import Papa from "papaparse";
import dynamic from "next/dynamic";
import { AlertCircle, CheckCircle2, UploadCloud } from "lucide-react";
import { Button, Card, Input, Select, Toast } from "./ui";
import { inspectImageQuality } from "@/lib/ai/image";
import { getDemoPreset } from "@/lib/data/presets";
import { useSessionStore, type FinanceIntake, type SessionTransaction } from "@/lib/state/session-store";
import { classifyInLayers, classifyKnown, FINANCE_CATEGORIES, type ClassifiedTransaction, type FinanceCategory } from "@/lib/engine/finance/classification";
import { fixedMonthlyTotal, summarizeFinance, type FinanceSummary } from "@/lib/engine/finance/summary";
import { fetchAi } from "@/lib/ai/browser";

const FinanceSummaryChart = dynamic(() => import("./finance-charts").then((module) => module.FinanceSummaryChart), { ssr: false, loading: () => <div className="h-full rounded-control bg-tint" aria-label="Memuat grafik" /> });

const COSTS = [
  ["sewa", "Sewa"], ["gaji", "Gaji"], ["listrikAir", "Listrik/air usaha"], ["internetPulsa", "Internet/pulsa"],
  ["retribusi", "Retribusi"], ["ongkir", "Ongkir"], ["komisiMarketplace", "Komisi marketplace"],
  ["adminQris", "Biaya admin QRIS"], ["iklan", "Iklan"], ["servisAlat", "Servis alat"],
] as const;
type PreviewRow = Record<string, string>;
type SourceKind = FinanceIntake["sumber"][number]["tipe"];

function parseAmount(value: string): number | null {
  const cleaned = value.replace(/[^\d,.-]/g, "").trim();
  if (!cleaned) return null;
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned.replace(/\.(?=\d{3}(?:\D|$))/g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.abs(amount) : null;
}

function parseDate(value: string): string | null {
  const text = value.trim();
  const indonesian = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (indonesian) {
    const year = indonesian[3].length === 2 ? `20${indonesian[3]}` : indonesian[3];
    return `${year}-${indonesian[2].padStart(2, "0")}-${indonesian[1].padStart(2, "0")}`;
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

export function FinanceIntake() {
  const { presetId, confirmedTransactions, financeIntake, setTransactions, setFinanceIntake, selectPreset } = useSessionStore();
  const [step, setStep] = useState(0);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState({ tanggal: "", nominal: "", uraian: "" });
  const [fileError, setFileError] = useState("");
  const [toast, setToast] = useState("");
  const [quality, setQuality] = useState<string>("");
  const [ocrStatus, setOcrStatus] = useState("");
  const [photoKind, setPhotoKind] = useState<"cashbook" | "nota">("cashbook");
  const [manualRows, setManualRows] = useState<SessionTransaction[]>([]);
  const [lastAiFile, setLastAiFile] = useState<File | null>(null);
  const [classifiedRows, setClassifiedRows] = useState<ClassifiedTransaction[]>([]);
  const [filter, setFilter] = useState("");
  const [classifying, setClassifying] = useState(false);
  const [dataConfirmed, setDataConfirmed] = useState(false);
  const [intake, setIntake] = useState<FinanceIntake>(() => financeIntake ?? emptyIntake());

  const preview = rows.slice(0, 5);
  const hasIncome = confirmedTransactions.some((transaction) => transaction.arah === "masuk" && transaction.nominal > 0) || manualRows.some((transaction) => transaction.arah === "masuk" && transaction.nominal > 0);
  const canConfirm = intake.sumber.length > 0 && hasIncome && intake.penjualanTunai !== null && intake.semuaPenjualanQris !== null && intake.kebutuhanRtMin >= 0;
  const preset = getDemoPreset(presetId);

  function updateIntake(patch: Partial<FinanceIntake>) {
    setIntake((current) => ({ ...current, ...patch }));
  }

  function usePreset() {
    selectPreset(presetId);
    const next = {
      periodeHari: 90 as const,
      sumber: [{ tipe: "csv" as const, nama: `Preset ${preset.name} · 90 hari`, status: "siap" as const }],
      pemetaanKolom: null,
      extractionConfirmed: false,
      penjualanTunai: true,
      semuaPenjualanQris: false,
      estimasiHppRasio: null,
      biayaTetap: preset.costs.biayaTetap,
      cicilanLama: preset.costs.cicilanLama,
      kebutuhanRtMin: preset.costs.kebutuhanRtMin,
    };
    setIntake(next);
    setFinanceIntake(next);
    setClassifiedRows(preset.transactions.map(classifyKnown));
    setDataConfirmed(false);
    setStep(3);
    setToast("Data preset sudah diisikan.");
  }

  async function handleFile(file: File) {
    setLastAiFile(file);
    setFileError("");
    const extension = file.name.toLowerCase().split(".").pop();
    const kind: SourceKind = extension === "csv" ? "csv" : extension === "xlsx" || extension === "xls" ? "xlsx" : extension === "pdf" ? "pdf" : photoKind;
    if (file.size > 8 * 1024 * 1024) {
      setFileError("Berkas terlalu besar. Pilih berkas maksimal 8 MB.");
      return;
    }
    if (kind === "csv") {
      Papa.parse<PreviewRow>(file, { header: true, skipEmptyLines: true, complete: (result) => {
        const parsed = result.data.filter((row) => Object.keys(row).length > 0);
        const nextColumns = parsed.length ? Object.keys(parsed[0]) : [];
        if (!nextColumns.length) { setFileError("CSV tidak memiliki baris data. Periksa pemisah kolom dan simpan ulang."); return; }
        setRows(parsed); setColumns(nextColumns); setMapping({ tanggal: nextColumns[0] ?? "", nominal: nextColumns[1] ?? "", uraian: nextColumns[2] ?? nextColumns[0] ?? "" });
        updateIntake({ sumber: [...intake.sumber.filter((source) => source.tipe !== "csv" && source.tipe !== "xlsx"), { tipe: "csv", nama: file.name, status: "siap" }] });
      }, error: () => setFileError("CSV tidak dapat dibaca. Pastikan format UTF-8 dan memiliki baris judul.") });
      return;
    }
    if (kind === "xlsx") {
      try {
        const xlsx = await import("xlsx");
        const workbook = xlsx.read(await file.arrayBuffer(), { type: "array", cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
        const parsed = xlsx.utils.sheet_to_json<PreviewRow>(sheet, { defval: "" });
        const nextColumns = parsed.length ? Object.keys(parsed[0]) : [];
        if (!nextColumns.length) throw new Error("XLSX tidak memiliki baris data.");
        setRows(parsed); setColumns(nextColumns); setMapping({ tanggal: nextColumns[0] ?? "", nominal: nextColumns[1] ?? "", uraian: nextColumns[2] ?? nextColumns[0] ?? "" });
        updateIntake({ sumber: [...intake.sumber.filter((source) => source.tipe !== "csv" && source.tipe !== "xlsx"), { tipe: "xlsx", nama: file.name, status: "siap" }] });
      } catch (error) { setFileError(error instanceof Error ? `${error.message} Pilih file XLSX dengan baris judul dan data.` : "XLSX tidak dapat dibaca."); }
      return;
    }
    if (kind === "cashbook" && file.type.startsWith("image/")) {
      try { const result = await inspectImageQuality(file); setQuality(`Resolusi ${result.width}×${result.height}; ${result.buram ? "foto mungkin buram" : "ketajaman cukup"}; ${result.silau ? "ada silau" : "silau tidak dominan"}.`); } catch { setQuality("Pra-cek kualitas tidak berhasil. Kamu tetap dapat memasukkan data secara manual."); }
    }
    setOcrStatus("Mengirim berkas untuk dibaca…");
    updateIntake({ sumber: [...intake.sumber, { tipe: kind, nama: file.name, status: "diproses" }] });
    try {
      const body = new FormData(); body.append("file", file); body.append("task", kind === "nota" ? "ocr_nota" : kind === "pdf" ? "ocr_pdf_mutasi" : "ocr_cashbook");
      const response = await fetchAi("/api/finance/ocr", { method: "POST", body });
      const result = await response.json() as { fallback?: boolean; alasan?: string };
      setOcrStatus(result.fallback ? `${result.alasan ?? "AI belum aktif"}. Masukkan transaksi pada tabel manual.` : "Berkas selesai dibaca dan menunggu konfirmasi.");
      updateIntake({ sumber: intake.sumber.map((source) => source.nama === file.name ? { ...source, status: result.fallback ? "manual" : "siap" } : source) });
      if (result.fallback) addManualRow();
    } catch { setOcrStatus("Berkas belum bisa diproses. Masukkan transaksi pada tabel manual."); addManualRow(); }
  }

  function mapRows() {
    const transactions: SessionTransaction[] = [];
    for (const [index, row] of rows.entries()) {
      const tanggal = parseDate(String(row[mapping.tanggal] ?? ""));
      const nominal = parseAmount(String(row[mapping.nominal] ?? ""));
      if (!tanggal || nominal === null) continue;
      transactions.push({ id: `intake-${index}`, tanggal, uraian: String(row[mapping.uraian] ?? "Transaksi"), kategori: "Pemasukan usaha", nominal, arah: "masuk" });
    }
    if (!transactions.length) { setFileError("Tidak ada transaksi yang terbaca. Pilih kolom tanggal dan nominal yang benar, lalu pastikan angkanya valid."); return; }
    setTransactions(transactions); updateIntake({ pemetaanKolom: mapping }); setToast(`${transactions.length} baris siap dikonfirmasi.`); setStep(2);
  }

  function addManualRow() {
    setManualRows((current) => [...current, { id: `manual-${Date.now()}`, tanggal: new Date().toISOString().slice(0, 10), uraian: "", kategori: "Pemasukan usaha", nominal: 0, arah: "masuk" }]);
  }

  function updateManual(index: number, patch: Partial<SessionTransaction>) {
    setManualRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  }

  function finish() {
    const combined = classifiedRows.map((row) => ({ id: row.id, tanggal: row.tanggal, uraian: row.uraian, kategori: row.kategori, nominal: row.nominal, arah: row.arah }));
    setTransactions(combined);
    setFinanceIntake({ ...intake, extractionConfirmed: true });
    setDataConfirmed(true);
    setToast("Data dikonfirmasi. Ringkasan diperbarui.");
  }

  async function prepareConfirmation() {
    setClassifying(true);
    const source = [...confirmedTransactions, ...manualRows];
    const layered = classifyInLayers(source);
    let rows = layered.classified;
    if (layered.remaining.length) {
      try {
        const response = await fetchAi("/api/finance/classify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows: layered.remaining.map((row) => ({ id: row.id, uraian: row.uraian, arah: row.arah, nominal: row.nominal })) }) });
        const result = await response.json() as { ok?: boolean; data?: Array<{ id: string; kategori: string | null; confidence: number }>; };
        const aiRows = result.data ?? [];
        rows = [...rows, ...layered.remaining.map((row) => {
          const ai = aiRows.find((item) => item.id === row.id);
          return ai?.kategori && FINANCE_CATEGORIES.includes(ai.kategori as FinanceCategory)
            ? { ...row, kategori: ai.kategori, keyakinan: ai.confidence }
            : classifyKnown(row);
        })];
      } catch {
        rows = [...rows, ...layered.remaining.map(classifyKnown)];
      }
    }
    setClassifiedRows(rows);
    setDataConfirmed(false);
    setClassifying(false);
    setStep(3);
  }

  function updateClassified(id: string, patch: Partial<ClassifiedTransaction>) {
    setClassifiedRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  const summary: FinanceSummary | null = classifiedRows.length
    ? summarizeFinance(classifiedRows, {
      periodDays: intake.periodeHari,
      fixedMonthly: fixedMonthlyTotal(intake.biayaTetap),
      hasCashSalesOrAllQrIs: intake.penjualanTunai === true || intake.semuaPenjualanQris === true,
      hppSource: intake.estimasiHppRasio === null ? "buku_kas" : "estimasi",
      extractionConfirmed: dataConfirmed,
    })
    : null;

  return <div className="space-y-5">
    <div className="flex flex-wrap gap-2" aria-label="Langkah intake">{["Periode", "Sumber data", "Biaya & kebutuhan", "Konfirmasi"].map((label, index) => <button key={label} type="button" className={`min-h-11 rounded-full px-4 text-sm font-bold ${step === index ? "bg-navy text-white" : index < step ? "bg-ok-bg text-ok" : "bg-tint text-navy"}`} onClick={() => index <= step && setStep(index)}>{index + 1}. {label}</button>)}</div>
    {step === 0 && <Card><h2 className="text-xl font-bold text-navy">Berapa lama periode datanya?</h2><p className="mt-2 text-sm text-muted">Minimal 28 hari. Kami menyarankan 90 hari agar gambaran usaha lebih utuh.</p><div className="mt-5 grid gap-3 sm:grid-cols-3">{([30, 60, 90] as const).map((days) => <button key={days} type="button" className={`min-h-20 rounded-card border p-4 text-left ${intake.periodeHari === days ? "border-navy bg-tint" : "border-border"}`} onClick={() => updateIntake({ periodeHari: days })}><strong className="text-lg text-navy">{days} hari</strong>{days === 90 && <span className="mt-1 block text-xs text-accent">Disarankan</span>}</button>)}</div><div className="mt-5 flex justify-end"><Button onClick={() => setStep(1)}>Lanjut ke sumber data</Button></div></Card>}
    {step === 1 && <Card><h2 className="text-xl font-bold text-navy">Masukkan sumber data</h2><p className="mt-2 text-sm text-muted">Semua boleh opsional, tetapi minimal satu sumber harus memuat pemasukan usaha.</p><div className="mt-5 rounded-card border-2 border-dashed border-accent/40 bg-tint/40 p-6 text-center"><UploadCloud className="mx-auto text-accent" size={30} /><p className="mt-2 font-bold text-navy">CSV/XLSX, PDF mutasi, foto buku kas, atau foto nota</p><p className="mt-1 text-xs text-muted">Maksimal 8 MB per berkas</p><Select label="Jenis foto" value={photoKind} onChange={(event) => setPhotoKind(event.target.value as "cashbook" | "nota")}><option value="cashbook">Foto buku kas</option><option value="nota">Foto nota belanja</option></Select><label className="mt-4 inline-flex min-h-11 cursor-pointer items-center rounded-control bg-navy px-4 text-sm font-bold text-white">Pilih berkas<input className="sr-only" type="file" accept=".csv,.xlsx,.xls,.pdf,image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleFile(file); }} /></label></div>{fileError && <p className="mt-3 flex items-start gap-2 text-sm font-bold text-danger" role="alert"><AlertCircle size={18} />{fileError}</p>}{quality && <p className="mt-3 text-sm text-text-body">{quality}</p>    }{ocrStatus && <div className="mt-3 rounded-control bg-warn-bg p-3 text-sm text-warn"><p>{ocrStatus}</p>{lastAiFile && <Button variant="secondary" className="mt-2" onClick={() => void handleFile(lastAiFile)}>Coba lagi</Button>}</div>}{columns.length > 0 && <div className="mt-5 space-y-4"><h3 className="font-bold text-navy">Petakan kolom</h3><div className="grid gap-3 sm:grid-cols-3"><Select label="Tanggal" value={mapping.tanggal} onChange={(event) => setMapping({ ...mapping, tanggal: event.target.value })}>{columns.map((column) => <option key={column}>{column}</option>)}</Select><Select label="Nominal" value={mapping.nominal} onChange={(event) => setMapping({ ...mapping, nominal: event.target.value })}>{columns.map((column) => <option key={column}>{column}</option>)}</Select><Select label="Keterangan" value={mapping.uraian} onChange={(event) => setMapping({ ...mapping, uraian: event.target.value })}>{columns.map((column) => <option key={column}>{column}</option>)}</Select></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{columns.map((column) => <th className="border-b border-border p-2 text-navy" key={column}>{column}</th>)}</tr></thead><tbody>{preview.map((row, index) => <tr key={index}>{columns.map((column) => <td className="border-b border-border p-2 text-text-body" key={column}>{row[column]}</td>)}</tr>)}</tbody></table></div><Button onClick={mapRows}>Gunakan pemetaan ini</Button></div>}<div className="mt-5 flex flex-wrap justify-between gap-3"><Button variant="secondary" onClick={usePreset}>Gunakan data preset</Button><Button onClick={() => setStep(2)}>Lanjut ke biaya</Button></div></Card>}
    {step === 2 && <CostStep intake={intake} updateIntake={updateIntake} manualRows={manualRows} updateManual={updateManual} addManualRow={addManualRow} onBack={() => setStep(1)} onNext={() => void prepareConfirmation()} />}
    {step === 3 && <ConfirmationStep rows={classifiedRows} filter={filter} setFilter={setFilter} classifying={classifying} summary={summary} canConfirm={canConfirm} dataConfirmed={dataConfirmed} updateRow={updateClassified} onBack={() => setStep(2)} onConfirm={finish} />}
    {toast && <Toast message={toast} onClose={() => setToast("")} />}
  </div>;
}

function ConfirmationStep({ rows, filter, setFilter, classifying, summary, canConfirm, dataConfirmed, updateRow, onBack, onConfirm }: { rows: ClassifiedTransaction[]; filter: string; setFilter: (value: string) => void; classifying: boolean; summary: FinanceSummary | null; canConfirm: boolean; dataConfirmed: boolean; updateRow: (id: string, patch: Partial<ClassifiedTransaction>) => void; onBack: () => void; onConfirm: () => void }) {
  const [bulkCategory, setBulkCategory] = useState<FinanceCategory>("Bukan transaksi usaha");
  const visibleRows = rows.filter((row) => `${row.uraian} ${row.kategori}`.toLocaleLowerCase("id-ID").includes(filter.toLocaleLowerCase("id-ID")));
  return <div className="space-y-5">
    <Card><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-navy">Konfirmasi transaksi</h2><p className="mt-1 text-sm text-muted">{classifying ? "Klasifikasi sedang disiapkan…" : "Periksa dan ubah kategori sebelum melanjutkan."}</p></div><Input aria-label="Cari transaksi" placeholder="Cari uraian/kategori" value={filter} onChange={(event) => setFilter(event.target.value)} /></div><div className="mt-4 flex flex-wrap items-end gap-2 rounded-control bg-tint p-3"><Select label="Kategori untuk baris tersaring" value={bulkCategory} onChange={(event) => setBulkCategory(event.target.value as FinanceCategory)}>{FINANCE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</Select><Button variant="secondary" onClick={() => visibleRows.forEach((row) => updateRow(row.id, { kategori: bulkCategory, keyakinan: 1 }))}>Terapkan ke {visibleRows.length} baris</Button></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead><tr>{["Tanggal", "Uraian", "Nominal", "Arah", "Kategori", "Keyakinan"].map((heading) => <th className="border-b border-border p-3 text-navy" key={heading}>{heading}</th>)}</tr></thead><tbody>{visibleRows.map((row) => <tr key={row.id} className={row.keyakinan < 0.7 ? "bg-warn-bg" : "odd:bg-tint/40"}><td className="p-3 text-text-body">{row.tanggal}</td><td className="p-3 text-text-body">{row.uraian || "Tanpa keterangan"}</td><td className="p-3 text-text-body">{formatCurrency(row.nominal)}</td><td className="p-3 text-text-body">{row.arah === "masuk" ? "Masuk" : "Keluar"}</td><td className="p-3"><Select aria-label={`Kategori ${row.uraian}`} value={row.kategori} onChange={(event) => updateRow(row.id, { kategori: event.target.value, keyakinan: 1 })}>{FINANCE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</Select></td><td className="p-3 font-bold text-navy">{Math.round(row.keyakinan * 100)}%</td></tr>)}</tbody></table></div><p className="mt-3 text-xs text-muted">Baris kuning memiliki keyakinan di bawah 70% dan perlu diperiksa.</p><div className="mt-4 flex flex-wrap justify-between gap-3"><Button variant="secondary" onClick={onBack}>Kembali</Button><Button onClick={onConfirm} disabled={!canConfirm || classifying || rows.length === 0}>{dataConfirmed ? "Data sudah dikonfirmasi" : "Konfirmasi data"}</Button></div></Card>
    {summary && <SummaryPanel summary={summary} />}
  </div>;
}

function SummaryPanel({ summary }: { summary: FinanceSummary }) {
  const confidenceItems = [
    ["Periode minimal 90 hari", summary.confidence.checks.periodAtLeast90Days],
    ["Penjualan tunai tercakup atau semua lewat QRIS", summary.confidence.checks.cashSalesCovered],
    ["Pengeluaran bahan berasal dari dokumen", summary.confidence.checks.hppSourceDocumented],
    ["Minimal 80% hari memiliki catatan", summary.confidence.checks.enoughRecordedDays],
    ["Hasil ekstraksi sudah dikonfirmasi", summary.confidence.checks.extractionConfirmed],
  ] as const;
  return <><Card><div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-navy">Ringkasan usaha</h2><p className="mt-1 text-sm text-muted">Angka dihitung oleh engine NAIK.IN dari transaksi yang kamu konfirmasi.</p></div><div className="flex items-center gap-2"><span className="rounded-full bg-tint px-3 py-2 text-sm font-bold text-navy">{summary.confidence.level}</span><Link href="/keuangan/stress" className="min-h-11 rounded-control bg-navy px-3 py-2 text-sm font-bold text-white">Buka stress test</Link></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Summary label="Omzet" value={formatCurrency(summary.omzet)} /><Summary label="HPP dan rasio" value={`${formatCurrency(summary.hpp)} · ${Math.round(summary.hppRasio * 100)}%`} /><Summary label="Pengeluaran pribadi terdeteksi" value={formatCurrency(summary.pengeluaranPribadi)} /><Summary label="Laba usaha" value={formatCurrency(summary.labaUsaha)} /></div><div className="mt-6 h-72 w-full"><FinanceSummaryChart data={summary.weekly} quietKey={summary.mingguTersepi?.key} /></div><div className="mt-4 grid gap-3 text-sm sm:grid-cols-4"><Summary label="Minggu tersepi" value={summary.mingguTersepi ? `${summary.mingguTersepi.key} · ${formatCurrency(summary.mingguTersepi.laba)}` : "Belum tersedia"} /><Summary label="Rata-rata laba mingguan" value={formatCurrency(summary.rataRataLabaMingguan)} /><Summary label="Minggu tertinggi" value={summary.mingguTertinggi ? `${summary.mingguTertinggi.key} · ${formatCurrency(summary.mingguTertinggi.laba)}` : "Belum tersedia"} /><Summary label="Keragaman laba" value={formatCurrency(summary.keragamanLaba)} /></div></Card><Card><h2 className="text-lg font-bold text-navy">Tingkat Keyakinan Data</h2><p className="mt-1 text-sm text-muted">{summary.confidence.score}/5 pemeriksaan terpenuhi.</p><ul className="mt-4 space-y-3">{confidenceItems.map(([label, passed]) => <li className="flex items-start gap-2 text-sm" key={label}>{passed ? <CheckCircle2 className="shrink-0 text-ok" size={18} /> : <AlertCircle className="shrink-0 text-warn" size={18} />}<span className={passed ? "text-text-body" : "font-bold text-warn"}>{label}{!passed && " · Lengkapi agar keyakinan meningkat"}</span></li>)}</ul></Card><Card><h2 className="text-lg font-bold text-navy">Temuan konsistensi</h2>{summary.consistency.length ? <ul className="mt-3 space-y-2 text-sm text-warn">{summary.consistency.map((finding) => <li key={finding.code}>• {finding.message}</li>)}</ul> : <p className="mt-2 text-sm text-muted">Belum ada temuan yang perlu dicek.</p>}</Card></>;
}

function CostStep({ intake, updateIntake, manualRows, updateManual, addManualRow, onBack, onNext }: { intake: FinanceIntake; updateIntake: (patch: Partial<FinanceIntake>) => void; manualRows: SessionTransaction[]; updateManual: (index: number, patch: Partial<SessionTransaction>) => void; addManualRow: () => void; onBack: () => void; onNext: () => void }) {
  return <Card><h2 className="text-xl font-bold text-navy">Biaya dan kebutuhan usaha</h2><p className="mt-2 text-sm text-muted">Centang biaya yang ada, lalu isi nominal per bulan. Semua angka masih bisa diperiksa lagi.</p><div className="mt-5 grid gap-3 sm:grid-cols-2">{COSTS.map(([key, label]) => <label key={key} className="flex min-h-12 items-center gap-3 rounded-control border border-border p-3"><input type="checkbox" checked={key in intake.biayaTetap} onChange={(event) => updateIntake({ biayaTetap: event.target.checked ? { ...intake.biayaTetap, [key]: intake.biayaTetap[key] ?? 0 } : Object.fromEntries(Object.entries(intake.biayaTetap).filter(([item]) => item !== key)) })} /><span className="w-36 text-sm font-bold text-navy">{label}</span>{key in intake.biayaTetap && <input aria-label={`Nominal ${label}`} className="min-h-10 min-w-0 flex-1 rounded-control border border-border px-3 text-right text-sm" type="number" min="0" value={intake.biayaTetap[key] ?? 0} onChange={(event) => updateIntake({ biayaTetap: { ...intake.biayaTetap, [key]: Number(event.target.value) || 0 } })} />}</label>)}</div><div className="mt-5 grid gap-4 sm:grid-cols-2"><Input label="Cicilan lama per bulan" type="number" min="0" value={intake.cicilanLama} onChange={(event) => updateIntake({ cicilanLama: Number(event.target.value) || 0 })} /><Input label="Kebutuhan rumah tangga minimal per bulan" type="number" min="0" value={intake.kebutuhanRtMin} onChange={(event) => updateIntake({ kebutuhanRtMin: Number(event.target.value) || 0 })} /></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><Select label="Apakah ada penjualan tunai?" value={String(intake.penjualanTunai)} onChange={(event) => updateIntake({ penjualanTunai: event.target.value === "null" ? null : event.target.value === "true" })}><option value="null">Pilih jawaban</option><option value="true">Ya</option><option value="false">Tidak</option></Select><Select label="Apakah semua penjualan lewat QRIS?" value={String(intake.semuaPenjualanQris)} onChange={(event) => updateIntake({ semuaPenjualanQris: event.target.value === "null" ? null : event.target.value === "true" })}><option value="null">Pilih jawaban</option><option value="true">Ya</option><option value="false">Tidak</option></Select></div><div className="mt-5 rounded-control bg-tint p-4"><p className="text-sm font-bold text-navy">Tidak ada nota?</p><p className="mt-1 text-sm text-text-body">Gunakan estimasi HPP sementara berdasarkan rasio bahan terhadap omzet.</p><Input label="Rasio bahan terhadap omzet (%)" type="number" min="0" max="100" value={intake.estimasiHppRasio ?? ""} onChange={(event) => updateIntake({ estimasiHppRasio: event.target.value === "" ? null : Number(event.target.value) })} /></div>{manualRows.length > 0 && <div className="mt-5"><h3 className="font-bold text-navy">Input transaksi manual</h3>{manualRows.map((row, index) => <div className="mt-2 grid gap-2 sm:grid-cols-4" key={row.id}><Input aria-label="Tanggal transaksi" type="date" value={row.tanggal} onChange={(event) => updateManual(index, { tanggal: event.target.value })} /><Input aria-label="Keterangan transaksi" placeholder="Keterangan" value={row.uraian} onChange={(event) => updateManual(index, { uraian: event.target.value })} /><Input aria-label="Nominal transaksi" type="number" min="0" placeholder="Nominal" value={row.nominal || ""} onChange={(event) => updateManual(index, { nominal: Number(event.target.value) || 0 })} /><Select aria-label="Arah transaksi" value={row.arah} onChange={(event) => updateManual(index, { arah: event.target.value as "masuk" | "keluar" })}><option value="masuk">Pemasukan</option><option value="keluar">Pengeluaran</option></Select></div>)}</div>}<div className="mt-5 flex flex-wrap justify-between gap-3"><Button variant="secondary" onClick={onBack}>Kembali</Button><div className="flex gap-2"><Button variant="ghost" onClick={addManualRow}>Tambah transaksi</Button><Button onClick={onNext}>Lanjut ke konfirmasi</Button></div></div></Card>;
}

function emptyIntake(): FinanceIntake {
  return { periodeHari: 90, sumber: [], pemetaanKolom: null, extractionConfirmed: false, penjualanTunai: null, semuaPenjualanQris: null, estimasiHppRasio: null, biayaTetap: {}, cicilanLama: 0, kebutuhanRtMin: 0 };
}
function formatCurrency(value: number) { return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value); }
function Summary({ label, value }: { label: string; value: string }) { return <div className="rounded-control bg-tint p-3"><p className="text-xs text-muted">{label}</p><p className="mt-1 font-bold text-navy">{value}</p></div>; }
