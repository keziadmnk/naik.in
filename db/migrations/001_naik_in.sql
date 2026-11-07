CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nama text NOT NULL,
  kota text NOT NULL DEFAULT '',
  jenis_produk text NOT NULL DEFAULT '',
  usia_usaha_bln integer NOT NULL DEFAULT 0 CHECK (usia_usaha_bln >= 0),
  legalitas jsonb NOT NULL DEFAULT '{}'::jsonb,
  dibuat timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  tipe text NOT NULL,
  path text NOT NULL,
  hash text NOT NULL,
  status text NOT NULL,
  dibuat timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  jenis text NOT NULL,
  input jsonb NOT NULL,
  hasil jsonb NOT NULL,
  keyakinan numeric,
  dibuat timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) ON DELETE SET NULL,
  kode_publik varchar(8) NOT NULL UNIQUE CHECK (kode_publik ~ '^[A-Z0-9]{8}$'),
  isi jsonb NOT NULL,
  dibuat timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS businesses_owner_id_idx ON businesses(owner_id);
CREATE INDEX IF NOT EXISTS reports_kode_publik_idx ON reports(kode_publik);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);
