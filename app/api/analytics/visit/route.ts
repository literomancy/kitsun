import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { detectDevice, recordVisit, type VisitSource } from "../../../../lib/analytics";

export const runtime = "nodejs";

const visitorCookie = "kitsun_visitor";
const visitorMaxAge = 60 * 60 * 24 * 365;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  let source: VisitSource = "web";
  try {
    const body = (await request.json()) as { source?: unknown };
    if (body.source === "telegram") source = "telegram";
  } catch {
    // An empty or malformed body is still a valid web visit.
  }

  const existingId = request.cookies.get(visitorCookie)?.value;
  const visitorId = existingId && uuidPattern.test(existingId) ? existingId : randomUUID();
  const device = detectDevice(request.headers.get("user-agent") || "");

  try {
    await recordVisit(visitorId, source, device);
  } catch (error) {
    console.error("Failed to record visit", error);
    return NextResponse.json({ error: "Analytics unavailable" }, { status: 503 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(visitorCookie, visitorId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: visitorMaxAge,
  });
  return response;
}
