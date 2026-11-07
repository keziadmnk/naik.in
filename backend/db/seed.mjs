import pg from "pg";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
        database: process.env.DB_NAME || "naikin",
      }
);

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const DEMO_EMAIL = "demo@naik.in";
const DEMO_PASSWORD = "demo123456";

const DATA = JSON.parse(fs.readFileSync(path.join(__dirname, "seed-data", "bu-sari.json"), "utf8"));

const BISNIS_LAMA = ["Keripik Singkong Bu Sari", "Rendang Kemasan Uni Dewi"];

async function seed() {
  const client = await pool.connect();
  try {
    console.log("Menghubungkan ke PostgreSQL untuk seeding...");
    await client.query("BEGIN");
    const { profil } = DATA;

    let { rows } = await client.query("SELECT id FROM users WHERE email = $1", [DEMO_EMAIL]);
    let userId = rows[0]?.id;
    if (!userId) {
      ({ rows } = await client.query(
        "INSERT INTO users (email, name, password_hash, phone) VALUES ($1, $2, $3, $4) RETURNING id",
        [DEMO_EMAIL, profil.namaPemilik, hashPassword(DEMO_PASSWORD), profil.telepon]
      ));
      userId = rows[0].id;
      console.log(`✔ User demo dibuat: ${DEMO_EMAIL} (Password: ${DEMO_PASSWORD})`);
    } else {
      await client.query("UPDATE users SET name = $2, phone = $3 WHERE id = $1", [userId, profil.namaPemilik, profil.telepon]);
      console.log(`- User demo sudah ada, nama diperbarui: ${profil.namaPemilik}`);
    }

    const lama = await client.query(
      "DELETE FROM businesses WHERE owner_id = $1 AND nama = ANY($2) RETURNING nama",
      [userId, BISNIS_LAMA]
    );
    if (lama.rowCount) console.log(`✔ Data contoh lama dihapus: ${lama.rows.map((r) => r.nama).join(", ")}`);

    ({ rows } = await client.query("SELECT id FROM businesses WHERE owner_id = $1 AND nama = $2", [userId, profil.namaUsaha]));
    let bisnisId = rows[0]?.id;
    const mulai = new Date(profil.mulaiUsaha);
    const hariIni = new Date(DATA.hariIni);
    const usiaBulan = (hariIni.getFullYear() - mulai.getFullYear()) * 12 + (hariIni.getMonth() - mulai.getMonth());
    if (!bisnisId) {
      ({ rows } = await client.query(
        `INSERT INTO businesses (owner_id, nama, kota, jenis_produk, usia_usaha_bln, legalitas, kategori_usaha, mulai_usaha,
                                 metode_pembayaran, rekening_terpisah, punya_catatan, onboarding_selesai_at)
         VALUES ($1, $2, $3, 'kering/keripik', $4, $5, $6, $7, $8, false, true, now()) RETURNING id`,
        [
          userId,
          profil.namaUsaha,
          profil.kota,
          usiaBulan,
          JSON.stringify({ nib: true, pirt: true, bpom: false, halal: false }),
          profil.kategoriUsaha,
          profil.mulaiUsaha,
          ["Tunai", "QRIS", "Transfer", "Marketplace"],
        ]
      ));
      bisnisId = rows[0].id;
      console.log(`✔ Usaha dibuat: ${profil.namaUsaha} (${profil.kota}, ${usiaBulan} bulan)`);
    } else {
      await client.query(
        "UPDATE businesses SET kota = $2, mulai_usaha = $3, usia_usaha_bln = $4, diubah = now() WHERE id = $1",
        [bisnisId, profil.kota, profil.mulaiUsaha, usiaBulan]
      );
      console.log(`- Usaha sudah ada: ${profil.namaUsaha}`);
    }

    await client.query("DELETE FROM findings WHERE business_id = $1", [bisnisId]);
    await client.query("DELETE FROM transactions WHERE business_id = $1 AND sumber = 'contoh'", [bisnisId]);
    const kategori = new Map(
      (await client.query("SELECT kode, id FROM categories WHERE business_id IS NULL")).rows.map((r) => [r.kode, r.id])
    );
    const tx = DATA.transaksi;
    const KOLOM = 9;
    for (let i = 0; i < tx.length; i += 200) {
      const potong = tx.slice(i, i + 200);
      const nilai = [];
      const placeholder = potong.map((t, j) => {
        const kategoriId = kategori.get(t.kategori);
        if (!kategoriId) throw new Error(`Kategori tidak dikenal: ${t.kategori}`);
        nilai.push(bisnisId, t.tanggal, t.uraian, t.arah, kategoriId, t.metode, t.nominal, `${t.tanggal}T20:00:00+07:00`, userId);
        const b = j * KOLOM;
        return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6}, $${b + 7}, 'contoh', $${b + 8}, $${b + 9})`;
      });
      await client.query(
        `INSERT INTO transactions (business_id, tanggal, uraian, arah, category_id, metode, nominal, sumber, dikonfirmasi_at, dikonfirmasi_oleh)
         VALUES ${placeholder.join(", ")}`,
        nilai
      );
    }
    console.log(`✔ ${tx.length} transaksi contoh (4 Mei – 7 Nov 2026) dimasukkan.`);

    await client.query("DELETE FROM recurring_costs WHERE business_id = $1", [bisnisId]);
    for (const [i, b] of DATA.biayaRutin.entries()) {
      await client.query(
        "INSERT INTO recurring_costs (business_id, nama, jenis, nominal_bulanan, urutan) VALUES ($1, $2, $3, $4, $5)",
        [bisnisId, b.nama, b.jenis, b.nominalBulanan, i]
      );
    }
    await client.query(
      `INSERT INTO reminders (business_id, jenis, jam, aktif)
       VALUES ($1, 'catat_harian', '20:00', true), ($1, 'ringkasan_mingguan', '08:00', true)
       ON CONFLICT (business_id, jenis) DO NOTHING`,
      [bisnisId]
    );
    await client.query(
      "INSERT INTO user_settings (user_id, tur_selesai) VALUES ($1, true) ON CONFLICT (user_id) DO NOTHING",
      [userId]
    );

    for (const p of DATA.produk ?? []) {
      await client.query(
        `INSERT INTO products (id, business_id, nama) VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET nama = EXCLUDED.nama, dihapus_at = NULL`,
        [p.id, bisnisId, p.nama]
      );
      await client.query("DELETE FROM label_checks WHERE product_id = $1", [p.id]);
      await client.query(
        `INSERT INTO label_checks (product_id, mode, isian, teks_lain, skor, kategori, rincian, klaim, dikonfirmasi_at, dikonfirmasi_oleh)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [p.id, p.mode, JSON.stringify(p.isian), p.teksLain, p.skor, p.kategori, JSON.stringify(p.rincian), JSON.stringify(p.klaim), `${DATA.hariIni}T09:00:00+07:00`, userId]
      );
    }
    if (DATA.produk?.length) console.log(`✔ ${DATA.produk.length} produk & pemeriksaan label contoh dimasukkan.`);

    await client.query("COMMIT");

    const rekap = await client.query(
      `SELECT to_char(bulan, 'Mon') AS nama_bulan, penjualan, hpp, operasional, laba_usaha, pribadi
       FROM v_rekap_bulanan
       WHERE business_id = $1 AND bulan BETWEEN '2026-05-01' AND '2026-10-01'
       ORDER BY bulan`,
      [bisnisId]
    );
    const jt = (n) => (Number(n) / 1e6).toFixed(1);
    console.log("  Rekap bulanan (juta): bulan | omzet | HPP | operasional | laba | pribadi");
    for (const r of rekap.rows) {
      console.log(`  ${r.nama_bulan} | ${jt(r.penjualan)} | ${jt(r.hpp)} | ${jt(r.operasional)} | ${jt(r.laba_usaha)} | ${jt(r.pribadi)}`);
    }
    console.log("✔ Seeding selesai dengan sukses!");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("❌ Seeding gagal:", err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
