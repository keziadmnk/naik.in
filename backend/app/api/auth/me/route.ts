import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getLocalUser } from "@/lib/auth/local";

export async function GET() {
  try {
    const token = (await cookies()).get("naik_session")?.value;
    const user = await getLocalUser(token);
    if (!user) return NextResponse.json({ ok: false, message: "Belum masuk." }, { status: 401 });
    return NextResponse.json({ ok: true, user });
  } catch {
    return NextResponse.json({ ok: false, message: "Sesi tidak dapat diperiksa." }, { status: 500 });
  }
}
