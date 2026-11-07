"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

export function FinanceSummaryChart({ data, quietKey }: { data: Array<{ key: string; omzet: number; laba: number }>; quietKey?: string }) {
  return <ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="#E7E5DD" /><XAxis dataKey="key" tick={{ fontSize: 11 }} /><YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1000000)} jt`} tick={{ fontSize: 11 }} /><Tooltip formatter={(value: number) => money(value)} /><Bar dataKey="omzet" name="Omzet" fill="#122056" radius={[4, 4, 0, 0]}>{data.map((week) => <Cell key={`omzet-${week.key}`} fill={week.key === quietKey ? "#5B65DC" : "#122056"} />)}</Bar><Bar dataKey="laba" name="Laba" fill="#5B65DC" radius={[4, 4, 0, 0]}>{data.map((week) => <Cell key={`laba-${week.key}`} fill={week.key === quietKey ? "#B7791F" : "#5B65DC"} />)}</Bar></BarChart></ResponsiveContainer>;
}

export function StressChart({ data }: { data: Array<{ nama: string; nilai: number }> }) {
  return <ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="#E7E5DD" /><XAxis dataKey="nama" tick={{ fontSize: 11 }} /><YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1_000_000)} jt`} /><Tooltip formatter={(value: number) => money(value)} /><Bar dataKey="nilai" fill="#122056">{data.map((item) => <Cell key={item.nama} fill={item.nama === "Cicilan" ? "#5B65DC" : "#122056"} />)}</Bar></BarChart></ResponsiveContainer>;
}
