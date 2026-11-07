import { NextResponse } from "next/server";
import { registerLocalUser } from "@/lib/auth/local";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string; name?: string; password?: string };
    if (!body.email || !body.name || !body.password || body.password.length < 8) {
      return NextResponse.json({ ok: false, message: "Nama, email, dan kata sandi minimal 8 karakter wajib diisi." }, { status: 400 });
    }
    const token = await registerLocalUser(body.email, body.name, body.password);
    const response = NextResponse.json({ ok: true });
    response.cookies.set("naik_session", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" });
    return response;
  } catch (error) {
    const message = error instanceof Error && error.message.includes("duplicate") ? "Email sudah terdaftar." : "Pendaftaran gagal. Pastikan PostgreSQL dan migration sudah siap.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
