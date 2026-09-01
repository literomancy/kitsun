import { NextRequest, NextResponse } from "next/server";
import { adminCookie, createSession, hasAdminSession, verifyPassword } from "../../../../lib/admin";

export const runtime = "nodejs";
export async function GET(request: NextRequest) { return NextResponse.json({ authenticated: hasAdminSession(request.cookies.get(adminCookie.name)?.value) }); }
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (typeof body.password !== "string" || !verifyPassword(body.password)) return NextResponse.json({ error: "Неверный пароль" }, { status: 401 });
  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(adminCookie.name, createSession(), adminCookie);
  return response;
}
export async function DELETE() { const response = NextResponse.json({ authenticated: false }); response.cookies.set(adminCookie.name, "", { ...adminCookie, maxAge: 0 }); return response; }
