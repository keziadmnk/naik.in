DELETE FROM transactions
WHERE category_id IN (SELECT id FROM categories WHERE kelompok = 'pribadi');

UPDATE import_rows SET category_id = NULL
WHERE category_id IN (SELECT id FROM categories WHERE kelompok = 'pribadi');

DELETE FROM categories WHERE kelompok = 'pribadi';

ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_kelompok_check;
ALTER TABLE categories ADD CONSTRAINT categories_kelompok_check
  CHECK (kelompok IN ('penjualan', 'pemasukan_lain', 'hpp', 'operasional'));

DELETE FROM recurring_costs WHERE jenis = 'rumah_tangga';

ALTER TABLE recurring_costs DROP CONSTRAINT IF EXISTS recurring_costs_jenis_check;
ALTER TABLE recurring_costs ADD CONSTRAINT recurring_costs_jenis_check CHECK (jenis = 'usaha');

UPDATE user_settings SET kur_kebutuhan_rt = NULL WHERE kur_kebutuhan_rt IS NOT NULL;
