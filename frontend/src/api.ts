type ApiResult = { ok: boolean; message?: string };

async function kirim<T extends object = object>(path: string, body?: unknown, method = "POST"): Promise<ApiResult & Partial<T>> {
  try {
    const res = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      credentials: "include",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as ApiResult & Partial<T>;
    return { ...data, ok: res.ok && data.ok !== false };
  } catch {
    return { ok: false, message: "Tidak dapat terhubung ke server. Pastikan backend sudah berjalan." } as ApiResult & Partial<T>;
  }
}

export type HasilPanggil<T = Record<string, unknown>> = { ok: boolean; status: number; message?: string } & Partial<T>;

export async function panggil<T = Record<string, unknown>>(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<HasilPanggil<T>> {
  try {
    const isi = body === undefined ? undefined : JSON.stringify(body);
    const res = await fetch(path, {
      method,
      headers: isi === undefined ? undefined : { "Content-Type": "application/json" },
      credentials: "include",
      body: isi,
      keepalive: method !== "GET" && (isi?.length ?? 0) < 60_000,
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string } & Partial<T>;
    return { ...data, ok: res.ok && data.ok !== false, status: res.status };
  } catch {
    return { ok: false, status: 0, message: "Server tidak dapat dihubungi." } as HasilPanggil<T>;
  }
}

export type InsightAi ={ ringkasan: string; risiko: string[]; saran: string[] };
export type HasilAi<T> = { ok: boolean; fallback?: boolean; alasan?: string; data?: T };


export type TransaksiOcr = {
  row_index: number;
  transaction_date: string | null;
  transaction_time: string | null;
  raw_text: string | null;
  description: string;
  direction: "IN" | "OUT" | "SETTLEMENT";
  amount: number | null;
  balance_after: number | null;
  payment_method: "TUNAI" | "QRIS" | "TRANSFER" | "MARKETPLACE";
  category: string;
  is_unclear: boolean;
  confidence: number;
  review_note: string | null;
  field_issues: { field: "date" | "description" | "amount" | "direction" | "category"; problem: string; suggestion: string | null }[];
};
export type LaporanCelah = {
  original_columns_found: string[];
  missing_columns_auto_filled: string[];
  extra_columns_detected: string[];
  incomplete_rows_count: number;
  settlement_rows_filtered: number;
  summary_message: string;
};
export type VerifikasiOcr = {
  saldo_dicek: number;
  saldo_cocok: number;
  baris_tidak_cocok: number[];
  total_masuk_cocok: boolean | null;
  total_keluar_cocok: boolean | null;
  saldo_akhir_cocok: boolean | null;
  dibaca_ulang: boolean;
  peringatan: string | null;
};
export type DokumenOcr = {
  document_type: "CASHBOOK" | "RECEIPT" | "QRIS_MUTATION";
  image_quality: { readable: boolean; problem: string | null };
  schema_gap_report: LaporanCelah;
  transactions: TransaksiOcr[];
  verification?: VerifikasiOcr;
};

export type KunciItemLabelAi =
  | "product_name_and_brand" | "ingredients_list" | "net_weight" | "manufacturer_address" | "halal_info"
  | "production_code" | "expiry_date" | "registration_number" | "special_ingredient_origin";
export type ItemLabelAi = {
  found: boolean;
  raw_text: string | null;
  location: "MAIN_PANEL" | "OTHER" | "NOT_VISIBLE";
  status_hint: "FULL" | "PARTIAL" | "MISSING" | "UNREADABLE" | "NOT_APPLICABLE";
  confidence: number;
  note: string;
};
export type KlaimAi = { quoted_text: string; violation_reason: string; suggested_replacement: string };
export type CekRitelAi = { has_nutrition_facts_ing: boolean; has_bpom_2d_barcode: boolean; has_gs1_retail_barcode: boolean; has_allergen_warning: boolean };
export type LabelAi = {
  executive_summary: string[];
  extracted_items: Record<KunciItemLabelAi, ItemLabelAi>;
  additional_retail_checks: CekRitelAi;
  prohibited_claims_detected: KlaimAi[];
};

export async function perkecilGambar(file: File, sisiMaks = 2000, kualitas = 0.85): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file);
    const skala = Math.min(1, sisiMaks / Math.max(bmp.width, bmp.height));
    if (skala === 1 && file.size < 4_000_000) {
      bmp.close();
      return file;
    }
    const kanvas = document.createElement("canvas");
    kanvas.width = Math.round(bmp.width * skala);
    kanvas.height = Math.round(bmp.height * skala);
    const ctx = kanvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, kanvas.width, kanvas.height);
    ctx.drawImage(bmp, 0, 0, kanvas.width, kanvas.height);
    bmp.close();
    const blob = await new Promise<Blob | null>((r) => kanvas.toBlob(r, "image/jpeg", kualitas));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

async function ocr(file: File, task: "ocr_cashbook" | "ocr_nota" | "ocr_pdf_mutasi", hariIni: string): Promise<HasilAi<DokumenOcr>> {
  try {
    const form = new FormData();
    form.append("file", await perkecilGambar(file, 3000, 0.92));
    form.append("task", task);
    form.append("hariIni", hariIni);
    const res = await fetch("/api/finance/ocr", { method: "POST", body: form, credentials: "include" });
    return (await res.json()) as HasilAi<DokumenOcr>;
  } catch {
    return { ok: false, fallback: true, alasan: "Server tidak dapat dihubungi." };
  }
}

export const api = {
  login: (email: string, password: string) => kirim("/api/auth/login", { email, password }),
  register: (name: string, email: string, password: string) => kirim("/api/auth/register", { name, email, password }),
  logout: () => kirim("/api/auth/logout", {}),
  me: () => kirim<{ user: { id: string; email: string; name: string } }>("/api/auth/me", undefined, "GET"),
  insight: async (angka: Record<string, number>, konteks: string): Promise<HasilAi<InsightAi>> => {
    try {
      const res = await fetch("/api/finance/insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ angka, konteks }),
      });
      return (await res.json()) as HasilAi<InsightAi>;
    } catch {
      return { ok: false, fallback: true, alasan: "Server tidak dapat dihubungi." };
    }
  },
  labelScan: async (foto: { depan?: File; belakang?: File }): Promise<HasilAi<LabelAi>> => {
    try {
      const form = new FormData();
      if (foto.depan) form.append("depan", await perkecilGambar(foto.depan));
      if (foto.belakang) form.append("belakang", await perkecilGambar(foto.belakang));
      const res = await fetch("/api/label/scan", { method: "POST", body: form, credentials: "include" });
      return await res.json();
    } catch {
      return { ok: false, fallback: true, alasan: "Server tidak dapat dihubungi." };
    }
  },
  labelFix: async (label: Record<string, unknown>): Promise<HasilAi<{ label_depan: string; label_belakang: string; deskripsi_marketplace: string; placeholder: string[] }>> => {
    try {
      const res = await fetch("/api/label/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ label, konteks: "Label pangan olahan UMKM Indonesia. Jangan mengarang data; yang kosong menjadi [ISI: ...]." }),
      });
      return await res.json();
    } catch {
      return { ok: false, fallback: true, alasan: "Server tidak dapat dihubungi." };
    }
  },
  ocrDokumen: (file: File, petunjuk: "ocr_cashbook" | "ocr_nota" | "ocr_pdf_mutasi", hariIni: string) => ocr(file, petunjuk, hariIni),
};
