import { createHmac, timingSafeEqual } from "node:crypto";

export type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
};

type TelegramSession = {
  user: TelegramUser;
  expiresAt: number;
};

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

export function createTelegramSession(user: TelegramUser, secret: string, maxAgeSeconds = 60 * 60 * 24 * 30) {
  const payload = encodeBase64Url(JSON.stringify({
    user,
    expiresAt: Math.floor(Date.now() / 1000) + maxAgeSeconds,
  } satisfies TelegramSession));
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyTelegramSession(value: string, secret: string) {
  const [payload, receivedSignature, extra] = value.split(".");
  if (!payload || !receivedSignature || extra) return null;

  const expectedSignature = createHmac("sha256", secret).update(payload).digest();
  const receivedBuffer = Buffer.from(receivedSignature, "base64url");
  if (receivedBuffer.length !== expectedSignature.length) return null;
  if (!timingSafeEqual(receivedBuffer, expectedSignature)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as TelegramSession;
    if (!session.user?.id || session.expiresAt <= Date.now() / 1000) return null;
    return session.user;
  } catch {
    return null;
  }
}

export function verifyTelegramInitData(initData: string, botToken: string, maxAgeSeconds = 86_400) {
  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");
  const authDate = Number(params.get("auth_date"));

  if (!receivedHash || !authDate) return null;
  if (Math.abs(Date.now() / 1000 - authDate) > maxAgeSeconds) return null;

  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculatedHash = createHmac("sha256", secretKey).update(dataCheckString).digest();
  const receivedBuffer = Buffer.from(receivedHash, "hex");

  if (receivedBuffer.length !== calculatedHash.length) return null;
  if (!timingSafeEqual(receivedBuffer, calculatedHash)) return null;

  const rawUser = params.get("user");
  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser) as TelegramUser;
  } catch {
    return null;
  }
}
