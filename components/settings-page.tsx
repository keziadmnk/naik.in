"use client";

import { Card } from "./ui";
import { useSessionStore } from "@/lib/state/session-store";
import { useEffect, useState } from "react";

export function SettingsPage() {
  const mode = useSessionStore((state) => state.mode);
  const [diagnostics, setDiagnostics] = useState<{ ai: boolean; database: boolean } | null>(null);
  const [diagnosticError, setDiagnosticError] = useState("");

  async function loadDiagnostics() {
    setDiagnosticError("");
    try {
      const response = await fetch("/api/diagnostics", { cache: "no-store" });
      if (!response.ok) throw new Error("Status diagnostik tidak tersedia.");
      setDiagnostics(await response.json() as { ai: boolean; database: boolean });
    } catch (error) {
      setDiagnosticError(error instanceof Error ? error.message : "Status diagnostik tidak tersedia.");
    }
  }

  useEffect(() => { void loadDiagnostics(); }, []);

  return (
    <div className="space-y-5">
      {mode === "live" && (
        <div className="rounded-card border border-warn/30 bg-warn-bg p-4 text-sm text-text-body" role="note">
          <strong className="text-navy">Sebelum mengunggah:</strong> data bisa dipakai Google untuk perbaikan produk. Gunakan data contoh untuk demo.
        </div>
      )}
      <Card>
        <h2 className="text-xl font-bold text-navy">Tentang NAIK.IN</h2>
        <div className="mt-4 space-y-3 text-sm text-text-body">
          <p>NAIK.IN membantu usaha menyiapkan catatan keuangan dan kelengkapan informasi produk dengan bahasa yang mudah dipahami.</p>
          <p><strong>Sumber data:</strong> angka konteks berasal dari BI Sumbar via ANTARA, Survei BI, BI LPP, dan BPOM sesuai keterangan pada Beranda. Data preset adalah sintetis untuk demo.</p>
          <p><strong>Privasi:</strong> Mode Demo memakai data lokal dan cache tanpa panggilan jaringan. Pada Mode Live, jangan unggah data yang tidak ingin diproses oleh layanan pihak ketiga.</p>
          <p><strong>Disclaimer:</strong> alat ini membantu persiapan, bukan keputusan kredit atau persetujuan izin. Keputusan ada pada lembaga keuangan dan BPOM/Dinkes.</p>
        </div>
      </Card>
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="text-xl font-bold text-navy">Diagnostik</h2><p className="mt-1 text-sm text-muted">Hanya status koneksi; nilai kunci tidak pernah ditampilkan.</p></div>
          <button type="button" className="min-h-11 rounded-control bg-tint px-4 text-sm font-bold text-navy" onClick={() => void loadDiagnostics()}>Perbarui</button>
        </div>
        {diagnosticError ? <p className="mt-4 rounded-control bg-danger-bg p-3 text-sm text-danger" role="alert">{diagnosticError}</p> : diagnostics ? <dl className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-control bg-tint p-3"><dt className="text-sm text-muted">AI</dt><dd className={`font-bold ${diagnostics.ai ? "text-ok" : "text-warn"}`}>{diagnostics.ai ? "AI aktif" : "AI tidak aktif"}</dd></div><div className="rounded-control bg-tint p-3"><dt className="text-sm text-muted">Database</dt><dd className={`font-bold ${diagnostics.database ? "text-ok" : "text-warn"}`}>{diagnostics.database ? "Database aktif" : "Database tidak aktif"}</dd></div></dl> : <p className="mt-4 text-sm text-muted" role="status">Memeriksa status…</p>}
      </Card>
    </div>
  );
}
