# NAIK.IN

NAIK.IN adalah PWA berbahasa Indonesia untuk membantu UMKM pangan olahan menyiapkan data keuangan dan label produk sebelum berkembang.

## Status

Repositori ini berisi scaffold Next.js, engine deterministik, dan lapisan data adapter PostgreSQL / Local Demo sesuai PRD.

## Menjalankan Proyek

1. **Install dependensi**:
   ```bash
   npm install
   ```

2. **Salin file environment**:
   ```bash
   cp .env.example .env.local
   ```
   Sesuaikan password dan konfigurasi PostgreSQL di `.env.local`.

3. **Jalankan database migration & seed data**:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

4. **Jalankan aplikasi (Development)**:
   ```bash
   npm run dev
   ```
   Buka `http://localhost:3000`.

Validasi lokal:
```bash
npm run lint
npm run typecheck
npm run test
```

## Konfigurasi PostgreSQL Manual (pgAdmin / Local)

1. Pastikan PostgreSQL sudah terinstall di komputer Anda (atau install dari [postgresql.org](https://www.postgresql.org/download/)).
2. Buka **pgAdmin** atau terminal `psql`.
3. Buat database baru bernama `trialtitut`:
   ```sql
   CREATE DATABASE trialtitut;
   ```
4. Jalankan migrasi tabel secara otomatis via terminal:
   ```bash
   npm run db:migrate
   ```
   *(Atau secara manual: buka file [`db/migrations/001_naik_in.sql`](./db/migrations/001_naik_in.sql) di Query Tool pgAdmin lalu klik Execute ▶)*.
5. Jalankan seed data akun demo dan bisnis:
   ```bash
   npm run db:seed
   ```
6. Sesuaikan konfigurasi di `.env.local`:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=password_postgres_anda
   DB_NAME=trialtitut
   ```

Autentikasi (login & register) sekarang sepenuhnya berjalan secara lokal dengan password yang di-hash aman di server (scrypt).

## Mode Demo Offline

Jika database PostgreSQL belum terhubung, aplikasi secara otomatis beralih ke `LocalAdapter` (IndexedDB / memory). Pengguna tetap bisa mencoba fitur Mode Demo tanpa hambatan koneksi.

## Lapisan AI (Opsional)

Wrapper Gemini berada di `lib/ai` dan hanya berjalan di server. Kunci `GEMINI_API_KEY` dan model `GEMINI_MODEL` dibaca dari environment variables. Kunci tidak pernah dikirim ke browser. Jika kunci kosong, fitur AI beralih ke fallback deterministik lokal.
