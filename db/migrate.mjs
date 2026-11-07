import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Muat .env atau .env.local jika ada
const envLocalPath = path.resolve(__dirname, "../.env.local");
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envLocalPath)) {
  process.loadEnvFile?.(envLocalPath);
} else if (fs.existsSync(envPath)) {
  process.loadEnvFile?.(envPath);
}

const pool = new pg.Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
      }
    : {
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT || 5432),
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || "trialtitut",
      }
);

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log("Menghubungkan ke PostgreSQL...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    const migrationsDir = path.join(__dirname, "migrations");
    if (!fs.existsSync(migrationsDir)) {
      console.log("Direktori migrations tidak ditemukan.");
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    if (files.length === 0) {
      console.log("Tidak ada file migration.");
      return;
    }

    for (const file of files) {
      const { rows } = await client.query("SELECT 1 FROM _migrations WHERE name = $1", [file]);
      if (rows.length === 0) {
        console.log(`Menjalankan migrasi: ${file}...`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
        console.log(`✔ Berhasil: ${file}`);
      } else {
        console.log(`- Sudah pernah dijalankan: ${file}`);
      }
    }
    console.log("✔ Semua migrasi database berhasil dieksekusi!");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("❌ Migrasi gagal:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();

