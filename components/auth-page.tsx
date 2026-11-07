"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { Button, Card, Input } from "./ui";

export function AuthPage({ register = false }: { register?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nama, setNama] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true); setMessage("");
    const response = await fetch(register ? "/api/auth/register" : "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(register ? { email, name: nama, password } : { email, password }) });
    const result = await response.json() as { ok?: boolean; message?: string };
    if (!response.ok || !result.ok) setMessage(result.message ?? "Tidak dapat memproses permintaan.");
    else if (register) { setMessage("Akun berhasil dibuat."); window.setTimeout(() => window.location.assign("/app"), 500); }
    else window.location.assign("/app");
    setBusy(false);
  }

  return <main className="grid min-h-screen bg-bg lg:grid-cols-2"><section className="hidden bg-navy p-12 text-white lg:flex lg:flex-col lg:justify-between"><Link href="/" className="flex items-center gap-3 font-heading text-lg font-black"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-navy">N</span>NAIK.IN</Link><div><p className="mb-4 text-sm font-bold text-indigo-200">Know Your Business. Prepare to Grow.</p><h1 className="font-heading text-5xl font-black leading-tight">{register ? "Buat ruang untuk usaha yang lebih siap." : "Selamat datang kembali."}</h1><p className="mt-5 max-w-md leading-7 text-indigo-100">Akun lokal menyimpan workspace usaha di database PostgreSQL milikmu.</p></div><p className="text-xs text-indigo-200">Laporan bukan keputusan kredit atau persetujuan izin.</p></section><section className="flex items-center justify-center p-5 sm:p-10"><Card className="w-full max-w-md p-7 sm:p-9"><Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-accent"><ArrowLeft size={16} aria-hidden="true" />Kembali</Link><div className="mb-7"><p className="text-sm font-bold text-accent">NAIK.IN</p><h1 className="mt-2 font-heading text-3xl font-black text-navy">{register ? "Buat akun" : "Masuk ke akun"}</h1><p className="mt-2 text-sm text-muted">{register ? "Simpan workspace usaha dan lanjutkan kapan saja." : "Lanjutkan persiapan usaha dari perangkat mana pun."}</p></div><div className="space-y-4">{register && <Input label="Nama" value={nama} onChange={(event) => setNama(event.target.value)} autoComplete="name" />}<Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /><Input label="Kata sandi" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={register ? "new-password" : "current-password"} /><Button className="w-full" onClick={() => void submit()} disabled={busy}>{busy ? "Memproses…" : register ? "Daftar" : "Masuk"}</Button></div>{message && <p className="mt-4 rounded-control bg-tint p-3 text-sm text-text-body" role="status">{message}</p>}<p className="mt-6 text-center text-sm text-muted">{register ? "Sudah punya akun? " : "Belum punya akun? "}<Link href={register ? "/masuk" : "/daftar"} className="font-bold text-accent">{register ? "Masuk" : "Daftar"}</Link></p><p className="mt-5 flex items-center justify-center gap-2 text-xs text-muted"><Mail size={14} aria-hidden="true" /> Email dipakai hanya untuk autentikasi akun lokal.</p></Card></section></main>;
}
