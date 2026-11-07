import { NextResponse } from "next/server";
import { loginLocalUser } from "@/lib/auth/local";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string; password?: string };
    if (!body.email || !body.password) return NextResponse.json({ ok: false, message: "Email dan kata sandi wajib diisi." }, { status: 400 });
    const token = await loginLocalUser(body.email, body.password);
    const response = NextResponse.json({ ok: true });
    response.cookies.set("naik_session", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" });
    return response;
  } catch {
    return NextResponse.json({ ok: false, message: "Email atau kata sandi tidak cocok." }, { status: 401 });
  }
}
