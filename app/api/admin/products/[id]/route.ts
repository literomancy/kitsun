import { NextRequest, NextResponse } from "next/server";
import { hasAdminSession, adminCookie } from "../../../../../lib/admin";
import { availabilityOptions, catalogCategories, deleteProduct, type CatalogProduct, type ProductAvailability, type ProductColor, type ProductDetails, updateProduct } from "../../../../../lib/catalog";

export const runtime = "nodejs";
function authorized(request: NextRequest) { return hasAdminSession(request.cookies.get(adminCookie.name)?.value); }
function productFrom(body: unknown, id: string): CatalogProduct | null {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  if (typeof value.active !== "boolean" || typeof value.title !== "string" || typeof value.type !== "string" || typeof value.price !== "string" || typeof value.description !== "string" || typeof value.mark !== "string" || !catalogCategories.includes(value.category as CatalogProduct["category"]) || !["pink", "blue", "lime"].includes(value.color as string) || !availabilityOptions.includes(value.availability as ProductAvailability) || !Array.isArray(value.details) || !value.details.every((item) => item && typeof item === "object" && typeof (item as { label?: unknown }).label === "string" && typeof (item as { value?: unknown }).value === "string")) return null;
  const gallery = Array.isArray(value.gallery) ? value.gallery.filter((item): item is { label: string; src?: string } => Boolean(item && typeof item === "object" && typeof (item as { label?: unknown }).label === "string" && (typeof (item as { src?: unknown }).src === "undefined" || typeof (item as { src?: unknown }).src === "string"))) : [];
  return { id, title: value.title.trim(), type: value.type.trim(), price: value.price.trim(), description: value.description.trim(), mark: value.mark.trim(), category: value.category as CatalogProduct["category"], color: value.color as ProductColor, active: value.active, availability: value.availability as ProductAvailability, details: value.details.map((item) => ({ label: (item as { label: string }).label.trim(), value: (item as { value: string }).value.trim() })) as ProductDetails, gallery };
}
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const product = productFrom(await request.json().catch(() => null), id);
  if (!product?.title) return NextResponse.json({ error: "Проверьте заполнение полей" }, { status: 400 });
  return NextResponse.json({ product: await updateProduct(id, product) });
}
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  await deleteProduct(id);
  return new NextResponse(null, { status: 204 });
}
