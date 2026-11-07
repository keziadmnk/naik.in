export type SessionTransaction = {
  id: string;
  tanggal: string;
  uraian: string;
  kategori: string;
  nominal: number;
  arah: "masuk" | "keluar";
};

export const FINANCE_CATEGORIES = [
  "Pemasukan usaha",
  "HPP",
  "Opex tetap",
  "Opex variabel",
  "Kewajiban",
  "Pribadi/rumah tangga",
  "Bukan transaksi usaha",
] as const;

export type FinanceCategory = (typeof FINANCE_CATEGORIES)[number];
export type ClassifiedTransaction = SessionTransaction & { keyakinan: number };

const KEYWORDS: Array<{ category: FinanceCategory; words: string[] }> = [
  { category: "Pribadi/rumah tangga", words: ["beras", "sekolah", "dapur rumah", "rumah tangga", "pribadi", "pulsa pribadi"] },
  { category: "HPP", words: ["cabai", "cabe", "beras produksi", "plastik kemasan", "kemasan", "bumbu", "gas", "bahan", "upah borongan"] },
  { category: "Opex tetap", words: ["sewa", "gaji", "listrik", "air usaha", "internet usaha"] },
  { category: "Opex variabel", words: ["ongkir", "komisi marketplace", "admin qris", "iklan", "servis alat", "retribusi"] },
  { category: "Kewajiban", words: ["cicilan", "angsuran", "pinjaman"] },
  { category: "Bukan transaksi usaha", words: ["top up", "transfer pribadi", "refund", "tarik tunai"] },
];

export function classifyByDictionary(transaction: SessionTransaction): ClassifiedTransaction | null {
  const text = transaction.uraian.toLocaleLowerCase("id-ID");
  const match = KEYWORDS.find(({ words }) => words.some((word) => text.includes(word)));
  if (!match) return null;
  return { ...transaction, kategori: match.category, keyakinan: 0.95 };
}

export function classifyKnown(transaction: SessionTransaction): ClassifiedTransaction {
  if (transaction.kategori && FINANCE_CATEGORIES.includes(transaction.kategori as FinanceCategory)) {
    return { ...transaction, kategori: transaction.kategori, keyakinan: 0.9 };
  }
  if (transaction.arah === "masuk") return { ...transaction, kategori: "Pemasukan usaha", keyakinan: 0.82 };
  return { ...transaction, kategori: "Bukan transaksi usaha", keyakinan: 0.4 };
}

export function classifyInLayers(transactions: SessionTransaction[]): { classified: ClassifiedTransaction[]; remaining: SessionTransaction[] } {
  const classified: ClassifiedTransaction[] = [];
  const remaining: SessionTransaction[] = [];
  for (const transaction of transactions) {
    const dictionary = classifyByDictionary(transaction);
    if (dictionary) classified.push(dictionary);
    else remaining.push(transaction);
  }
  return { classified, remaining };
}
