"use client";

import Link from "next/link";
import { ArrowRight, Landmark, PackageCheck, ShieldCheck } from "lucide-react";
import { Card, Tooltip } from "./ui";
import { ProfileWizard } from "./profile-wizard";
import { useSessionStore } from "@/lib/state/session-store";

const facts = [
  { value: "Rp30,20 T", text: "Kredit UMKM Sumbar, kontraksi 1,41% (triwulan II-2026).", source: "BI Sumbar via ANTARA, 31 Okt 2026." },
  { value: "4,64%", text: "NPL UMKM Sumbar, turun dari 4,68% tetapi masih mendekati ambang 5%.", source: "BI Sumbar via ANTARA, 31 Okt 2026.", term: "NPL" },
  { value: "4,54%", text: "NPL UMKM nasional, naik dari 4,41%.", source: "OJK via Kontan, Juni 2026.", term: "NPL" },
  { value: "Selective lending", text: "Bank melakukan selective lending.", source: "BI via Kumparan, Mei 2026." },
  { value: "59,21%", text: "UMKM mencampur rekening.", source: "Survei BI (304 UMKM), 2023." },
  { value: "58,22%", text: "UMKM tidak mencatat formal.", source: "Survei BI (304 UMKM), 2023." },
  { value: ">768 ribu", text: "Merchant QRIS Sumbar.", source: "BI LPP, Agustus 2026." },
  { value: "82%", text: "Perusahaan pangan olahan terdaftar BPOM adalah UMKM.", source: "BPOM, Juni 2026." },
  { value: "Barcode", text: "Barcode dibutuhkan untuk ritel modern menurut Mendag.", source: "Mendag, Oktober 2026." },
];

export function HomeDashboard() {
  const { business, mode, presetId } = useSessionStore();
  const presetName = presetId === "bu-sari" ? "Bu Sari" : "Uni Dewi";
  return (
    <div className="space-y-6">
      <section className="rounded-card bg-navy p-6 text-white shadow-soft sm:p-8">
        <p className="mb-3 text-sm font-bold text-indigo-200">Langkah kecil, arah yang lebih jelas</p>
        <h2 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">Apakah usahamu siap tumbuh?</h2>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-indigo-100 sm:text-base">Pahami kondisi usaha sebelum mengambil langkah berikutnya. Pilih satu pintu atau gunakan keduanya—kamu yang menentukan ritmenya.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2" aria-label="Pintu masuk kesiapan">
        <Link href="/keuangan" className="group rounded-card border border-border bg-surface p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-accent">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-tint text-navy"><Landmark size={24} /></div>
          <h2 className="text-xl font-bold text-navy">Kesiapan Keuangan</h2>
          <p className="mt-2 text-sm text-muted">Lihat ruang napas usaha saat penjualan sedang sepi sebelum membahas pinjaman.</p>
          <span className="mt-5 inline-flex items-center text-sm font-bold text-accent">Mulai dari keuangan <ArrowRight className="ml-2 transition group-hover:translate-x-1" size={17} /></span>
        </Link>
        <Link href="/label" className="group rounded-card border border-border bg-surface p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-accent">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-tint text-navy"><PackageCheck size={24} /></div>
          <h2 className="text-xl font-bold text-navy">Kesiapan Produk</h2>
          <p className="mt-2 text-sm text-muted">Periksa kelengkapan informasi kemasan sebelum menuju izin atau ritel.</p>
          <span className="mt-5 inline-flex items-center text-sm font-bold text-accent">Mulai dari produk <ArrowRight className="ml-2 transition group-hover:translate-x-1" size={17} /></span>
        </Link>
      </section>

      <Card><div className="mb-4 flex items-center gap-3"><ShieldCheck className="text-accent" size={22} /><div><h2 className="text-xl font-bold text-navy">Status sesi</h2><p className="text-sm text-muted">Konteks yang sedang kamu gunakan.</p></div></div><div className="grid gap-3 text-sm sm:grid-cols-3"><div className="rounded-control bg-tint p-3"><span className="block text-muted">Preset aktif</span><strong className="text-navy">{presetName}</strong></div><div className="rounded-control bg-tint p-3"><span className="block text-muted">Mode</span><strong className="text-navy">Mode {mode === "demo" ? "Demo" : "Live"}</strong></div><div className="rounded-control bg-tint p-3"><span className="block text-muted">Profil usaha</span><strong className="text-navy">{business?.nama ?? "Belum diisi"}</strong></div></div></Card>

      <Card><div className="mb-5"><h2 className="text-xl font-bold text-navy">Mengapa ini penting?</h2><p className="mt-1 text-sm text-muted">Angka berikut membantu memberi konteks, bukan menggantikan keputusan lembaga resmi.</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{facts.map((fact) => <div key={`${fact.value}-${fact.source}`} className="rounded-control border border-border p-4"><div className="text-2xl font-bold text-navy">{fact.term ? <Tooltip text="Artinya apa? NPL adalah rasio kredit bermasalah.">{fact.value} <span className="text-sm">NPL</span></Tooltip> : fact.value}</div><p className="mt-2 text-sm text-text-body">{fact.text}</p><p className="mt-3 text-xs text-muted">Sumber: {fact.source}</p></div>)}</div></Card>

      <Card><h2 className="text-xl font-bold text-navy">Istilah yang akan kamu temui</h2><div className="mt-4 flex flex-wrap gap-3 text-sm text-text-body"><Tooltip text="Artinya apa? KUR adalah Kredit Usaha Rakyat.">KUR</Tooltip><Tooltip text="Artinya apa? HPP adalah Harga Pokok Penjualan, yaitu biaya langsung untuk membuat produk.">HPP</Tooltip><Tooltip text="Artinya apa? SPP-IRT adalah Sertifikat Pemenuhan Komitmen Produksi Pangan Industri Rumah Tangga.">SPP-IRT</Tooltip><Tooltip text="Artinya apa? MD adalah nomor izin edar BPOM untuk produk pangan tertentu.">MD</Tooltip><Tooltip text="Artinya apa? NIB adalah Nomor Induk Berusaha.">NIB</Tooltip></div></Card>

      <ProfileWizard />
    </div>
  );
}
