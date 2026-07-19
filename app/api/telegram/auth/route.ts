import { NextRequest, NextResponse } from "next/server";
import { createTelegramSession, verifyTelegramInitData, verifyTelegramSession } from "../../../../lib/telegram";

export const runtime = "nodejs";
const sessionCookie = "kitsun_telegram_session";
const sessionMaxAge = 60 * 60 * 24 * 30;

export async function GET(request: NextRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return NextResponse.json({ user: null }, { status: 503 });

  const cookie = request.cookies.get(sessionCookie)?.value;
  const user = cookie ? verifyTelegramSession(cookie, botToken) : null;
  return NextResponse.json({ user }, { status: user ? 200 : 401 });
}

export async function POST(request: Request) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: "Telegram is not configured" }, { status: 503 });
  }

  let initData = "";
  try {
    const body = (await request.json()) as { initData?: unknown };
    if (typeof body.initData === "string") initData = body.initData;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!initData || initData.length > 10_000) {
    return NextResponse.json({ error: "Invalid init data" }, { status: 400 });
  }

  const user = verifyTelegramInitData(initData, botToken);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const response = NextResponse.json({ user });
  response.cookies.set(sessionCookie, createTelegramSession(user, botToken, sessionMaxAge), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionMaxAge,
  });
  return response;
}
