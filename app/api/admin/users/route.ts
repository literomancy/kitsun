import { NextRequest, NextResponse } from "next/server";
import { adminCookie, hasAdminSession } from "../../../../lib/admin";
import { listTelegramUsers } from "../../../../lib/catalog";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  if (!hasAdminSession(request.cookies.get(adminCookie.name)?.value)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ users: await listTelegramUsers() });
}
