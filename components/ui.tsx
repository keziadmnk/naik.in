"use client";

import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  Info,
  LoaderCircle,
  X,
} from "lucide-react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={`min-h-11 rounded-control px-4 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        variant === "primary"
          ? "bg-navy text-white hover:bg-navy-hover"
          : variant === "secondary"
            ? "bg-tint text-navy hover:bg-accent/15"
            : "text-navy hover:bg-tint"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <section className={`rounded-card border border-border bg-surface p-5 shadow-soft ${className}`}>{children}</section>;
}

const statusStyles = {
  siap: { label: "Siap", icon: CheckCircle2, className: "bg-ok-bg text-ok" },
  "hati-hati": { label: "Hati-hati", icon: AlertCircle, className: "bg-warn-bg text-warn" },
  "belum-siap": { label: "Belum siap", icon: AlertCircle, className: "bg-danger-bg text-danger" },
} as const;

export function StatusBadge({ status }: { status: keyof typeof statusStyles }) {
  const item = statusStyles[status];
  const Icon = item.icon;
  return (
    <span className={`inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-bold ${item.className}`}>
      <Icon size={17} aria-hidden="true" />
      {item.label}
    </span>
  );
}

export function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex min-h-8 items-center rounded-full bg-tint px-3 text-xs font-bold text-navy ${className}`}>{children}</span>;
}

export function Input({ label, hint, className = "", ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string }) {
  return (
    <label className="block space-y-2 text-sm font-bold text-navy">
      {label && <span>{label}</span>}
      <input className={`min-h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-normal text-text-body placeholder:text-muted ${className}`} {...props} />
      {hint && <span className="block text-xs font-normal text-muted">{hint}</span>}
    </label>
  );
}

export function Select({ label, children, className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className="block space-y-2 text-sm font-bold text-navy">
      {label && <span>{label}</span>}
      <span className="relative block">
        <select className={`min-h-11 w-full appearance-none rounded-control border border-border bg-surface px-3 pr-10 text-sm font-normal text-text-body ${className}`} {...props}>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-3.5 text-muted" size={17} aria-hidden="true" />
      </span>
    </label>
  );
}

export function Slider({ label, value, onChange, min = 0, max = 100, step = 1 }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <label className="block space-y-2 text-sm font-bold text-navy">
      <span className="flex items-center justify-between"><span>{label}</span><span className="text-accent">{value}</span></span>
      <input aria-label={label} className="h-2 w-full accent-accent" type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

export function Tabs({ items, active, onChange }: { items: string[]; active: string; onChange: (item: string) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-control bg-tint p-1" role="tablist">
      {items.map((item) => (
        <button key={item} type="button" role="tab" aria-selected={active === item} onClick={() => onChange(item)} className={`min-h-11 whitespace-nowrap rounded-xl px-4 text-sm font-bold ${active === item ? "bg-navy text-white" : "text-navy hover:bg-white/70"}`}>
          {item}
        </button>
      ))}
    </div>
  );
}

export function Tooltip({ children, text = "Artinya apa?" }: { children: ReactNode; text?: string }) {
  return <span className="group relative inline-flex items-center gap-1" tabIndex={0} aria-label={text}>{children}<Info size={15} className="text-accent" aria-hidden="true" /><span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-max max-w-56 -translate-x-1/2 rounded-lg bg-navy px-3 py-2 text-xs font-normal text-white shadow-soft group-hover:block group-focus-within:block">{text}</span></span>;
}

export function Dialog({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4" role="presentation" onMouseDown={onClose} onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}><div role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabIndex={-1} className="w-full max-w-lg rounded-card bg-surface p-6 shadow-soft" onMouseDown={(event) => event.stopPropagation()}><div className="mb-5 flex items-center justify-between"><h2 id="dialog-title" className="text-xl font-bold text-navy">{title}</h2><Button variant="ghost" aria-label="Tutup" onClick={onClose}><X size={20} aria-hidden="true" /></Button></div>{children}</div></div>;
}

export function BottomSheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 bg-navy/40" role="presentation" onMouseDown={onClose}><div className="absolute inset-x-0 bottom-0 rounded-t-card bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]" role="dialog" aria-modal="true" aria-labelledby="sheet-title" onMouseDown={(event) => event.stopPropagation()}><div className="mx-auto mb-4 h-1 w-12 rounded-full bg-border" /><div className="mb-4 flex items-center justify-between"><h2 id="sheet-title" className="text-xl font-bold text-navy">{title}</h2><Button variant="ghost" aria-label="Tutup" onClick={onClose}><X size={20} /></Button></div>{children}</div></div>;
}

export function Toast({ message, onClose }: { message: string; onClose?: () => void }) {
  return <div className="fixed bottom-5 left-1/2 z-50 flex min-h-11 -translate-x-1/2 items-center gap-3 rounded-control bg-navy px-4 py-3 text-sm font-bold text-white shadow-soft" role="status"><Check size={18} />{message}{onClose && <button className="ml-2" onClick={onClose} aria-label="Tutup notifikasi"><X size={16} /></button>}</div>;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-tint ${className}`} aria-hidden="true" />;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="flex min-h-56 flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface p-6 text-center"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-tint text-accent"><LoaderCircle size={24} /></div><h2 className="text-lg font-bold text-navy">{title}</h2><p className="mt-2 max-w-md text-sm text-muted">{description}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return <div className="rounded-card border border-danger/20 bg-danger-bg p-5 text-danger" role="alert"><div className="flex items-start gap-3"><AlertCircle className="mt-0.5 shrink-0" size={20} /><div><h2 className="font-bold">Ada kendala</h2><p className="mt-1 text-sm">Coba lagi sebentar. Data yang sudah tersimpan tetap aman.</p>{onRetry && <Button variant="secondary" className="mt-4" onClick={onRetry}>Coba lagi</Button>}</div></div></div>;
}
