"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "./ui";
import { ReportPage, type ReportSnapshot } from "./report-page";

export function ReportReader({ code }: { code: string }) {
  const [snapshot, setSnapshot] = useState<ReportSnapshot | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch(`/api/report/${code}`).then(async (response) => {
      const result = await response.json() as { report?: { isi: ReportSnapshot }; error?: string };
      if (!response.ok || !result.report) throw new Error(result.error ?? "Laporan tidak ditemukan.");
      setSnapshot(result.report.isi);
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Laporan tidak dapat dibuka."));
  }, [code]);
  if (error) return <EmptyState title="Laporan tidak tersedia" description={error} />;
  if (!snapshot) return <p className="p-8 text-center text-muted">Membuka laporan…</p>;
  return <ReportPage snapshot={snapshot} readOnly code={code} />;
}
