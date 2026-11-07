import crypto from "node:crypto";
import { postgresPool as pool } from "@/lib/db/pool";

function hashPassword(password: string, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string) {
  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

function tokenHash(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function registerLocalUser(email: string, name: string, password: string) {
  const result = await pool.query<{ id: string }>(
    "INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id",
    [email.toLowerCase(), name, hashPassword(password)],
  );
  return createSession(result.rows[0].id);
}

export async function loginLocalUser(email: string, password: string) {
  const result = await pool.query<{ id: string; password_hash: string }>(
    "SELECT id, password_hash FROM users WHERE email = $1",
    [email.toLowerCase()],
  );
  const user = result.rows[0];
  if (!user || !verifyPassword(password, user.password_hash)) throw new Error("Email atau kata sandi tidak cocok.");
  return createSession(user.id);
}

async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  await pool.query(
    "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '30 days')",
    [tokenHash(token), userId],
  );
  return token;
}

export async function getLocalUser(token: string | undefined) {
  if (!token) return null;
  const result = await pool.query<{ id: string; email: string; name: string }>(
    "SELECT u.id, u.email, u.name FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires_at > now()",
    [tokenHash(token)],
  );
  return result.rows[0] ?? null;
}

export async function closeLocalPool() {
  await pool.end();
}
