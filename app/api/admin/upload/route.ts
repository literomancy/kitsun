import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { hasAdminSession, adminCookie } from "../../../../lib/admin";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (!hasAdminSession(request.cookies.get(adminCookie.name)?.value)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/")) return NextResponse.json({ error: "Выберите изображение" }, { status: 400 });
  if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: "Максимальный размер изображения — 8 МБ" }, { status: 400 });
  const extension = file.name.split(".").pop() || "jpg";
  const blob = await put(`products/${crypto.randomUUID()}.${extension}`, file, { access: "public", addRandomSuffix: false });
  return NextResponse.json({ url: blob.url });
}
