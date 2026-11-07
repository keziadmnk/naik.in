import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { logoutLocalUser } from "@/lib/auth/local";

export async function POST() {
  const token = (await cookies()).get("naik_session")?.value;
  try {
    await logoutLocalUser(token);
  } catch {
    // Database tidak tersedia: cookie tetap dihapus di bawah.
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set("naik_session", "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 0, path: "/" });
  return response;
}
