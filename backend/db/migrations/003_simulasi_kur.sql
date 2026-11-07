-- =====================================================================
-- 003 — Simulasi Kesiapan KUR
-- Engine perhitungan ada di frontend/src/lib/engine/loan (berjalan tanpa jaringan).
-- Database menyimpan hasil simulasi yang dipilih pengguna ("Simpan simulasi",
-- "Masukkan ke Laporan") beserta angka input agar dapat diaudit ulang.
-- =====================================================================

-- Biaya tetap (mis. sewa) dirata-rata per minggu dalam Laba_minggu.
ALTER TABLE categories ADD COLUMN IF NOT EXISTS tetap boolean NOT NULL DEFAULT false;
UPDATE categories SET tetap = true WHERE business_id IS NULL AND kode = 'sewa';
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_tetap_hanya_operasional;
ALTER TABLE categories ADD CONSTRAINT categories_tetap_hanya_operasional CHECK (NOT tetap OR kelompok = 'operasional');

-- Minggu valid = minimal 5 dari 7 hari tercatat (sebelumnya 6).
CREATE OR REPLACE VIEW v_kelengkapan_mingguan AS
WITH hari AS (
  SELECT business_id, tanggal FROM v_transaksi
  UNION
  SELECT business_id, tanggal FROM closed_days
)
SELECT business_id,
       date_trunc('week', tanggal)::date AS minggu_mulai,
       COUNT(*) AS hari_tercatat,
       COUNT(*) >= 5 AS lengkap
FROM hari
GROUP BY business_id, date_trunc('week', tanggal);

-- Pengaturan simulasi per pengguna
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS kur_konservatif boolean NOT NULL DEFAULT false;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS kur_cicilan_lama bigint NOT NULL DEFAULT 0 CHECK (kur_cicilan_lama >= 0);
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS kur_kebutuhan_rt bigint CHECK (kur_kebutuhan_rt IS NULL OR kur_kebutuhan_rt >= 0);

CREATE TABLE IF NOT EXISTS loan_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  -- Jendela data 26 minggu yang dipakai
  jendela_dari date NOT NULL,
  jendela_sampai date NOT NULL,
  minggu_valid smallint NOT NULL CHECK (minggu_valid BETWEEN 0 AND 26),
  -- Input kapasitas (per bulan = 4 minggu)
  laba_rata bigint NOT NULL,
  laba_stress bigint NOT NULL,
  laba_terburuk bigint NOT NULL,
  kebutuhan_rt bigint NOT NULL CHECK (kebutuhan_rt >= 0),
  cicilan_lama bigint NOT NULL DEFAULT 0 CHECK (cicilan_lama >= 0),
  -- Rencana pinjaman
  plafon bigint NOT NULL CHECK (plafon BETWEEN 5000000 AND 50000000 AND plafon % 500000 = 0),
  tenor smallint NOT NULL CHECK (tenor IN (12, 24, 36)),
  bunga_tahunan numeric(5, 4) NOT NULL CHECK (bunga_tahunan >= 0),
  jenis_kur text NOT NULL CHECK (jenis_kur IN ('KUR Super Mikro', 'KUR Mikro')),
  mode_konservatif boolean NOT NULL DEFAULT false,
  -- Hasil engine
  cicilan_baru bigint NOT NULL,
  batas_aman bigint NOT NULL,
  batas_hati_hati bigint NOT NULL,
  rasio_rata numeric(8, 4),
  sisa_rata bigint NOT NULL,
  sisa_stress bigint NOT NULL,
  status text NOT NULL CHECK (status IN ('hijau', 'kuning', 'merah')),
  target_cadangan bigint,
  setoran_cadangan bigint,
  peluang_bulan_sulit numeric(6, 4) NOT NULL CHECK (peluang_bulan_sulit BETWEEN 0 AND 1),
  npl_indikatif numeric(6, 4) NOT NULL CHECK (npl_indikatif BETWEEN 0 AND 1),
  seed_simulasi integer NOT NULL,
  jumlah_simulasi integer NOT NULL,
  -- Penjelasan
  penjelasan text,
  penjelasan_sumber text CHECK (penjelasan_sumber IS NULL OR penjelasan_sumber IN ('ai', 'templat')),
  tindakan jsonb NOT NULL DEFAULT '[]', -- daftar tindakan terstruktur dari engine
  di_laporan boolean NOT NULL DEFAULT false,
  dibuat timestamptz NOT NULL DEFAULT now(),
  CHECK (jendela_dari < jendela_sampai),
  CONSTRAINT loan_simulations_cadangan_kuning CHECK (status <> 'kuning' OR target_cadangan IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS loan_simulations_business_idx ON loan_simulations(business_id, dibuat DESC);
-- Hanya satu simulasi per usaha yang dimasukkan ke laporan
CREATE UNIQUE INDEX IF NOT EXISTS loan_simulations_satu_laporan ON loan_simulations(business_id) WHERE di_laporan;
