"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, ScanLine, ShieldCheck, Sparkles } from "lucide-react";

function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-bg text-text-body">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3 text-navy" aria-label="NAIK.IN beranda"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-navy font-black text-white shadow-soft">N</span><span className="font-heading text-lg font-black">NAIK.IN</span></Link>
        <div className="flex items-center gap-2"><Link href="/masuk" className="min-h-11 rounded-control px-4 py-2 text-sm font-bold text-navy hover:bg-tint">Masuk</Link><Link href="/daftar" className="min-h-11 rounded-control bg-navy px-4 py-2 text-sm font-bold text-white hover:bg-navy-hover">Mulai</Link></div>
      </nav>
      <section className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-12 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:pb-28 lg:pt-20">
        <div className="relative z-10"><div className="mb-5 inline-flex items-center gap-2 rounded-full bg-tint px-4 py-2 text-sm font-bold text-accent"><Sparkles size={16} aria-hidden="true" />Ruang siap tumbuh untuk usaha pangan</div><h1 className="max-w-3xl font-heading text-5xl font-black leading-[1.05] tracking-tight text-navy sm:text-6xl">Catat dengan tenang.<br /><span className="text-accent">Tumbuh dengan yakin.</span></h1><p className="mt-6 max-w-xl text-lg leading-8 text-text-body">NAIK.IN membantu kamu membaca ruang kas, menyiapkan label, dan merangkai langkah berikutnya—tanpa bahasa yang membuat pusing.</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/daftar" className="inline-flex min-h-12 items-center gap-2 rounded-control bg-navy px-5 text-sm font-bold text-white shadow-soft hover:bg-navy-hover">Mulai gratis <ArrowRight size={18} aria-hidden="true" /></Link><Link href="/masuk" className="inline-flex min-h-12 items-center rounded-control bg-tint px-5 text-sm font-bold text-navy hover:bg-accent/15">Saya sudah punya akun</Link></div><p className="mt-5 text-xs text-muted">Mode Demo tetap tersedia tanpa akun atau koneksi internet.</p></div>
        <div className="relative"><div className="absolute -inset-8 rounded-full bg-accent/10 blur-3xl" aria-hidden="true" /><div className="relative rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_24px_80px_rgba(18,32,86,0.14)] backdrop-blur sm:p-7"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-accent">Kesiapan usaha</p><p className="mt-1 font-heading text-xl font-black text-navy">Ringkas, jernih, milikmu</p></div><ShieldCheck className="text-ok" size={28} aria-hidden="true" /></div><div className="grid gap-3 sm:grid-cols-2"><Feature icon={BarChart3} title="Keuangan" text="Lihat ruang kas saat usaha sepi." /><Feature icon={ScanLine} title="Produk" text="Periksa format label dan barcode." /></div><div className="mt-4 rounded-2xl bg-navy p-5 text-white"><p className="text-sm text-indigo-100">Semua angka dihitung oleh engine lokal.</p><p className="mt-2 font-heading text-2xl font-black">Siap melangkah lebih jelas</p></div></div></div>
      </section>
      <section className="border-y border-border bg-surface px-5 py-12 sm:px-8"><div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-3"><Feature icon={BarChart3} title="Baca kondisi usaha" text="Pisahkan pemasukan, biaya, dan kebutuhan rumah tangga." /><Feature icon={ScanLine} title="Scan dengan rapi" text="Periksa keterbacaan QR/barcode tanpa mengklaim persetujuan." /><Feature icon={ShieldCheck} title="Data tetap terkendali" text="Demo memakai data sintetis; Live memberi pilihan penyimpanan." /></div></section>
    </main>
  );
}

export default LandingPage;

function Feature({ icon: Icon, title, text }: { icon: typeof BarChart3; title: string; text: string }) {
  return <div className="rounded-card border border-border bg-surface p-5"><Icon className="text-accent" size={24} aria-hidden="true" /><h2 className="mt-4 font-heading text-lg font-black text-navy">{title}</h2><p className="mt-2 text-sm leading-6 text-muted">{text}</p></div>;
}
