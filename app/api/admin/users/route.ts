import { NextRequest, NextResponse } from "next/server";
import { adminCookie, hasAdminSession } from "../../../../lib/admin";
import { getAnalyticsDashboard } from "../../../../lib/analytics";
import { listTelegramUsers } from "../../../../lib/catalog";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  if (!hasAdminSession(request.cookies.get(adminCookie.name)?.value)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [users, analytics] = await Promise.all([listTelegramUsers(), getAnalyticsDashboard()]);
  return NextResponse.json({ users, analytics });
}
