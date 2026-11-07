import {
  FULL_WEEK_MINIMUM_RECORDED_DAYS,
  MONTH_NORMALIZATION_DAYS,
  WEEKS_PER_MONTH,
} from "../../config/thresholds";

export type Transaction = {
  date: string | Date;
  amount: number;
  category: string;
  direction?: "in" | "out";
};

export type AggregatePeriod = {
  key: string;
  total: number;
  recordedDays: number;
  transactions: Transaction[];
};

function toDate(value: string | Date): Date {
  const date = value instanceof Date ? new Date(value) : new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new Error(`Tanggal transaksi tidak valid: ${String(value)}`);
  return date;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function weekStart(date: Date): Date {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = result.getUTCDay();
  result.setUTCDate(result.getUTCDate() - (day === 0 ? 6 : day - 1));
  return result;
}

function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

function grouped(transactions: Transaction[], keyFor: (date: Date) => string): AggregatePeriod[] {
  const groups = new Map<string, Transaction[]>();
  const days = new Map<string, Set<string>>();
  for (const transaction of transactions) {
    const date = toDate(transaction.date);
    const key = keyFor(date);
    groups.set(key, [...(groups.get(key) ?? []), transaction]);
    const recorded = days.get(key) ?? new Set<string>();
    recorded.add(dayKey(date));
    days.set(key, recorded);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, items]) => ({
    key,
    total: items.reduce((sum, item) => sum + item.amount, 0),
    recordedDays: days.get(key)?.size ?? 0,
    transactions: items,
  }));
}

export function aggregateByDay(transactions: Transaction[]): AggregatePeriod[] {
  return grouped(transactions, dayKey);
}

export function aggregateByWeek(transactions: Transaction[]): AggregatePeriod[] {
  return grouped(transactions, (date) => dayKey(weekStart(date)));
}

export function aggregateByMonth(transactions: Transaction[]): AggregatePeriod[] {
  return grouped(transactions, monthKey);
}

export function fullWeeks(transactions: Transaction[]): AggregatePeriod[] {
  return aggregateByWeek(transactions).filter((week) => week.recordedDays >= FULL_WEEK_MINIMUM_RECORDED_DAYS);
}

export function normalizeToMonth(total: number, days: number): number {
  if (!Number.isFinite(total) || !Number.isFinite(days) || days <= 0) throw new Error("Total dan jumlah hari harus valid; jumlah hari harus lebih dari nol.");
  return total * MONTH_NORMALIZATION_DAYS / days;
}

export function normalizeWeeksToMonth(total: number): number {
  return total * WEEKS_PER_MONTH;
}
