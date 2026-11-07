# NAIK.IN

NAIK.IN adalah platform berbahasa Indonesia untuk membantu UMKM pangan olahan menyiapkan data keuangan dan label produk sebelum berkembang.

## Struktur Proyek

```
naik.in/
├── frontend/   Tampilan (React + Vite + Tailwind v4) — http://localhost:5173
├── backend/    API (Next.js route handlers) + PostgreSQL — http://localhost:3000
└── docs/       PRD, runbook, laporan validasi
```

- **frontend/** hanya berisi tampilan. Semua request ke `/api/...` diteruskan (proxy) oleh Vite ke backend, lihat `frontend/vite.config.ts`.
- **backend/** hanya berisi API, logika bisnis (`lib/engine`), integrasi AI (`lib/ai`), dan database (`db/`).

## Menjalankan Proyek

Jalankan backend dan frontend di **dua terminal terpisah**.

### Terminal 1 — Backend

```bash
cd backend
npm install
cp .env.example .env        # lalu isi DB_PASSWORD (dan GEMINI_API_KEY jika ada)
npm run db:migrate          # sekali di awal, dan setiap ada file migrasi baru
npm run db:seed             # sekali di awal: akun demo + bisnis contoh
npm run dev                 # http://localhost:3000
```

### Terminal 2 — Frontend

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

Buka **http://localhost:5173**. Akun demo: `demo@naik.in` / `demo123456`.

### Validasi

```bash
cd backend && npm run typecheck && npm run test
cd frontend && npm run build
```

## Konfigurasi PostgreSQL (pgAdmin / Local)

1. Install PostgreSQL dari [postgresql.org](https://www.postgresql.org/download/).
2. Buat database:
   ```sql
   CREATE DATABASE naikin;
   ```
3. Isi `backend/.env`:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=password_postgres_anda
   DB_NAME=naikin
   ```
4. Dari folder `backend`, jalankan `npm run db:migrate` lalu `npm run db:seed`.

### Mengubah struktur tabel

Jangan mengedit file migrasi yang sudah pernah dijalankan. Buat file baru dengan nomor berikutnya, misalnya `backend/db/migrations/002_tambah_kolom.sql`, lalu jalankan `npm run db:migrate` lagi. File yang sudah tercatat di tabel `_migrations` akan dilewati.

## Autentikasi

Login & register berjalan di backend (`/api/auth/login`, `/api/auth/register`) dengan password yang di-hash (scrypt) dan sesi berupa cookie `naik_session`.

## Lapisan AI (Opsional)

Wrapper Gemini berada di `backend/lib/ai` dan hanya berjalan di server. `GEMINI_API_KEY` dan `GEMINI_MODEL` dibaca dari `backend/.env`; kunci tidak pernah dikirim ke browser. Jika kunci kosong, fitur AI memakai fallback deterministik lokal.
