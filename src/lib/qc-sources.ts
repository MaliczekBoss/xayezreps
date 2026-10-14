import "server-only";

import { sourceUrl, type ProductSource } from "./agents";
import { fetchOldSiteQc } from "./remote";
import { snapshotQc } from "./snapshot";

type QcSource = { name: string; fetch: (source: ProductSource) => Promise<string[] | null> };

const isPhoto = (u: unknown): u is string => typeof u === "string" && /^https:\/\/[^\s"'<>]+$/.test(u) && u.length < 500;

async function usfans(source: ProductSource): Promise<string[] | null> {
  const res = await fetch(`https://www.usfans.com/api/goods/estimate-info?goodsId=${encodeURIComponent(source.id)}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; xayezreps.pl)", Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const d = await res.json().catch(() => null);
  if (d?.code !== 200) return null;
  return Array.isArray(d.data?.qcImages) ? d.data.qcImages.filter(isPhoto) : [];
}

async function oldSite(source: ProductSource): Promise<string[] | null> {
  const [saved, live] = await Promise.all([snapshotQc(source), fetchOldSiteQc(sourceUrl(source)).catch(() => null)]);
  if (saved === undefined && live === null) return null;
  return [...new Set([...(saved ?? []), ...(live ?? [])])];
}

const SOURCES: QcSource[] = [
  { name: "xayezreps.com", fetch: oldSite },
  { name: "usfans", fetch: usfans },
];

export async function fetchQcFromSources(source: ProductSource): Promise<{ photos: string[]; ok: boolean }> {
  const results = await Promise.allSettled(SOURCES.map((s) => s.fetch(source)));
  const photos = new Set<string>();
  let ok = false;
  results.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value) {
      ok = true;
      r.value.filter(isPhoto).forEach((p) => photos.add(p));
    } else if (r.status === "rejected") {
      console.error(`[qc] ${SOURCES[i].name}:`, (r.reason as Error)?.message ?? r.reason);
    }
  });
  return { photos: [...photos], ok };
}
