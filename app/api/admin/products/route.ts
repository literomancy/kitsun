import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { hasAdminSession, adminCookie } from "../../../../lib/admin";
import { availabilityOptions, catalogCategories, createProduct, listProducts, type CatalogProduct, type ProductAvailability, type ProductColor, type ProductDetails } from "../../../../lib/catalog";

export const runtime = "nodejs";

function authorized(request: NextRequest) { return hasAdminSession(request.cookies.get(adminCookie.name)?.value); }
function productFrom(body: unknown, id = randomUUID()): CatalogProduct | null {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  const color = value.color;
  const category = value.category;
  const availability = value.availability;
  const details = value.details;
  const productId = typeof value.id === "string" && value.id.trim() ? value.id.trim() : id;
  if (!/^\d+$/.test(productId) || typeof value.active !== "boolean" || typeof value.title !== "string" || typeof value.type !== "string" || typeof value.price !== "string" || typeof value.description !== "string" || typeof value.mark !== "string" || !catalogCategories.includes(category as CatalogProduct["category"]) || !["pink", "blue", "lime"].includes(color as string) || !availabilityOptions.includes(availability as ProductAvailability) || !Array.isArray(details) || !details.every((item) => item && typeof item === "object" && typeof (item as { label?: unknown }).label === "string" && typeof (item as { value?: unknown }).value === "string")) return null;
  const gallery = Array.isArray(value.gallery) ? value.gallery.filter((item): item is { label: string; src?: string } => Boolean(item && typeof item === "object" && typeof (item as { label?: unknown }).label === "string" && (typeof (item as { src?: unknown }).src === "undefined" || typeof (item as { src?: unknown }).src === "string"))) : [];
  return { id: productId, title: value.title.trim(), type: value.type.trim(), price: value.price.trim(), description: value.description.trim(), mark: value.mark.trim(), category: category as CatalogProduct["category"], color: color as ProductColor, active: value.active, availability: availability as ProductAvailability, details: details.map((item) => ({ label: (item as { label: string }).label.trim(), value: (item as { value: string }).value.trim() })) as ProductDetails, gallery };
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ products: await listProducts() });
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const product = productFrom(await request.json().catch(() => null));
  if (!product?.title) return NextResponse.json({ error: "Проверьте заполнение полей" }, { status: 400 });
  return NextResponse.json({ product: await createProduct(product) }, { status: 201 });
}
