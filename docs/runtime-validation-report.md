# Runtime Validation Report

**Target:** NAIK.IN  
**Tanggal:** 2026-11-06

## Summary

| Langkah | Status | Exit code | Detail |
|---|---|---:|---|
| Startup | PASS | 0 | Next dev server siap melalui Playwright webServer |
| Unit/integration | PASS | 0 | 5 file, 35 tes lulus |
| Lint | PASS | 0 | Tidak ada warning/error lint |
| Typecheck | PASS | 0 | `tsc --noEmit` lulus |
| Production build | PASS | 0 | `next build` lulus |
| Browser E2E | PASS | 0 | Playwright 1 flow demo lulus |

## Environment

- Docker: UNAVAILABLE — daemon tidak merespons `docker info`; tidak diperlukan oleh Mode Demo.
- Node.js: AVAILABLE — v24.12.0.
- Playwright: AVAILABLE — Chromium berhasil dipasang dan flow berjalan.
- Infra tier: FALLBACK (LocalAdapter/in-memory) — Supabase opsional.
- Browser tier: PRIMARY (Playwright).

## Flow yang diuji

Preset Bu Sari → intake 90 hari → Gunakan data preset → Konfirmasi data →
Stress Test plafon Rp20 juta → status Merah → Sampel A → Sampel B dengan skor
lebih tinggi → Laporan → Cetak/Simpan PDF.

## Catatan

Audit produksi masih melaporkan advisori `postcss`, `xlsx`, dan `zod`; `xlsx`
belum memiliki perbaikan upstream tanpa migrasi library. Ini tidak menghalangi
build atau tes, tetapi perlu ditinjau sebelum membuka unggahan Live secara luas.
