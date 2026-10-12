import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { cacheLife, cacheTag } from "next/cache";
import { agents, sourceUrl } from "./agents";
import { readDoc } from "./docstore";
import { sortNewest, type Find } from "./finds";
import { fetchQcPhotos } from "./remote";
import { getFinds } from "./store";

export type QcEntry = {
  id: string;
  name: string;
  pricePln: number;
  /** Liczba zdjęć QC w magazynie */
  photos: number;
  /** Pierwsze zdjęcie QC jako okładka */
  cover: string;
  /** Link do produktu w sklepie, otwierany w QC Finderze */
  url: string;
};

type QcInfo = { count: number; cover: string | null };

const FEED_SIZE = 16;
const CONCURRENCY = 4;
// Ile aukcji spoza migawki sprawdzamy na żywo i jak długo – prerender nie może na to czekać w nieskończoność
const LIVE_LIMIT = 32;
const LIVE_BUDGET_MS = 20000;

const sourceKey = (f: Pick<Find, "source">) => `${f.source.platform}:${f.source.id}`;

/** Migawka z data/qc-index.json (npm run qc:snapshot) */
async function readSnapshot(): Promise<Record<string, QcInfo>> {
  try {
    return JSON.parse(await readFile(path.join(process.cwd(), "data", "qc-index.json"), "utf-8")) as Record<string, QcInfo>;
  } catch {
    return {};
  }
}

/**
 * Liczba zdjęć QC i okładka dla każdej aukcji z katalogu. Większość bierzemy z migawki w repozytorium,
 * a na żywo sprawdzamy tylko aukcje dodane później w panelu. Wynik trzymamy w cache przez dzień.
 */
export async function getQcIndex(): Promise<Record<string, QcInfo>> {
  "use cache";
  cacheLife("days");
  cacheTag("qc-index", "finds");

  // Czytamy prosto z magazynu, a nie przez getFinds(): strony wołają getFinds() równolegle,
  // a funkcja z "use cache" nie może czekać na obietnicę utworzoną poza nią
  const [finds, snapshot] = await Promise.all([readDoc<Find>("finds"), readSnapshot()]);
  const index: Record<string, QcInfo> = { ...snapshot };
  const missing = [...new Map(finds.filter((f) => !(sourceKey(f) in index)).map((f) => [sourceKey(f), f])).values()].slice(0, LIVE_LIMIT);
  const deadline = Date.now() + LIVE_BUDGET_MS;
  let next = 0;

  const worker = async () => {
    while (next < missing.length && Date.now() < deadline) {
      const f = missing[next++];
      try {
        const photos = await fetchQcPhotos(agents[0].productUrl(f.source), 8000);
        if (photos) index[sourceKey(f)] = { count: photos.length, cover: photos[0] ?? null };
      } catch {
        // Bez odpowiedzi – spróbujemy przy następnym odświeżeniu cache
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return index;
}

/** Dokleja do findów liczbę zdjęć QC (qc) i pierwsze z nich (qcCover) */
export function withQc(finds: Find[], index: Record<string, QcInfo>): Find[] {
  return finds.map((f) => {
    const info = index[sourceKey(f)];
    return info?.cover ? { ...f, qc: info.count, qcCover: info.cover } : { ...f, qc: info?.count ?? 0 };
  });
}

/** Najnowsze findy, które mają prawdziwe zdjęcia QC – do rzędu na stronie głównej */
export async function getQcFeed(): Promise<QcEntry[]> {
  const [finds, index] = await Promise.all([getFinds(), getQcIndex()]);
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
