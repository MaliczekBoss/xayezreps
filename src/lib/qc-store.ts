import "server-only";

import type { ProductSource } from "./agents";
import { redisCall, run, storageKind } from "./analytics/store";
import { qcPublicUrl } from "./qc-cdn";

export type QcInfo = { count: number; cover: string | null };

const KEY = (s: ProductSource) => `qc:v1:${s.platform}:${s.id}`;
const INDEX = "qc:v1:index";
export const qcKey = (s: ProductSource) => `${s.platform}:${s.id}`;
const MAX_PER_ITEM = 600;

export function shotTime(url: string, fallback: number) {
  const m = url.match(/\/(20\d{2})\/?(\d{2})\/(\d{2})\/(?:(\d{2})(\d{2})(\d{2})\/)?/);
  if (!m) return fallback;
  const [, y, mo, d, h = "0", mi = "0", s = "0"] = m;
  const t = Date.UTC(+y, +mo - 1, +d, +h, +mi, +s);
  return Number.isFinite(t) ? t : fallback;
}

export const photoUrl = (url: string, copies?: Record<string, string>) =>
  qcPublicUrl(url, copies) ?? url.replace(/^https?:\/\/kako-alosshk-pic\.kakobuy\.com\//, "https://kako-alosshk-pic.oss-cn-hongkong.aliyuncs.com/");

export const byNewest = (photos: string[], now = Date.now()) => [...photos].sort((a, b) => shotTime(b, now) - shotTime(a, now));

type Mem = { items: Map<string, Map<string, number>>; index: Map<string, QcInfo> };
const mem: Mem = ((globalThis as { __xayezQc?: Mem }).__xayezQc ??= { items: new Map(), index: new Map() });

export async function syncQc(source: ProductSource, photos: string[]): Promise<{ photos: string[]; added: number }> {
  const now = Date.now();
  const key = KEY(source);

  if (storageKind() === "memory") {
    const set = mem.items.get(key) ?? new Map<string, number>();
    mem.items.set(key, set);
    let added = 0;
    for (const p of photos) {
      if (set.has(p)) continue;
      set.set(p, shotTime(p, now));
      added++;
    }
    const all = [...set].sort((a, b) => b[1] - a[1]).slice(0, MAX_PER_ITEM).map(([p]) => p);
    if (added) mem.index.set(qcKey(source), { count: all.length, cover: all[0] ?? null });
    return { photos: all, added };
  }

  const pairs = photos.flatMap((p) => [shotTime(p, now), p]);
  const [added, , all] = (await run([
    ...(pairs.length ? [{ op: "ZADD", keys: [key], args: ["NX", ...pairs] }] : [{ op: "ZCARD", keys: [key] }]),
    { op: "ZREMRANGEBYRANK", keys: [key], args: [0, -(MAX_PER_ITEM + 1)] },
    { op: "ZREVRANGE", keys: [key], args: [0, -1] },
  ])) as [number, number, string[]];
  const list = Array.isArray(all) ? all : [];
  const fresh = pairs.length ? Number(added) || 0 : 0;
  if (fresh > 0) await redisCall(["HSET", INDEX, qcKey(source), JSON.stringify({ count: list.length, cover: list[0] ?? null } satisfies QcInfo)]);
  return { photos: list, added: fresh };
}

export async function storedQcIndex(): Promise<Record<string, QcInfo>> {
  if (storageKind() === "memory") return Object.fromEntries(mem.index);
  const flat = (await redisCall(["HGETALL", INDEX])) as string[] | null;
  const out: Record<string, QcInfo> = {};
  for (let i = 0; flat && i < flat.length; i += 2) {
    try {
      const v = JSON.parse(flat[i + 1]) as QcInfo;
      if (typeof v?.count === "number") out[flat[i]] = { count: v.count, cover: typeof v.cover === "string" ? v.cover : null };
    } catch {}
  }
  return out;
}

export async function qcCursor(next?: number): Promise<number> {
  if (storageKind() === "memory") {
    const g = globalThis as { __xayezQcCursor?: number };
    if (next !== undefined) g.__xayezQcCursor = next;
    return g.__xayezQcCursor ?? 0;
  }
  if (next !== undefined) {
    await redisCall(["SET", "qc:v1:cursor", next]);
    return next;
  }
  return Number(await redisCall(["GET", "qc:v1:cursor"])) || 0;
}
