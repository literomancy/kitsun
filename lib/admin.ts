import { createHmac, timingSafeEqual } from "node:crypto";

const cookieName = "kitsun_admin";
const maxAge = 60 * 60 * 24 * 7;

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value) throw new Error("ADMIN_SESSION_SECRET is not configured");
  return value;
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function verifyPassword(value: string) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  const a = Buffer.from(value);
  const b = Buffer.from(password);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createSession() {
  const payload = Buffer.from(JSON.stringify({ expires: Date.now() + maxAge * 1000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function hasAdminSession(value?: string) {
  if (!value) return false;
  const [payload, signature] = value.split(".");
  if (!payload || !signature || sign(payload) !== signature) return false;
  try { return JSON.parse(Buffer.from(payload, "base64url").toString()).expires > Date.now(); } catch { return false; }
}

export const adminCookie = { name: cookieName, maxAge, httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };
