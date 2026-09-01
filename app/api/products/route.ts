import { NextResponse } from "next/server";
import { listProducts } from "../../../lib/catalog";
import { defaultProducts } from "../../../lib/catalog-data";

export const runtime = "nodejs";
export async function GET() {
  try { return NextResponse.json({ products: (await listProducts()).filter((product) => product.active) }); }
  catch { return NextResponse.json({ products: defaultProducts.filter((product) => product.active) }); }
}
