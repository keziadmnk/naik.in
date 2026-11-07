"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Copy, ScanLine } from "lucide-react";
import { Button, Card, Input, Select } from "./ui";
import { inspectImageQuality } from "@/lib/ai/image";
import { getDemoPreset } from "@/lib/data/presets";
import { useSessionStore } from "@/lib/state/session-store";
import { fetchAi } from "@/lib/ai/browser";
import { findProhibitedClaims } from "@/lib/engine/label/claims";
import { guidePermitPathway, type Equipment, type ProductType, type ProductionPlace } from "@/lib/engine/label/pathway";
import { scoreLabel, type LabelMode, type LabelLocation } from "@/lib/engine/label/score";
import { validateExpiryLabel, validateNetWeight, validatePermitNumber, validateProducerAddress } from "@/lib/engine/label/validators";
import { BarcodeScanner } from "./barcode-scanner";

type LabelFields = {
  nama: string; merek: string; jenisPangan: string; komposisi: string; beratBersih: string; produsen: string; halal: string;
  kodeProduksi: string; kedaluwarsa: string; nomorIzin: string; ing: boolean; barcode2d: boolean; barcodeGs1: boolean; klaim: string;
  locations: Record<string, LabelLocation>;
};

const fieldLabels: Array<[keyof LabelFields, string]> = [
  ["nama", "Nama produk"], ["merek", "Merek"], ["jenisPangan", "Jenis pangan"], ["komposisi", "Komposisi"], ["beratBersih", "Berat bersih"],
  ["produsen", "Nama dan alamat produsen"], ["halal", "Halal"], ["kodeProduksi", "Kode produksi"], ["kedaluwarsa", "Kedaluwarsa"], ["nomorIzin", "Nomor izin edar"], ["klaim", "Klaim pada kemasan"],
];
const emptyFields = (): LabelFields => ({ nama: "", merek: "", jenisPangan: "", komposisi: "", beratBersih: "", produsen: "", halal: "", kodeProduksi: "", kedaluwarsa: "", nomorIzin: "", ing: false, barcode2d: false, barcodeGs1: false, klaim: "", locations: {} });
const moneyless = (value: string | null | undefined) => value ?? "";

export function LabelPage() {
  const { mode, presetId, business, setLabelResult } = useSessionStore();
  const [labelMode, setLabelMode] = useState<LabelMode>("draf");
  const [fields, setFields] = useState<LabelFields>(() => emptyFields());
  const [frontQuality, setFrontQuality] = useState("");
  const [backQuality, setBackQuality] = useState("");
  const [scanStatus, setScanStatus] = useState("");
  const [pathwayInput, setPathwayInput] = useState({ productType: "keripik" as ProductType, frozen: false, packagedUht: false, mandatorySni: false, fortified: false, usesBtp: false, specialNutrition: false, productionPlace: "rumah_tinggal" as ProductionPlace, equipment: "manual_semi_otomatis" as Equipment, hasNib: false });
  const [fixText, setFixText] = useState<{ belakang: string; marketplace: string } | null>(null);
  const [fixLoading, setFixLoading] = useState(false);
  const preset = getDemoPreset(presetId);
  const score = useMemo(() => scoreLabel(buildChecklist(fields, business?.kota ?? ""), labelMode), [business?.kota, fields, labelMode]);
  const claims = useMemo(() => findProhibitedClaims(fields.klaim), [fields.klaim]);
  const pathway = useMemo(() => guidePermitPathway(pathwayInput), [pathwayInput]);
  const permit = validatePermitNumber(fields.nomorIzin);

  function update<K extends keyof LabelFields>(key: K, value: LabelFields[K]) {
    setFields((current) => {
      const next = { ...current, [key]: value };
      setLabelResult({ mode: labelMode, fields: next });
      return next;
    });
    setFixText(null);
  }
  function loadSample(sample: "A" | "B") {
    const isA = sample === "A";
    setFields(isA ? {
      ...emptyFields(), nama: "Keripik Balado", merek: "Bu Sari", jenisPangan: "Keripik", beratBersih: "250 g", klaim: "Rasa terbaik", locations: { nama: "utama", merek: "utama", jenisPangan: "utama", beratBersih: "lain" },
    } : {
      ...emptyFields(), nama: "Rendang Kemasan", merek: "Uni Dewi", jenisPangan: "Olahan daging", komposisi: "Daging sapi, santan, cabai", beratBersih: "250 g", produsen: "Uni Dewi, Bukittinggi 26111, Indonesia", halal: "Halal", kedaluwarsa: "Baik digunakan sebelum [ISI: tanggal]", nomorIzin: "BPOM RI MD 123456789012345", ing: true, barcode2d: true, klaim: "", locations: { nama: "utama", merek: "utama", jenisPangan: "utama", komposisi: "utama", beratBersih: "utama", produsen: "utama", halal: "utama", kedaluwarsa: "utama", nomorIzin: "utama" },
    });
    setLabelResult({ mode: labelMode, fields: isA ? { ...emptyFields(), nama: "Keripik Balado", merek: "Bu Sari", jenisPangan: "Keripik", beratBersih: "250 g", klaim: "Rasa terbaik", locations: { nama: "utama", merek: "utama", jenisPangan: "utama", beratBersih: "lain" } } : { ...emptyFields(), nama: "Rendang Kemasan", merek: "Uni Dewi", jenisPangan: "Olahan daging", komposisi: "Daging sapi, santan, cabai", beratBersih: "250 g", produsen: "Uni Dewi, Bukittinggi 26111, Indonesia", halal: "Halal", kedaluwarsa: "Baik digunakan sebelum [ISI: tanggal]", nomorIzin: "BPOM RI MD 123456789012345", ing: true, barcode2d: true, klaim: "", locations: { nama: "utama", merek: "utama", jenisPangan: "utama", komposisi: "utama", beratBersih: "utama", produsen: "utama", halal: "utama", kedaluwarsa: "utama", nomorIzin: "utama" } } });
    setScanStatus(`Sampel ${sample} dimuat dari cache. Hasil siap diedit.`);
  }
  async function handlePhoto(file: File, side: "depan" | "belakang") {
    try { const quality = await inspectImageQuality(file); const message = `${quality.width}×${quality.height}; ${quality.buram ? "mungkin buram" : "ketajaman cukup"}; ${quality.silau ? "silau terdeteksi" : "silau tidak dominan"}.`; if (side === "depan") setFrontQuality(message); else setBackQuality(message); } catch { setScanStatus("Pra-cek foto gagal. Kamu tetap dapat mengedit hasil secara manual."); }
    if (mode === "demo") { setScanStatus("Mode Demo memakai cache. Gunakan Sampel A atau B untuk contoh lengkap."); return; }
    setScanStatus("Menganalisis foto label…");
    try {
      const body = new FormData(); body.append("file", file);
      const response = await fetchAi("/api/label/scan", { method: "POST", body });
      const result = await response.json() as { fallback?: boolean; alasan?: string };
      setScanStatus(result.fallback ? `${result.alasan ?? "AI belum aktif"}. Silakan isi hasil secara manual.` : "Hasil ekstraksi siap dikonfirmasi.");
    } catch { setScanStatus("Foto belum dapat diproses. Silakan isi hasil secara manual."); }
  }
  async function requestFix() {
    setFixLoading(true);
    try {
      const response = await fetchAi("/api/label/fix", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label: fields, konteks: business?.nama ?? "" }) });
      const result = await response.json() as { data?: { label_belakang?: string; deskripsi_marketplace?: string }; fallback?: boolean };
      const cached = preset.ai.labelFix as { label_belakang?: string; deskripsi_marketplace?: string };
      setFixText({ belakang: result.data?.label_belakang ?? moneyless(cached.label_belakang) ?? "Komposisi: [ISI: komposisi]\nBaik digunakan sebelum: [ISI: tanggal]", marketplace: result.data?.deskripsi_marketplace ?? moneyless(cached.deskripsi_marketplace) ?? "Produk pangan olahan dengan informasi yang perlu dilengkapi." });
    } catch { setFixText({ belakang: "Komposisi: [ISI: komposisi]\nBaik digunakan sebelum: [ISI: tanggal]\nNomor izin edar: [ISI: nomor izin]", marketplace: "Produk pangan olahan dengan informasi yang sudah dikonfirmasi." }); }
    setFixLoading(false);
  }
  const copy = async (value: string) => { if (navigator.clipboard) await navigator.clipboard.writeText(value); };

  return <div className="space-y-5">
    <Card><h2 className="text-xl font-bold text-navy">Cek kesiapan label</h2><p className="mt-1 text-sm text-muted">Pilih mode pemeriksaan sebelum mengonfirmasi isi kemasan.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{[["draf", "Cek Draf Label (sebelum daftar)"], ["beredar", "Cek Kemasan yang Sudah Beredar"]].map(([value, label]) => <button key={value} type="button" className={`min-h-16 rounded-card border p-4 text-left text-sm font-bold ${labelMode === value ? "border-navy bg-tint text-navy" : "border-border text-text-body"}`} onClick={() => setLabelMode(value as LabelMode)}>{label}</button>)}</div>{score.draftNote && <p className="mt-4 rounded-control bg-tint p-3 text-sm text-navy">{score.draftNote}</p>}</Card>
    <Card><div className="flex items-start gap-3"><ScanLine className="text-accent" /><div><h2 className="text-lg font-bold text-navy">Foto label depan dan belakang</h2><p className="mt-1 text-sm text-muted">Mode Demo menggunakan cache Sampel A/B tanpa jaringan.</p></div></div><div className="mt-4 flex flex-wrap gap-2"><Button variant="secondary" onClick={() => loadSample("A")}>Sampel A</Button><Button variant="secondary" onClick={() => loadSample("B")}>Sampel B</Button></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{(["depan", "belakang"] as const).map((side) => <label key={side} className="relative flex min-h-28 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-card border-2 border-dashed border-accent/40 bg-tint p-4 text-center"><span className="animate-pulse text-sm font-bold text-navy">Garis pemindai · {side}</span><span className="mt-1 text-xs text-muted">{side === "depan" ? frontQuality : backQuality}</span><input className="sr-only" type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handlePhoto(file, side); }} /></label>)}</div>{scanStatus && <p className="mt-3 rounded-control bg-tint p-3 text-sm text-text-body">{scanStatus}</p>}</Card>
    <Card><div className="flex items-center justify-between"><h2 className="text-lg font-bold text-navy">Konfirmasi hasil ekstraksi</h2><span className="text-sm text-muted">Setiap perubahan menghitung ulang skor</span></div><div className="mt-4 grid gap-4 sm:grid-cols-2">{fieldLabels.map(([key, label]) => <Input key={String(key)} label={label} value={String(fields[key] ?? "")} onChange={(event) => update(key, event.target.value as never)} />)}</div><div className="mt-4 grid gap-3 sm:grid-cols-3">{[["ing", "ING ada"], ["barcode2d", "2D barcode BPOM ada"], ["barcodeGs1", "Barcode GS1 ada"]].map(([key, label]) => <label className="flex min-h-11 items-center gap-2 text-sm font-bold text-navy" key={key}><input type="checkbox" checked={Boolean(fields[key as keyof LabelFields])} onChange={(event) => update(key as keyof LabelFields, event.target.checked as never)} />{label}</label>)}</div>{!permit.valid && fields.nomorIzin && <p className="mt-3 flex gap-2 text-sm font-bold text-warn"><AlertCircle size={18} />{permit.message}</p>}</Card>
    <Checklist score={score} />
    <BarcodeScanner />
    <Card><h2 className="text-lg font-bold text-navy">Catatan tambahan</h2><ul className="mt-3 space-y-2 text-sm text-text-body"><li>ING: format mengikuti PerBPOM 10/2026, cek ke BPOM.</li><li>{fields.barcode2d ? "2D barcode BPOM terdeteksi." : "Sisakan ruang untuk 2D barcode BPOM."}</li><li>Keterangan alergen perlu ditambahkan jika berlaku.</li><li>{fields.barcodeGs1 ? "Barcode GS1 terdeteksi." : "Barcode GS1 belum terdeteksi untuk kebutuhan ritel modern."}</li></ul></Card>
    <Card><h2 className="text-lg font-bold text-navy">Pemeriksa klaim</h2>{claims.length ? <div className="mt-3 space-y-3">{claims.map((finding) => <div className="rounded-control bg-warn-bg p-3 text-sm" key={finding.quote}><p className="font-bold text-warn">“{finding.quote}”</p><p className="mt-1 text-text-body">{finding.reason}</p><p className="mt-1 text-text-body">Saran: {finding.suggestion}</p><p className="mt-1 font-bold text-warn">{finding.note}</p></div>)}</div> : <p className="mt-2 text-sm text-muted">Belum ada klaim yang perlu dicek.</p>}</Card>
    <Pathway input={pathwayInput} setInput={setPathwayInput} result={pathway} />
    <Card><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-navy">Label Fixer</h2><p className="mt-1 text-sm text-muted">Draf hanya memakai data yang sudah kamu konfirmasi.</p></div><Button onClick={() => void requestFix()} disabled={fixLoading}>{fixLoading ? "Menyiapkan…" : "Buat draf label"}</Button></div>{fixText && <div className="mt-4 grid gap-4 sm:grid-cols-2"><CopyBox title="Label belakang" value={fixText.belakang} onCopy={copy} /><CopyBox title="Deskripsi marketplace" value={fixText.marketplace} onCopy={copy} /></div>}</Card>
    <p className="rounded-control bg-tint p-4 text-sm font-bold text-navy">Alat ini memeriksa kelengkapan dan format, bukan kebenaran isi atau persetujuan BPOM.</p>
    {business && <button className="hidden" onClick={() => setLabelResult(fields)}>Simpan hasil</button>}
  </div>;
}

function buildChecklist(fields: LabelFields, city: string) {
  const producerValid = validateProducerAddress(fields.produsen, city).valid;
  return [
    { key: "productNameAndBrand" as const, found: Boolean(fields.nama && fields.merek), location: fields.locations.nama ?? "tidak_terlihat" as LabelLocation },
    { key: "ingredients" as const, found: Boolean(fields.komposisi), location: fields.locations.komposisi ?? "tidak_terlihat" as LabelLocation },
    { key: "netWeight" as const, found: Boolean(fields.beratBersih), location: fields.locations.beratBersih ?? "tidak_terlihat" as LabelLocation, formatValid: validateNetWeight(fields.beratBersih).valid },
    { key: "producer" as const, found: Boolean(fields.produsen), location: fields.locations.produsen ?? "tidak_terlihat" as LabelLocation, formatValid: producerValid },
    { key: "halal" as const, found: Boolean(fields.halal), location: fields.locations.halal ?? "tidak_terlihat" as LabelLocation },
    { key: "productionDateAndCode" as const, found: Boolean(fields.kodeProduksi), location: "utama" as LabelLocation },
    { key: "expiry" as const, found: Boolean(fields.kedaluwarsa), location: fields.locations.kedaluwarsa ?? "tidak_terlihat" as LabelLocation, formatValid: validateExpiryLabel(fields.kedaluwarsa).valid },
    { key: "distributionPermit" as const, found: Boolean(fields.nomorIzin), location: fields.locations.nomorIzin ?? "tidak_terlihat" as LabelLocation, formatValid: validatePermitNumber(fields.nomorIzin).valid },
    { key: "ingredientOrigin" as const, found: false, location: "tidak_terlihat" as LabelLocation, notApplicable: true },
  ];
}
function Checklist({ score }: { score: ReturnType<typeof scoreLabel> }) { return <Card><div className="flex items-center justify-between"><div><h2 className="text-lg font-bold text-navy">Checklist label</h2><p className="mt-1 text-sm text-muted">Skor {Math.round(score.score)} dari 100 berdasarkan item yang berlaku.</p></div><span className="text-3xl font-black text-accent">{Math.round(score.score)}</span></div><div className="mt-4 space-y-2">{score.items.map((item) => <div className="grid gap-2 rounded-control border border-border p-3 text-sm sm:grid-cols-[1fr_auto_auto]" key={item.key}><span className="font-bold text-navy">{item.key}</span><span className={item.status === "Sesuai" ? "text-ok" : item.status === "N/A" ? "text-muted" : "text-warn"}>{item.status}</span><span className="text-muted">{item.location}</span></div>)}</div></Card>; }
function Pathway({ input, setInput, result }: { input: Parameters<typeof guidePermitPathway>[0]; setInput: (input: Parameters<typeof guidePermitPathway>[0]) => void; result: ReturnType<typeof guidePermitPathway> }) { return <Card><h2 className="text-lg font-bold text-navy">Pemandu jalur izin</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><Select label="Jenis produk" value={input.productType} onChange={(event) => setInput({ ...input, productType: event.target.value as ProductType })}>{["kering", "keripik", "olahan_basah", "beku", "minuman", "minuman_serbuk", "lain"].map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</Select><Select label="Tempat produksi" value={input.productionPlace} onChange={(event) => setInput({ ...input, productionPlace: event.target.value as ProductionPlace })}><option value="rumah_tinggal">Rumah tinggal</option><option value="terpisah">Terpisah</option></Select><Select label="Peralatan" value={input.equipment} onChange={(event) => setInput({ ...input, equipment: event.target.value as Equipment })}><option value="manual_semi_otomatis">Manual/semi-otomatis</option><option value="otomatis">Otomatis</option></Select></div><label className="mt-3 flex min-h-11 items-center gap-2 text-sm font-bold text-navy"><input type="checkbox" checked={input.frozen} onChange={(event) => setInput({ ...input, frozen: event.target.checked })} />Produk beku</label><p className="mt-4 rounded-control bg-tint p-3 font-bold text-navy">{result.recommendation}</p><p className="mt-3 text-sm text-text-body">{result.notes[0]}</p><div className="mt-3 flex flex-wrap gap-3 text-sm">{result.links.map((link) => <a className="text-accent underline" href={link.href} target="_blank" rel="noreferrer" key={link.href}>{link.label}</a>)}</div></Card>; }
function CopyBox({ title, value, onCopy }: { title: string; value: string; onCopy: (value: string) => void }) { return <div><div className="flex items-center justify-between"><h3 className="font-bold text-navy">{title}</h3><button className="min-h-11 text-accent" onClick={() => onCopy(value)} aria-label={`Salin ${title}`}><Copy size={18} /></button></div><p className="mt-2 whitespace-pre-wrap rounded-control bg-tint p-3 text-sm text-text-body">{value.split(/(\[ISI:[^\]]+\])/g).map((part, index) => part.startsWith("[ISI:") ? <mark className="rounded bg-warn-bg px-1 text-warn" key={index}>{part}</mark> : part)}</p></div>; }
