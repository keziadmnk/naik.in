"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CircleHelp } from "lucide-react";
import { Button, Card, Input, Select, Tooltip } from "./ui";
import { useSessionStore } from "@/lib/state/session-store";
import type { Business, JsonValue } from "@/lib/data/types";

type ProductType = "kering" | "olahan_basah" | "beku" | "minuman" | "lainnya";
type Legalitas = {
  nib: boolean;
  pirt: boolean;
  bpom: boolean;
  halal: boolean;
};

const productOptions: Array<{ value: ProductType; label: string }> = [
  { value: "kering", label: "Kering / keripik" },
  { value: "olahan_basah", label: "Olahan basah" },
  { value: "beku", label: "Beku" },
  { value: "minuman", label: "Minuman" },
  { value: "lainnya", label: "Lainnya" },
];

const defaultLegalitas: Legalitas = { nib: false, pirt: false, bpom: false, halal: false };

function readLegalitas(value: JsonValue): Legalitas {
  if (!value || Array.isArray(value) || typeof value !== "object") return defaultLegalitas;
  const legalitas = value as Record<string, JsonValue>;
  return {
    nib: legalitas.nib === true,
    pirt: legalitas.pirt === true,
    bpom: legalitas.bpom === true,
    halal: legalitas.halal === true,
  };
}

function productTypeFor(value: string): ProductType {
  if (value.includes("keripik") || value === "Kering") return "kering";
  if (value.toLocaleLowerCase().includes("beku")) return "beku";
  if (value.toLocaleLowerCase().includes("minum")) return "minuman";
  if (value.toLocaleLowerCase().includes("basah")) return "olahan_basah";
  return "lainnya";
}

export function ProfileWizard() {
  const { business, setBusiness } = useSessionStore();
  const [step, setStep] = useState(1);
  const [saved, setSaved] = useState(false);
  const [nama, setNama] = useState("");
  const [kota, setKota] = useState("");
  const [jenisProduk, setJenisProduk] = useState<ProductType>("kering");
  const [usiaUsahaBulan, setUsiaUsahaBulan] = useState(0);
  const [legalitas, setLegalitas] = useState<Legalitas>(defaultLegalitas);

  useEffect(() => {
    if (!business) return;
    setNama(business.nama);
    setKota(business.kota);
    setJenisProduk(productTypeFor(business.jenisProduk));
    setUsiaUsahaBulan(business.usiaUsahaBulan);
    setLegalitas(readLegalitas(business.legalitas));
  }, [business]);

  const productLabel = useMemo(() => productOptions.find((option) => option.value === jenisProduk)?.label ?? "Lainnya", [jenisProduk]);
  const canContinue = step === 1 ? nama.trim().length > 0 && kota.trim().length > 0 : step === 2 ? usiaUsahaBulan >= 0 : true;

  const save = () => {
    const nextBusiness: Business = {
      id: business?.id ?? `profil-${Date.now()}`,
      nama: nama.trim(),
      kota: kota.trim(),
      jenisProduk: productLabel,
      usiaUsahaBulan,
      legalitas,
      dibuat: business?.dibuat ?? new Date().toISOString(),
    };
    setBusiness(nextBusiness);
    setSaved(true);
  };

  return (
    <Card>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-accent"><CircleHelp size={17} /> Profil usaha</div>
          <h2 className="text-xl font-bold text-navy">Kenalan dengan usahamu</h2>
          <p className="mt-1 text-sm text-muted">Data ini membantu memilih langkah berikutnya. Kamu bisa mengubahnya kapan saja.</p>
        </div>
        <span className="whitespace-nowrap text-sm font-bold text-muted">{step}/3</span>
      </div>
      <div className="mb-6 flex gap-2" aria-label="Tahap profil usaha">
        {[1, 2, 3].map((item) => <span key={item} className={`h-1.5 flex-1 rounded-full ${item <= step ? "bg-accent" : "bg-tint"}`} />)}
      </div>

      {step === 1 && <div className="grid gap-4 sm:grid-cols-2"><Input label="Nama usaha" placeholder="Contoh: Dapur Sari" value={nama} onChange={(event) => setNama(event.target.value)} /><Input label="Kota" placeholder="Contoh: Padang" value={kota} onChange={(event) => setKota(event.target.value)} /></div>}
      {step === 2 && <div className="grid gap-4 sm:grid-cols-2"><Select label="Jenis produk" value={jenisProduk} onChange={(event) => setJenisProduk(event.target.value as ProductType)}>{productOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select><Input label="Usia usaha (bulan)" type="number" min={0} value={usiaUsahaBulan} onChange={(event) => setUsiaUsahaBulan(Math.max(0, Number(event.target.value) || 0))} /></div>}
      {step === 3 && <div><p className="mb-3 text-sm text-text-body">Centang yang sudah dimiliki. Ini informasi awal, bukan penilaian atau keputusan izin.</p><div className="grid gap-3 sm:grid-cols-2">{([["nib", "NIB"], ["pirt", <Tooltip key="pirt" text="Artinya apa? SPP-IRT adalah jalur izin untuk pangan risiko rendah.">SPP-IRT</Tooltip>], ["bpom", <Tooltip key="bpom" text="Artinya apa? MD adalah nomor izin edar BPOM untuk produk tertentu.">Izin edar BPOM (MD)</Tooltip>], ["halal", "Sertifikat halal"] ] as const).map(([key, label]) => <label key={key} className="flex min-h-11 items-center gap-3 rounded-control border border-border px-3 text-sm font-bold text-navy hover:bg-tint"><input type="checkbox" checked={legalitas[key]} onChange={(event) => setLegalitas((current) => ({ ...current, [key]: event.target.checked }))} className="h-5 w-5 accent-accent" />{label}</label>)}</div>{jenisProduk === "beku" && <div className="mt-4 rounded-control bg-warn-bg p-3 text-sm text-warn">Produk beku akan diarahkan ke jalur informasi izin yang perlu dicek lebih lanjut.</div>}</div>}

      <div className="mt-6 flex flex-wrap justify-between gap-3"><Button variant="ghost" disabled={step === 1} onClick={() => setStep((current) => current - 1)}><ArrowLeft className="mr-2 inline" size={17} />Kembali</Button>{step < 3 ? <Button disabled={!canContinue} onClick={() => setStep((current) => current + 1)}>Lanjut<ArrowRight className="ml-2 inline" size={17} /></Button> : <Button onClick={save}><Check className="mr-2 inline" size={17} />Simpan profil</Button>}</div>
      {saved && <p className="mt-4 text-sm font-bold text-ok" role="status">Profil tersimpan di sesi ini.</p>}
    </Card>
  );
}
