import { neon } from "@neondatabase/serverless";
import { defaultProducts, type CatalogCategory, type CatalogProduct, type ProductAvailability, type ProductColor, type ProductDetails } from "./catalog-data";
export { availabilityOptions, catalogCategories, defaultProducts, type CatalogCategory, type CatalogProduct, type ProductAvailability, type ProductColor, type ProductDetail, type ProductDetails } from "./catalog-data";

let ready: Promise<void> | undefined;

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  return neon(url);
}

async function ensureCatalog() {
  if (!ready) ready = (async () => {
    const db = sql();
    await db`CREATE TABLE IF NOT EXISTS catalog_products (id TEXT PRIMARY KEY, title TEXT NOT NULL, type TEXT NOT NULL, category TEXT NOT NULL, price TEXT NOT NULL, description TEXT NOT NULL, color TEXT NOT NULL, mark TEXT NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE, availability TEXT NOT NULL DEFAULT 'in_stock', details JSONB NOT NULL DEFAULT '{}'::jsonb, gallery JSONB NOT NULL DEFAULT '[]'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
    await db`ALTER TABLE catalog_products ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE`;
    await db`ALTER TABLE catalog_products ADD COLUMN IF NOT EXISTS availability TEXT NOT NULL DEFAULT 'in_stock'`;
    await db`ALTER TABLE catalog_products ADD COLUMN IF NOT EXISTS details JSONB NOT NULL DEFAULT '{}'::jsonb`;
    const [{ count }] = await db`SELECT COUNT(*)::INTEGER AS count FROM catalog_products`;
    if (Number(count) === 0) for (const product of defaultProducts) {
      await db`INSERT INTO catalog_products (id, title, type, category, price, description, color, mark, active, availability, details, gallery) VALUES (${product.id}, ${product.title}, ${product.type}, ${product.category}, ${product.price}, ${product.description}, ${product.color}, ${product.mark}, ${product.active}, ${product.availability}, ${JSON.stringify(product.details)}::jsonb, ${JSON.stringify(product.gallery)}::jsonb)`;
    }
  })();
  await ready;
}

function fromRow(row: Record<string, unknown>): CatalogProduct {
  const gallery = typeof row.gallery === "string" ? JSON.parse(row.gallery) : row.gallery;
  const details = typeof row.details === "string" ? JSON.parse(row.details) : row.details;
  const normalizedDetails: ProductDetails = Array.isArray(details) ? details.filter((item): item is { label: string; value: string } => Boolean(item && typeof item === "object" && typeof item.label === "string" && typeof item.value === "string")) : details && typeof details === "object" ? Object.entries(details).filter(([, value]) => typeof value === "string").map(([label, value]) => ({ label, value: value as string })) : [];
  return { id: String(row.id), title: String(row.title), type: String(row.type), category: row.category as CatalogCategory, price: String(row.price), description: String(row.description), color: row.color as ProductColor, mark: String(row.mark), active: row.active !== false, availability: (row.availability as ProductAvailability) || "in_stock", details: normalizedDetails, gallery: Array.isArray(gallery) ? gallery : [] };
}

export async function listProducts() {
  await ensureCatalog();
  const rows = await sql()`SELECT id, title, type, category, price, description, color, mark, active, availability, details, gallery FROM catalog_products ORDER BY CASE WHEN id ~ '^[0-9]+$' THEN id::INTEGER END NULLS LAST, id ASC`;
  return rows.map(fromRow);
}

export async function createProduct(product: CatalogProduct) {
  await ensureCatalog();
  await sql()`INSERT INTO catalog_products (id, title, type, category, price, description, color, mark, active, availability, details, gallery) VALUES (${product.id}, ${product.title}, ${product.type}, ${product.category}, ${product.price}, ${product.description}, ${product.color}, ${product.mark}, ${product.active}, ${product.availability}, ${JSON.stringify(product.details)}::jsonb, ${JSON.stringify(product.gallery)}::jsonb)`;
  return product;
}

export async function updateProduct(id: string, product: CatalogProduct) {
  await ensureCatalog();
  await sql()`UPDATE catalog_products SET title=${product.title}, type=${product.type}, category=${product.category}, price=${product.price}, description=${product.description}, color=${product.color}, mark=${product.mark}, active=${product.active}, availability=${product.availability}, details=${JSON.stringify(product.details)}::jsonb, gallery=${JSON.stringify(product.gallery)}::jsonb WHERE id=${id}`;
  return { ...product, id };
}

export async function deleteProduct(id: string) {
  await ensureCatalog();
  await sql()`DELETE FROM catalog_products WHERE id=${id}`;
}

export async function recordTelegramUser(user: { id: number; first_name: string; last_name?: string; username?: string; language_code?: string }) {
  const db = sql();
  await db`CREATE TABLE IF NOT EXISTS telegram_users (telegram_id BIGINT PRIMARY KEY, first_name TEXT NOT NULL, last_name TEXT, username TEXT, language_code TEXT, first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(), last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  await db`INSERT INTO telegram_users (telegram_id, first_name, last_name, username, language_code) VALUES (${user.id}, ${user.first_name}, ${user.last_name || null}, ${user.username || null}, ${user.language_code || null}) ON CONFLICT (telegram_id) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, username = EXCLUDED.username, language_code = EXCLUDED.language_code, last_seen = NOW()`;
}

export async function listTelegramUsers() {
  const db = sql();
  await db`CREATE TABLE IF NOT EXISTS telegram_users (telegram_id BIGINT PRIMARY KEY, first_name TEXT NOT NULL, last_name TEXT, username TEXT, language_code TEXT, first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(), last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  return db`SELECT telegram_id, first_name, last_name, username, language_code, first_seen, last_seen FROM telegram_users ORDER BY last_seen DESC`;
}
