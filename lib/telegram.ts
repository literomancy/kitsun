import { createHmac, timingSafeEqual } from "node:crypto";

export type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
};

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
