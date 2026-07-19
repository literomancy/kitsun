import { NextResponse } from "next/server";
import { verifyTelegramInitData } from "../../../../lib/telegram";

export const runtime = "nodejs";

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

  return NextResponse.json({ user });
}
