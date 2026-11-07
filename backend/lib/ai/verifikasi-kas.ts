export type BarisKas = {
  row_index: number;
  direction: "IN" | "OUT" | "SETTLEMENT";
  amount: number | null;
  balance_after: number | null;
  is_unclear: boolean;
  confidence: number;
  review_note: string | null;
  field_issues?: { field: "date" | "description" | "amount" | "direction" | "category"; problem: string; suggestion: string | null }[];
};

export type TotalTertulis = {
  opening_balance: number | null;
  total_in: number | null;
  total_out: number | null;
  closing_balance: number | null;
};

export type HasilVerifikasi = {
  saldo_dicek: number;
  saldo_cocok: number;
  baris_tidak_cocok: number[];
  rincian: { row_index: number; pesan: string }[];
  total_masuk_cocok: boolean | null;
  total_keluar_cocok: boolean | null;
  saldo_akhir_cocok: boolean | null;
};

const arahTanda = (d: BarisKas["direction"]) => (d === "IN" ? 1 : -1);
const rp = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;

export function verifikasiKas(baris: BarisKas[], total: TotalTertulis | null): HasilVerifikasi {
  const rincian: HasilVerifikasi["rincian"] = [];
  let dicek = 0;
  let cocok = 0;
  let saldo: number | null = total?.opening_balance ?? null;
  for (const b of baris) {
    const nominal = b.amount;
    if (b.balance_after !== null && saldo !== null && nominal !== null) {
      dicek += 1;
      const harusnya = saldo + arahTanda(b.direction) * nominal;
      if (Math.abs(harusnya - b.balance_after) < 1) cocok += 1;
      else
        rincian.push({
          row_index: b.row_index,
          pesan: `saldo tertulis ${rp(b.balance_after)}, tetapi saldo sebelumnya ${rp(saldo)} ${b.direction === "IN" ? "+" : "−"} ${rp(nominal)} = ${rp(harusnya)}`,
        });
    }
    if (b.balance_after !== null) saldo = b.balance_after;
    else if (saldo !== null && nominal !== null) saldo += arahTanda(b.direction) * nominal;
    else saldo = null;
  }

  const jumlah = (arah: "IN" | "OUT") => baris.filter((b) => (arah === "IN" ? b.direction === "IN" : b.direction !== "IN")).reduce((a, b) => a + (b.amount ?? 0), 0);
  const sama = (tertulis: number | null | undefined, hitung: number) => (tertulis === null || tertulis === undefined ? null : Math.abs(tertulis - hitung) < 1);
  const masuk = jumlah("IN");
  const keluar = jumlah("OUT");
  const awal = total?.opening_balance ?? null;
  return {
    saldo_dicek: dicek,
    saldo_cocok: cocok,
    baris_tidak_cocok: rincian.map((r) => r.row_index),
    rincian,
    total_masuk_cocok: sama(total?.total_in, masuk),
    total_keluar_cocok: sama(total?.total_out, keluar),
    saldo_akhir_cocok: awal === null ? null : sama(total?.closing_balance, awal + masuk - keluar),
  };
}

export function skorMasalah(v: HasilVerifikasi): number {
  return v.baris_tidak_cocok.length * 2 + [v.total_masuk_cocok, v.total_keluar_cocok, v.saldo_akhir_cocok].filter((x) => x === false).length;
}

export function tandaiBarisTidakCocok<T extends BarisKas>(baris: T[], v: HasilVerifikasi): T[] {
  const peta = new Map(v.rincian.map((r) => [r.row_index, r.pesan]));
  return baris.map((b) => {
    const pesan = peta.get(b.row_index);
    if (!pesan) return b;
    return {
      ...b,
      is_unclear: true,
      confidence: Math.min(b.confidence, 0.6),
      review_note: `Cek angka: ${pesan}.${b.review_note ? ` ${b.review_note}` : ""}`,
      field_issues: [...(b.field_issues ?? []).filter((f) => f.field !== "amount"), { field: "amount" as const, problem: `Tidak cocok dengan saldo: ${pesan}`, suggestion: null }],
    };
  });
}

export function instruksiBacaUlang(v: HasilVerifikasi): string {
  const poin = v.rincian.slice(0, 15).map((r) => `- baris ${r.row_index}: ${r.pesan}`);
  if (v.total_masuk_cocok === false) poin.push("- jumlah pemasukan hasil bacaan tidak sama dengan total pemasukan yang tertulis");
  if (v.total_keluar_cocok === false) poin.push("- jumlah pengeluaran hasil bacaan tidak sama dengan total pengeluaran yang tertulis");
  if (v.saldo_akhir_cocok === false) poin.push("- saldo awal + pemasukan − pengeluaran tidak sama dengan saldo akhir yang tertulis");
  return [
    "PEMERIKSAAN ULANG: hasil bacaan sebelumnya tidak konsisten dengan angka saldo/total yang tertulis di dokumen:",
    ...poin,
    "Baca ulang SELURUH dokumen dengan sangat teliti, terutama baris di atas: perhatikan angka yang mirip (1/7, 3/8, 5/6, 0/6/9), jumlah digit nol, dan pastikan setiap nominal berada di kolom yang benar (pemasukan vs pengeluaran) serta tidak tertukar dengan baris tetangga.",
    "Pastikan juga tidak ada baris yang terlewat atau terhitung dua kali. Salin angka persis seperti tertulis; jangan menyesuaikan angka agar cocok bila tulisan aslinya memang berbeda — tandai is_unclear bila ragu.",
  ].join("\n");
}
