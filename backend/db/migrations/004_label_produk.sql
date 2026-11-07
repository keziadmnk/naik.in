CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  nama text NOT NULL CHECK (length(trim(nama)) > 0),
  dibuat timestamptz NOT NULL DEFAULT now(),
  dihapus_at timestamptz
);
CREATE INDEX IF NOT EXISTS products_business_idx ON products(business_id) WHERE dihapus_at IS NULL;

CREATE TABLE IF NOT EXISTS label_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('draf', 'beredar')),
  isian jsonb NOT NULL,
  teks_lain text NOT NULL DEFAULT '',
  upload_ids uuid[] NOT NULL DEFAULT '{}',
  sumber_isian text NOT NULL DEFAULT 'manual' CHECK (sumber_isian IN ('manual', 'ai_dikonfirmasi')),
  skor numeric(5, 2) NOT NULL CHECK (skor BETWEEN 0 AND 100),
  kategori text NOT NULL CHECK (kategori IN ('Lengkap', 'Hampir lengkap', 'Perlu dilengkapi')),
  rincian jsonb NOT NULL,
  klaim jsonb NOT NULL DEFAULT '[]',
  draf_teks text,
  draf_sumber text CHECK (draf_sumber IS NULL OR draf_sumber IN ('ai', 'templat')),
  dikonfirmasi_at timestamptz NOT NULL,
  dikonfirmasi_oleh uuid REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT label_checks_isian_lengkap CHECK (
    isian ?& ARRAY['namaProduk', 'daftarBahan', 'beratBersih', 'produsen', 'halal', 'kodeProduksi', 'kedaluwarsa', 'nomorIzin', 'asalUsul'])
);
CREATE INDEX IF NOT EXISTS label_checks_terbaru_idx ON label_checks(product_id, dikonfirmasi_at DESC);

CREATE OR REPLACE VIEW v_label_terakhir AS
SELECT DISTINCT ON (p.id)
  p.business_id, p.id AS product_id, p.nama, c.id AS check_id, c.mode, c.skor, c.kategori, c.dikonfirmasi_at
FROM products p
JOIN label_checks c ON c.product_id = p.id
WHERE p.dihapus_at IS NULL
ORDER BY p.id, c.dikonfirmasi_at DESC;
