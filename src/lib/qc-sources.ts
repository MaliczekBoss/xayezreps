import "server-only";

import { sourceUrl, type ProductSource } from "./agents";
import { fetchQcPhotos } from "./remote";

// Skąd bierzemy zdjęcia QC dla aukcji ze sklepu. Każde źródło zwraca adresy zdjęć z magazynu agenta
// albo null, gdy nie odpowiedziało. Zdjęcia zapisujemy u siebie (qc-store.ts), więc historia rośnie
// także wtedy, gdy źródło pokazuje tylko ostatnie zamówienie.
// - stara strona (xayezreps.com/api/qc): pełna historia z magazynów Kakobuy i USFans
// - USFans (api/goods/estimate-info): zdjęcia z ostatniego zamówienia w ich magazynie, bez logowania
// - CNFans: strona agenta jest teraz wyłączona (przerwa techniczna), więc nie ma czego pytać;
//   gdy wróci, wystarczy dopisać tu kolejne źródło

type QcSource = { name: string; fetch: (source: ProductSource) => Promise<string[] | null> };

const isPhoto = (u: unknown): u is string => typeof u === "string" && /^https:\/\/[^\s"'<>]+$/.test(u) && u.length < 500;

async function usfans(source: ProductSource): Promise<string[] | null> {
  // Numer aukcji wystarcza (Weidian ma 10 cyfr, Taobao i 1688 – 12, więc się nie mylą)
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

const SOURCES: QcSource[] = [
  { name: "xayezreps.com", fetch: (s) => fetchQcPhotos(sourceUrl(s), 20_000) },
  { name: "usfans", fetch: usfans },
];

/** Zdjęcia ze wszystkich źródeł naraz; ok = choć jedno źródło odpowiedziało */
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
