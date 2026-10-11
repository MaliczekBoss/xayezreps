import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// Podpisany token sesji admina: "v1.<wygaśnięcie w ms>.<podpis HMAC>".
// Bez bazy danych – wystarczy sekret z .env.local.

export const SESSION_COOKIE = "xayez_admin";
export const SESSION_MAX_AGE_S = 60 * 60 * 12;

function secret() {
  const s = process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD;
  return s && s.length >= 12 ? s : null;
}

const sign = (payload: string, key: string) => createHmac("sha256", key).update(payload).digest("base64url");

const safeEqual = (a: string, b: string) => {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
};

export function createSessionToken(now: number) {
  const key = secret();
  if (!key) throw new Error("Brak ADMIN_SECRET / ADMIN_PASSWORD w .env.local");
  const payload = `v1.${now + SESSION_MAX_AGE_S * 1000}`;
  return `${payload}.${sign(payload, key)}`;
}

export function verifySessionToken(token: string | undefined, now: number) {
  const key = secret();
  if (!key || !token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const payload = `${parts[0]}.${parts[1]}`;
  if (!safeEqual(sign(payload, key), parts[2])) return false;
  const expires = Number(parts[1]);
  return Number.isFinite(expires) && expires > now;
}

/** Porównanie hasła odporne na pomiar czasu */
export function checkPassword(input: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected.length < 8) return false;
  return safeEqual(input, expected);
}

export const adminConfigured = () => Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 8);
