import pg from "pg";
import crypto from "node:crypto";
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

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function seed() {
  const client = await pool.connect();
  try {
    console.log("Menghubungkan ke PostgreSQL untuk seeding...");

    // 1. Buat User Demo jika belum ada
    const demoEmail = "demo@naik.in";
    let userResult = await client.query("SELECT id FROM users WHERE email = $1", [demoEmail]);
    let userId;

    if (userResult.rows.length === 0) {
      const passwordHash = hashPassword("demo123456");
      const insertUser = await client.query(
        "INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id",
        [demoEmail, "Demo Pengguna", passwordHash]
      );
      userId = insertUser.rows[0].id;
      console.log(`✔ User demo dibuat: ${demoEmail} (Password: demo123456)`);
    } else {
      userId = userResult.rows[0].id;
      console.log(`- User demo sudah ada (${demoEmail})`);
    }

    // 2. Buat Bisnis Demo jika belum ada
    const buSari = await client.query(
      "SELECT id FROM businesses WHERE owner_id = $1 AND nama = $2",
      [userId, "Keripik Singkong Bu Sari"]
    );
    if (buSari.rows.length === 0) {
      await client.query(
        `INSERT INTO businesses (owner_id, nama, kota, jenis_produk, usia_usaha_bln, legalitas)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId,
          "Keripik Singkong Bu Sari",
          "Padang",
          "kering/keripik",
          24,
          JSON.stringify({ nib: true, pirt: false, bpom: false, halal: false }),
        ]
      );
      console.log("✔ Bisnis demo 'Keripik Singkong Bu Sari' dibuat.");
    }

    const uniDewi = await client.query(
      "SELECT id FROM businesses WHERE owner_id = $1 AND nama = $2",
      [userId, "Rendang Kemasan Uni Dewi"]
    );
    if (uniDewi.rows.length === 0) {
      await client.query(
        `INSERT INTO businesses (owner_id, nama, kota, jenis_produk, usia_usaha_bln, legalitas)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId,
          "Rendang Kemasan Uni Dewi",
          "Bukittinggi",
          "olahan basah",
          36,
          JSON.stringify({ nib: true, pirt: true, bpom: true, halal: true }),
        ]
      );
      console.log("✔ Bisnis demo 'Rendang Kemasan Uni Dewi' dibuat.");
    }

    console.log("✔ Seeding selesai dengan sukses!");
  } catch (err) {
    console.error("❌ Seeding gagal:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();

