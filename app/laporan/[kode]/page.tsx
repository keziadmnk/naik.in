import { ReportReader } from "@/components/report-reader";

export default async function PublicReportPage({ params }: { params: Promise<{ kode: string }> }) {
  const { kode } = await params;
  return <main className="min-h-screen bg-bg p-4 md:p-8"><div className="mx-auto max-w-[900px]"><ReportReader code={kode} /></div></main>;
}
