"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BarChart3, FileText, Home, Landmark, Menu, Settings, Tag } from "lucide-react";
import { BottomSheet, Button, Card, EmptyState } from "./ui";
import { InstallPrompt } from "./install-prompt";
import { LabelMockup } from "./label-mockup";
import { useSessionStore } from "@/lib/state/session-store";
import { getDemoPreset } from "@/lib/data/presets";
import { HomeDashboard } from "./home-dashboard";
import { FinanceIntake } from "./finance-intake";
import { FinanceStress } from "./finance-stress";
import { LabelPage } from "./label-page";
import { ReportPage } from "./report-page";
import { ConnectionStatus } from "./connection-status";
import { SettingsPage } from "./settings-page";

const navigation = [
  { href: "/app", label: "Beranda", icon: Home },
  { href: "/keuangan", label: "Keuangan", icon: Landmark },
  { href: "/label", label: "Label", icon: Tag },
  { href: "/laporan", label: "Laporan", icon: FileText },
  { href: "/pengaturan", label: "Pengaturan", icon: Settings },
];

const pageCopy: Record<string, { title: string; description: string }> = {
  "/app": { title: "Selamat datang di NAIK.IN", description: "Ruang tenang untuk menyiapkan usaha sebelum berkembang." },
  "/keuangan": { title: "Keuangan", description: "Siapkan ringkasan keuangan usaha dengan data yang mudah dipahami." },
  "/keuangan/stress": { title: "Stress Test Kesiapan Bayar", description: "Uji cicilan dengan skenario usaha sepi, tanpa menggantikan keputusan bank." },
  "/label": { title: "Label", description: "Periksa kelengkapan label kemasan sebelum melangkah lebih jauh." },
  "/laporan": { title: "Laporan", description: "Rangkum persiapan usaha dalam satu laporan yang rapi." },
  "/pengaturan": { title: "Pengaturan", description: "Atur mode, bahasa data, dan informasi aplikasi." },
};

export function AppShell() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { mode, presetId, business, confirmedTransactions, selectPreset, enterLiveMode } = useSessionStore();
  const copy = pageCopy[pathname] ?? pageCopy["/app"];
  const isActive = (href: string) => pathname === href || (href !== "/app" && pathname.startsWith(href));
  async function enterLiveSafely() {
    try {
      const response = await fetch("/api/diagnostics", { cache: "no-store" });
      const diagnostics = await response.json() as { ai?: boolean };
      if (diagnostics.ai) enterLiveMode();
      else selectPreset(presetId);
    } catch {
      selectPreset(presetId);
    }
  }

  useEffect(() => {
    if (mode === "demo" && !business) selectPreset("bu-sari");
    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker?.register("/sw.js").catch(() => undefined);
    } else if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister();
        }
      });
      if (typeof caches !== "undefined") {
        caches.keys().then((keys) => {
          for (const key of keys) {
            caches.delete(key);
          }
        });
      }
    }
  }, [business, mode, selectPreset]);

  return (
    <div className="min-h-screen bg-bg">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-16 border-r border-border bg-surface px-2 py-5 lg:w-[264px] lg:px-4 md:block">
        <div className="mb-8 flex items-center gap-3 px-2"><Logo /><span className="hidden text-sm font-bold text-navy lg:block">NAIK.IN</span></div>
        <nav className="space-y-2" aria-label="Navigasi utama">{navigation.map((item) => <NavItem key={item.href} {...item} active={isActive(item.href)} compact />)}</nav>
      </aside>

      <header className="sticky top-0 z-20 border-b border-border bg-bg/95 px-4 py-3 backdrop-blur md:ml-16 lg:ml-[264px] lg:px-8">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-3">
          <div className="flex items-center gap-3"><button className="flex min-h-11 min-w-11 items-center justify-center rounded-control text-navy hover:bg-tint md:hidden" onClick={() => setMenuOpen(true)} aria-label="Buka menu"><Menu size={21} /></button><div className="md:hidden"><Logo /></div><div className="hidden text-sm text-muted sm:block">Know Your Business. Prepare to Grow.</div></div>
          <div className="flex items-center gap-2"><ConnectionStatus /><span className={`hidden min-h-8 items-center rounded-full px-3 text-xs font-bold sm:inline-flex ${mode === "demo" ? "bg-tint text-navy" : "bg-accent text-white"}`}>Mode {mode === "demo" ? "Demo" : "Live"}</span>{mode === "demo" && <Button variant="ghost" onClick={() => void enterLiveSafely()}>Mode Live</Button>}</div>
        </div>
      </header>

      <main className="px-4 pb-28 pt-6 md:ml-16 md:px-8 md:pb-10 lg:ml-[264px]">
        <div className="mx-auto max-w-[1120px]">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-2 text-sm font-bold text-accent">NAIK.IN</p><h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">{copy.title}</h1><p className="mt-2 max-w-2xl text-sm text-muted sm:text-base">{copy.description}</p></div><InstallPrompt /></div>
          {mode === "live" && <div className="mb-5 rounded-card border border-warn/30 bg-warn-bg p-4 text-sm text-text-body" role="note"><strong className="text-navy">Catatan privasi:</strong> data bisa dipakai Google untuk perbaikan produk. Gunakan data contoh untuk demo.</div>}
          {pathname === "/app" ? <HomeDashboard /> : pathname === "/keuangan" ? <FinanceIntake /> : pathname === "/keuangan/stress" ? <FinanceStress /> : pathname === "/label" ? <LabelPage /> : pathname === "/laporan" ? <ReportPage /> : pathname === "/pengaturan" ? <SettingsPage /> : mode === "demo" ? <><Card className="mb-6 border-accent/20 bg-tint/50"><div className="flex items-start gap-3"><BarChart3 className="mt-0.5 shrink-0 text-accent" size={21} aria-hidden="true" /><div><p className="font-bold text-navy">Mode Demo aktif · {business?.nama}</p><p className="mt-1 text-sm text-text-body">{confirmedTransactions.length} transaksi sintetis dari 90 hari siap dijelajahi tanpa koneksi.</p></div></div></Card><Card className="mb-6"><div className="mb-4 flex items-end justify-between"><div><h2 className="text-lg font-bold text-navy">Kemasan contoh</h2><p className="text-sm text-muted">Mockup internal tanpa gambar eksternal.</p></div><span className="text-sm font-bold text-accent">Sampel {presetId === "bu-sari" ? "A" : "B"}</span></div><LabelMockup preset={getDemoPreset(presetId)} /></Card></> : <EmptyState title="Mode Live belum tersedia" description="Alur unggahan nyata akan tersedia pada tahap berikutnya. Mode Demo tetap bisa digunakan tanpa jaringan." action={<Button onClick={() => selectPreset("bu-sari")}>Kembali ke Mode Demo</Button>} />}
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur md:hidden" aria-label="Navigasi bawah">{navigation.map((item) => <NavItem key={item.href} {...item} active={isActive(item.href)} />)}</nav>

      <BottomSheet open={menuOpen} title="Menu" onClose={() => setMenuOpen(false)}><div className="space-y-2">{navigation.map((item) => <NavItem key={item.href} {...item} active={isActive(item.href)} onClick={() => setMenuOpen(false)} />)}</div></BottomSheet>
    </div>
  );
}

function Logo() {
  return <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy text-sm font-black text-white">N</span>;
}

function NavItem({ href, label, icon: Icon, active, compact = false, onClick }: { href: string; label: string; icon: typeof Home; active: boolean; compact?: boolean; onClick?: () => void }) {
  return <Link href={href} onClick={onClick} aria-current={active ? "page" : undefined} title={compact ? label : undefined} className={`flex min-h-11 items-center justify-center rounded-control px-3 text-sm font-bold transition-colors ${compact ? "gap-3 lg:justify-start" : "flex-1 flex-col gap-0.5 pt-1"} ${active ? "bg-navy text-white" : "text-navy hover:bg-tint"}`}><Icon size={19} aria-hidden="true" /><span className={compact ? "hidden lg:inline" : "text-[10px] sm:text-xs"}>{label}</span></Link>;
}
