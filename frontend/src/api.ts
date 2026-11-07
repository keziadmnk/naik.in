// Klien sederhana untuk memanggil backend (folder backend/).
// Saat development, Vite meneruskan /api ke http://localhost:3000 (lihat vite.config.ts).

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

/** Panggilan API data aplikasi (JSON). Tidak pernah melempar galat. */
export async function panggil<T = Record<string, unknown>>(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<HasilPanggil<T>> {
  try {
    const isi = body === undefined ? undefined : JSON.stringify(body);
    const res = await fetch(path, {
      method,
      headers: isi === undefined ? undefined : { "Content-Type": "application/json" },
      credentials: "include",
      body: isi,
      // Perubahan kecil tetap terkirim walau tab ditutup/di-reload (batas keepalive 64 KB)
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

export type BarisOcr = { tanggal: string | null; uraian: string | null; masuk: number | null; keluar: number | null; confidence: number };
export type NotaOcr = { supplier: string | null; tanggal: string | null; items: { nama: string | null; jumlah: number | null; harga: number | null }[]; total: number | null };

async function ocr<T>(file: File, task: "ocr_cashbook" | "ocr_nota" | "ocr_pdf_mutasi"): Promise<HasilAi<T>> {
  try {
    const form = new FormData();
    form.append("file", file);
    form.append("task", task);
    const res = await fetch("/api/finance/ocr", { method: "POST", body: form, credentials: "include" });
    return (await res.json()) as HasilAi<T>;
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
  labelScan: async (file: File): Promise<HasilAi<{ fields: Record<string, { value: string | null; found: boolean; lokasi: "utama" | "lain" | "tidak_terlihat"; confidence: number }> }>> => {
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/label/scan", { method: "POST", body: form, credentials: "include" });
      return await res.json();
    } catch {
      return { ok: false, fallback: true, alasan: "Server tidak dapat dihubungi." };
    }
  },
  labelFix: async (label: Record<string, unknown>): Promise<HasilAi<{ label_belakang: string; deskripsi_marketplace: string; placeholder: string[] }>> => {
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
  ocrBukuKas: (file: File) => ocr<{ rows: BarisOcr[] }>(file, "ocr_cashbook"),
  ocrNota: (file: File) => ocr<NotaOcr>(file, "ocr_nota"),
};
