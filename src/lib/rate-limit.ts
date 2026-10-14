import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { run, storageKind } from "./analytics/store";

// Limity zapytań na adres IP: chronią API, które pyta zewnętrzne serwisy (QC, sklepy, śledzenie paczek),
// żeby nikt nie zablokował nas u nich masą zapytań, i logowanie admina przed zgadywaniem hasła.

/** Adres klienta – na Vercelu nagłówki x-real-ip i x-forwarded-for ustawia platforma, klient ich nie podmieni */
export function clientIp(request: Request | Headers) {
  const headers = request instanceof Headers ? request : request.headers;
  return (headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "unknown";
}

/** Skrót adresu IP do kluczy w bazie – samego adresu nigdzie nie zapisujemy */
export const ipKey = (ip: string) =>
  createHash("sha256")
    .update(`${process.env.ADMIN_SECRET ?? "xayezreps"}|${ip}`)
    .digest("hex")
    .slice(0, 24);

type Hit = { ok: boolean; count: number; retryAfter: number };

const mem = ((globalThis as { __xayezRate?: Map<string, { n: number; until: number }> }).__xayezRate ??= new Map());

/**
 * Najwyżej `limit` zdarzeń w oknie `windowS` sekund dla klucza (np. rodzaj zapytania + IP).
 * Okno jest stałe (liczone od pełnych okresów), więc wystarczy jeden licznik z czasem wygaśnięcia.
 */
export async function hit(name: string, id: string, limit: number, windowS: number, by = 1): Promise<Hit> {
  const now = Date.now();
  const windowMs = windowS * 1000;
  const slot = Math.floor(now / windowMs);
  const retryAfter = Math.max(1, Math.ceil(((slot + 1) * windowMs - now) / 1000));
  const key = `rl:${name}:${id}:${slot}`;

  if (storageKind() !== "redis") {
    let entry = mem.get(key);
    if (!entry || entry.until <= now) mem.set(key, (entry = { n: 0, until: (slot + 1) * windowMs }));
    entry.n += by;
    return { ok: entry.n <= limit, count: entry.n, retryAfter };
  }
  const [count] = (await run([
    { op: "INCRBY", keys: [key], args: [by] },
    { op: "EXPIRE", keys: [key], args: [windowS + 5] },
  ])) as number[];
  return { ok: Number(count) <= limit, count: Number(count), retryAfter };
}

/** Bieżąca wartość licznika bez podbijania (np. „czy to IP jest już zablokowane”) */
export async function peek(name: string, id: string, windowS: number): Promise<number> {
  const slot = Math.floor(Date.now() / (windowS * 1000));
  const key = `rl:${name}:${id}:${slot}`;
  if (storageKind() !== "redis") return mem.get(key)?.n ?? 0;
  const [count] = (await run([{ op: "GET", keys: [key] }])) as (string | null)[];
  return Number(count) || 0;
}

/**
 * Limit dla publicznego API: rodzaj zapytania + IP. Gdy baza nie odpowiada, przepuszczamy –
 * lepiej, żeby strona działała, niż żeby awaria licznika zablokowała wszystkich.
 */
export async function limitRequest(request: Request, name: string, limit: number, windowS: number): Promise<Response | null> {
  try {
    const result = await hit(name, ipKey(clientIp(request)), limit, windowS);
    if (result.ok) return null;
    return Response.json({ error: "rate-limited" }, { status: 429, headers: { "Retry-After": String(result.retryAfter), "Cache-Control": "no-store" } });
  } catch {
    return null;
  }
}

/** Zbyt duże ciało zapytania – sprawdzamy nagłówek, zanim cokolwiek wczytamy */
export function tooLarge(request: Request, maxBytes: number) {
  const length = Number(request.headers.get("content-length"));
  return Number.isFinite(length) && length > maxBytes;
}

/** Porównanie sekretów odporne na pomiar czasu (np. CRON_SECRET) */
export function sameSecret(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** Zapytanie od crona Vercela: nagłówek Authorization: Bearer <CRON_SECRET> */
export function isCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  return sameSecret(request.headers.get("authorization") ?? "", `Bearer ${secret}`);
}
