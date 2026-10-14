import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const SESSION_MAX_AGE_S = 60 * 60 * 12;

const production = process.env.NODE_ENV === "production";

export const SESSION_COOKIE = production ? "__Host-xayez_admin" : "xayez_admin";

export const sessionCookie = {
  httpOnly: true,
  secure: production,
  sameSite: "strict" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE_S,
};

function secret() {
  const s = process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD;
  return s && s.length >= 12 ? s : null;
}

const sign = (payload: string, key: string) => createHmac("sha256", key).update(payload).digest("base64url");

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export const safeEqual = (a: string, b: string) => timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());

export function createToken(now: number) {
  const key = secret();
  if (!key) throw new Error("Brak ADMIN_SECRET / ADMIN_PASSWORD");
  const sid = randomBytes(32).toString("base64url");
  const payload = `v2.${sid}.${now + SESSION_MAX_AGE_S * 1000}`;
  return { token: `${payload}.${sign(payload, key)}`, sid };
}

export function readToken(token: string | undefined, now: number): string | null {
  const key = secret();
  if (!key || !token || token.length > 300) return null;
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "v2") return null;
  const payload = `${parts[0]}.${parts[1]}.${parts[2]}`;
  if (!safeEqual(sign(payload, key), parts[3])) return null;
  const expires = Number(parts[2]);
  return Number.isFinite(expires) && expires > now ? parts[1] : null;
}

export function checkPassword(input: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected.length < 8 || input.length > 200) return false;
  return safeEqual(input, expected);
}

export const adminConfigured = () => Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 8);

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Decode(input: string) {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | BASE32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

const totpKey = () => {
  const raw = process.env.ADMIN_TOTP_SECRET;
  const key = raw ? base32Decode(raw) : null;
  return key && key.length >= 10 ? key : null;
};

export const totpEnabled = () => totpKey() !== null;

function totpAt(key: Buffer, counter: number) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", key).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(code).padStart(6, "0");
}

export function totpStep(code: string, now: number): number | null {
  const key = totpKey();
  if (!key || !/^\d{6}$/.test(code)) return null;
  const step = Math.floor(now / 30_000);
  for (const s of [step, step - 1, step + 1]) if (safeEqual(totpAt(key, s), code)) return s;
  return null;
}
