import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { cacheLife, cacheTag } from "next/cache";
import { sourceUrl, type ProductSource } from "./agents";
import { sortNewest, type Find } from "./finds";
import { qcCopies } from "./qc-cdn";
import { photoUrl, qcKey, storedQcIndex, type QcInfo } from "./qc-store";
import { live } from "./live";
import { getAllFinds, getFinds } from "./store";

export type QcEntry = {
  id: string;
  name: string;
  pricePln: number;
  photos: number;
  cover: string;
  url: string;
};

const FEED_SIZE = 16;

const sourceKey = (f: Pick<Find, "source">) => qcKey(f.source);

export async function getQcIndex(): Promise<Record<string, QcInfo>> {
  "use cache";
  cacheLife("hours");
  cacheTag("qc-index");
  const [snapshot, stored] = await Promise.all([
    readFile(path.join(process.cwd(), "data", "qc-index.json"), "utf-8")
      .then((t) => JSON.parse(t) as Record<string, QcInfo>)
      .catch(() => ({}) as Record<string, QcInfo>),
    storedQcIndex().catch((e) => {
      console.error("[qc] zapisane QC:", (e as Error).message);
      return {} as Record<string, QcInfo>;
    }),
  ]);
  for (const [key, info] of Object.entries(stored)) {
    const prev = snapshot[key];
    snapshot[key] = { count: Math.max(info.count, prev?.count ?? 0), cover: info.cover ?? prev?.cover ?? null };
  }
  const copies = await qcCopies();
  for (const info of Object.values(snapshot)) if (info.cover) info.cover = photoUrl(info.cover, copies);
  return snapshot;
}

export async function isCatalogSource(source: ProductSource) {
  const finds = await getAllFinds();
  return finds.some((f) => qcKey(f.source) === qcKey(source));
}

export function withQc(finds: Find[], index: Record<string, QcInfo>): Find[] {
  return finds.map((f) => {
    const info = index[sourceKey(f)];
    return info?.cover ? { ...f, qc: info.count, qcCover: info.cover } : { ...f, qc: info?.count ?? 0 };
  });
}

export async function getQcFeed(): Promise<QcEntry[]> {
  const [finds, index] = await Promise.all([getFinds().then(live), getQcIndex()]);
  const seen = new Set<string>();
  const entries: QcEntry[] = [];
  for (const f of sortNewest(finds)) {
    const key = sourceKey(f);
    const info = index[key];
    if (seen.has(key) || !info?.cover) continue;
    seen.add(key);
    entries.push({ id: f.id, name: f.name, pricePln: f.pricePln, photos: info.count, cover: info.cover, url: sourceUrl(f.source) });
    if (entries.length === FEED_SIZE) break;
  }
  return entries;
}
