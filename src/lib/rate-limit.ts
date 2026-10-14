import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { run, storageKind } from "./analytics/store";

export function clientIp(request: Request | Headers) {
  const headers = request instanceof Headers ? request : request.headers;
  if (process.env.VERCEL === "1") {
    return (headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "unknown";
  }
  const trusted = process.env.TRUST_PROXY === "1" ? "x-real-ip" : (process.env.TRUST_PROXY ?? "").trim().toLowerCase();
  if (/^[a-z][a-z-]*$/.test(trusted)) {
    const value = headers.get(trusted) ?? "";
    return ((trusted === "x-forwarded-for" ? value.split(",").at(-1) : value) ?? "").trim() || "unknown";
  }
  return "local";
}

export const ipKey = (ip: string) =>
  createHash("sha256")
    .update(`${process.env.ADMIN_SECRET ?? "xayezreps"}|${ip}`)
    .digest("hex")
    .slice(0, 24);

type Hit = { ok: boolean; count: number; retryAfter: number };

const mem = ((globalThis as { __xayezRate?: Map<string, { n: number; until: number }> }).__xayezRate ??= new Map());

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


export async function limitRequest(request: Request, name: string, limit: number, windowS: number): Promise<Response | null> {
  try {
    const result = await hit(name, ipKey(clientIp(request)), limit, windowS);
    if (result.ok) return null;
    return Response.json({ error: "rate-limited" }, { status: 429, headers: { "Retry-After": String(result.retryAfter), "Cache-Control": "no-store" } });
  } catch {
    return null;
  }
}

export function tooLarge(request: Request, maxBytes: number) {
  const length = Number(request.headers.get("content-length"));
  return Number.isFinite(length) && length > maxBytes;
}

export function sameSecret(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function isCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  return sameSecret(request.headers.get("authorization") ?? "", `Bearer ${secret}`);
}
