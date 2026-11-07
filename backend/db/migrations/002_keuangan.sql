ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text;

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS kategori_usaha text NOT NULL DEFAULT 'Makanan & Minuman';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS mulai_usaha date;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS metode_pembayaran text[] NOT NULL DEFAULT '{}';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS rekening_terpisah boolean;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS punya_catatan boolean;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS onboarding_selesai_at timestamptz;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS diubah timestamptz NOT NULL DEFAULT now();
COMMENT ON COLUMN businesses.usia_usaha_bln IS 'Usang: hitung lama usaha dari mulai_usaha.';

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  kode text NOT NULL,
  nama text NOT NULL,
  arah text NOT NULL CHECK (arah IN ('masuk', 'keluar')),
  kelompok text NOT NULL CHECK (kelompok IN ('penjualan', 'pemasukan_lain', 'hpp', 'operasional', 'pribadi')),
  urutan integer NOT NULL DEFAULT 100,
  aktif boolean NOT NULL DEFAULT true,
  dibuat timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categories_arah_kelompok_cocok CHECK ((kelompok IN ('penjualan', 'pemasukan_lain')) = (arah = 'masuk'))
);
CREATE UNIQUE INDEX IF NOT EXISTS categories_kode_unik
  ON categories (COALESCE(business_id, '00000000-0000-0000-0000-000000000000'::uuid), kode);

INSERT INTO categories (business_id, kode, nama, arah, kelompok, urutan) VALUES
  (NULL, 'penjualan',      'Penjualan',                        'masuk',  'penjualan',      10),
  (NULL, 'pemasukan-lain', 'Pemasukan lain (bukan penjualan)', 'masuk',  'pemasukan_lain', 20),
  (NULL, 'bahan-baku',     'Bahan baku',                       'keluar', 'hpp',            30),
  (NULL, 'kemasan',        'Kemasan',                          'keluar', 'hpp',            40),
  (NULL, 'gas-listrik',    'Gas, listrik & air',               'keluar', 'operasional',    50),
  (NULL, 'sewa',           'Sewa tempat',                      'keluar', 'operasional',    60),
  (NULL, 'gaji',           'Upah pekerja',                     'keluar', 'operasional',    70),
  (NULL, 'ongkir',         'Ongkir & transport',               'keluar', 'operasional',    80),
  (NULL, 'peralatan',      'Peralatan',                        'keluar', 'operasional',    90),
  (NULL, 'admin',          'Admin, pulsa & lainnya',           'keluar', 'operasional',   100),
  (NULL, 'pribadi',        'Pribadi / rumah tangga',           'keluar', 'pribadi',       110)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  sumber text NOT NULL CHECK (sumber IN ('manual', 'unggah_file', 'scan_foto')),
  upload_id uuid REFERENCES uploads(id) ON DELETE SET NULL,
  nama_file text,
  tipe_file text CHECK (tipe_file IS NULL OR tipe_file IN ('csv', 'xlsx', 'pdf', 'jpg', 'png')),
  status text NOT NULL DEFAULT 'draf' CHECK (status IN ('draf', 'dikonfirmasi', 'dibatalkan')),
  rentang_dari date,
  rentang_sampai date,
  jumlah_baris integer NOT NULL DEFAULT 0,
  dibuat timestamptz NOT NULL DEFAULT now(),
  dikonfirmasi_at timestamptz,
  CONSTRAINT import_batches_status_waktu CHECK ((status = 'dikonfirmasi') = (dikonfirmasi_at IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  nomor_baris integer,
  data_mentah jsonb,
  tanggal date,
  tanggal_asli text,
  uraian text NOT NULL DEFAULT '',
  arah text CHECK (arah IN ('masuk', 'keluar')),
  category_id uuid REFERENCES categories(id),
  metode text CHECK (metode IN ('Tunai', 'QRIS', 'Transfer', 'Marketplace')),
  nominal bigint CHECK (nominal IS NULL OR nominal >= 0),
  masalah jsonb NOT NULL DEFAULT '[]',
  disertakan boolean NOT NULL DEFAULT true,
  transaction_id uuid
);
CREATE INDEX IF NOT EXISTS import_rows_batch_idx ON import_rows(batch_id);

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  tanggal date NOT NULL,
  uraian text NOT NULL CHECK (length(trim(uraian)) > 0),
  arah text NOT NULL CHECK (arah IN ('masuk', 'keluar')),
  category_id uuid NOT NULL REFERENCES categories(id),
  metode text NOT NULL CHECK (metode IN ('Tunai', 'QRIS', 'Transfer', 'Marketplace')),
  nominal bigint NOT NULL CHECK (nominal > 0),
  sumber text NOT NULL CHECK (sumber IN ('contoh', 'manual', 'unggah_file', 'scan_foto')),
  import_batch_id uuid REFERENCES import_batches(id) ON DELETE SET NULL,
  dikonfirmasi_at timestamptz NOT NULL,
  dikonfirmasi_oleh uuid REFERENCES users(id) ON DELETE SET NULL,
  dibuat timestamptz NOT NULL DEFAULT now(),
  diubah timestamptz NOT NULL DEFAULT now(),
  dihapus_at timestamptz
);
CREATE INDEX IF NOT EXISTS transactions_business_tanggal_idx ON transactions(business_id, tanggal) WHERE dihapus_at IS NULL;
CREATE INDEX IF NOT EXISTS transactions_category_idx ON transactions(category_id);
CREATE INDEX IF NOT EXISTS transactions_batch_idx ON transactions(import_batch_id);

ALTER TABLE import_rows DROP CONSTRAINT IF EXISTS import_rows_transaction_fk;
ALTER TABLE import_rows ADD CONSTRAINT import_rows_transaction_fk FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION cek_arah_kategori() RETURNS trigger AS $$
DECLARE arah_kategori text;
BEGIN
  SELECT arah INTO arah_kategori FROM categories WHERE id = NEW.category_id;
  IF arah_kategori IS DISTINCT FROM NEW.arah THEN
    RAISE EXCEPTION 'Arah transaksi (%) tidak sama dengan arah kategori (%)', NEW.arah, arah_kategori;
  END IF;
  NEW.diubah := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS transactions_cek_arah ON transactions;
CREATE TRIGGER transactions_cek_arah BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION cek_arah_kategori();

CREATE TABLE IF NOT EXISTS closed_days (
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  tanggal date NOT NULL,
  alasan text,
  dibuat timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (business_id, tanggal)
);

CREATE TABLE IF NOT EXISTS findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  kunci text NOT NULL,
  jenis text NOT NULL CHECK (jenis IN (
    'kemungkinan_pribadi', 'pemasukan_bukan_penjualan', 'duplikat',
    'nominal_tidak_biasa', 'tanggal_bermasalah', 'hari_belum_dicatat')),
  transaction_id uuid REFERENCES transactions(id) ON DELETE CASCADE,
  transaksi_terkait uuid[] NOT NULL DEFAULT '{}',
  rentang_dari date,
  rentang_sampai date,
  alasan text NOT NULL,
  status text NOT NULL DEFAULT 'terbuka' CHECK (status IN ('terbuka', 'ditindak', 'diabaikan')),
  tindakan text,
  dibuat timestamptz NOT NULL DEFAULT now(),
  ditindak_at timestamptz,
  ditindak_oleh uuid REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (business_id, kunci),
  CONSTRAINT findings_target CHECK (
    (jenis = 'hari_belum_dicatat' AND rentang_dari IS NOT NULL AND rentang_sampai IS NOT NULL)
    OR (jenis <> 'hari_belum_dicatat' AND transaction_id IS NOT NULL)),
  CONSTRAINT findings_status_waktu CHECK ((status = 'terbuka') = (ditindak_at IS NULL))
);
CREATE INDEX IF NOT EXISTS findings_terbuka_idx ON findings(business_id) WHERE status = 'terbuka';

CREATE TABLE IF NOT EXISTS recurring_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  nama text NOT NULL,
  jenis text NOT NULL CHECK (jenis IN ('usaha', 'rumah_tangga')),
  nominal_bulanan bigint NOT NULL CHECK (nominal_bulanan >= 0),
  urutan integer NOT NULL DEFAULT 100,
  dibuat timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS recurring_costs_business_idx ON recurring_costs(business_id);

CREATE TABLE IF NOT EXISTS reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  jenis text NOT NULL CHECK (jenis IN ('catat_harian', 'ringkasan_mingguan')),
  jam time NOT NULL DEFAULT '20:00',
  aktif boolean NOT NULL DEFAULT true,
  UNIQUE (business_id, jenis)
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  demo_akun_kosong boolean NOT NULL DEFAULT false,
  demo_data_tiga_bulan boolean NOT NULL DEFAULT false,
  mode_offline boolean NOT NULL DEFAULT false,
  tur_selesai boolean NOT NULL DEFAULT false,
  diubah timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_settings_demo_eksklusif CHECK (NOT (demo_akun_kosong AND demo_data_tiga_bulan))
);

CREATE TABLE IF NOT EXISTS ai_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  periode_dari date NOT NULL,
  periode_sampai date NOT NULL,
  jumlah_transaksi integer NOT NULL,
  angka jsonb NOT NULL,
  poin text[] NOT NULL,
  sumber text NOT NULL CHECK (sumber IN ('ai', 'templat')),
  dibuat timestamptz NOT NULL DEFAULT now(),
  CHECK (periode_dari <= periode_sampai)
);
CREATE INDEX IF NOT EXISTS ai_summaries_terbaru_idx ON ai_summaries(business_id, dibuat DESC);

CREATE OR REPLACE VIEW v_transaksi AS
SELECT t.*, c.kode AS kategori_kode, c.nama AS kategori_nama, c.kelompok
FROM transactions t
JOIN categories c ON c.id = t.category_id
WHERE t.dihapus_at IS NULL;

CREATE OR REPLACE VIEW v_rekap_mingguan AS
SELECT
  business_id,
  date_trunc('week', tanggal)::date AS minggu_mulai,
  (date_trunc('week', tanggal) + interval '6 days')::date AS minggu_akhir,
  SUM(nominal) FILTER (WHERE arah = 'masuk') AS uang_masuk,
  SUM(nominal) FILTER (WHERE kelompok = 'penjualan') AS penjualan,
  SUM(nominal) FILTER (WHERE kelompok = 'pemasukan_lain') AS pemasukan_lain,
  SUM(nominal) FILTER (WHERE kelompok = 'hpp') AS hpp,
  SUM(nominal) FILTER (WHERE kelompok = 'operasional') AS operasional,
  SUM(nominal) FILTER (WHERE kelompok = 'pribadi') AS pribadi,
  SUM(nominal) FILTER (WHERE arah = 'keluar') AS uang_keluar,
  COALESCE(SUM(nominal) FILTER (WHERE kelompok = 'penjualan'), 0)
    - COALESCE(SUM(nominal) FILTER (WHERE kelompok IN ('hpp', 'operasional')), 0) AS laba_usaha,
  COALESCE(SUM(nominal) FILTER (WHERE arah = 'masuk'), 0)
    - COALESCE(SUM(nominal) FILTER (WHERE arah = 'keluar'), 0) AS selisih_kas,
  COUNT(DISTINCT tanggal) AS hari_tercatat,
  COUNT(*) AS jumlah_transaksi
FROM v_transaksi
GROUP BY business_id, date_trunc('week', tanggal);

CREATE OR REPLACE VIEW v_rekap_bulanan AS
SELECT
  business_id,
  date_trunc('month', tanggal)::date AS bulan,
  SUM(nominal) FILTER (WHERE arah = 'masuk') AS uang_masuk,
  SUM(nominal) FILTER (WHERE kelompok = 'penjualan') AS penjualan,
  SUM(nominal) FILTER (WHERE kelompok = 'pemasukan_lain') AS pemasukan_lain,
  SUM(nominal) FILTER (WHERE kelompok = 'hpp') AS hpp,
  SUM(nominal) FILTER (WHERE kelompok = 'operasional') AS operasional,
  SUM(nominal) FILTER (WHERE kelompok = 'pribadi') AS pribadi,
  SUM(nominal) FILTER (WHERE arah = 'keluar') AS uang_keluar,
  COALESCE(SUM(nominal) FILTER (WHERE kelompok = 'penjualan'), 0)
    - COALESCE(SUM(nominal) FILTER (WHERE kelompok IN ('hpp', 'operasional')), 0) AS laba_usaha,
  COALESCE(SUM(nominal) FILTER (WHERE arah = 'masuk'), 0)
    - COALESCE(SUM(nominal) FILTER (WHERE arah = 'keluar'), 0) AS selisih_kas,
  COUNT(DISTINCT tanggal) AS hari_tercatat,
  COUNT(*) AS jumlah_transaksi
FROM v_transaksi
GROUP BY business_id, date_trunc('month', tanggal);

CREATE OR REPLACE VIEW v_kelengkapan_mingguan AS
WITH hari AS (
  SELECT business_id, tanggal FROM v_transaksi
  UNION
  SELECT business_id, tanggal FROM closed_days
)
SELECT business_id,
       date_trunc('week', tanggal)::date AS minggu_mulai,
       COUNT(*) AS hari_tercatat,
       COUNT(*) >= 6 AS lengkap
FROM hari
GROUP BY business_id, date_trunc('week', tanggal);
