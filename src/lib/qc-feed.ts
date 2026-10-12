import "server-only";

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
const CONCURRENCY = 6;

const sourceKey = (f: Pick<Find, "source">) => `${f.source.platform}:${f.source.id}`;

/**
 * Liczba zdjęć QC i okładka dla każdej aukcji z katalogu. Pobieranie ~200 aukcji trwa,
 * więc wynik trzymamy w cache przez dzień (i odświeżamy po zmianach w katalogu).
 */
export async function getQcIndex(): Promise<Record<string, QcInfo>> {
  "use cache";
  cacheLife("days");
  cacheTag("qc-index", "finds");

  // Czytamy prosto z magazynu, a nie przez getFinds(): strony wołają getFinds() równolegle,
  // a funkcja z "use cache" nie może czekać na obietnicę utworzoną poza nią
  const finds = await readDoc<Find>("finds");
  const sources = [...new Map(finds.map((f) => [sourceKey(f), f])).values()];
  const index: Record<string, QcInfo> = {};
  let next = 0;

  const worker = async () => {
    while (next < sources.length) {
      const f = sources[next++];
      try {
        const photos = await fetchQcPhotos(agents[0].productUrl(f.source));
        index[sourceKey(f)] = { count: photos?.length ?? 0, cover: photos?.[0] ?? null };
      } catch {
        index[sourceKey(f)] = { count: 0, cover: null };
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return index;
}

/** Dokleja do findów liczbę zdjęć QC (pole qc) */
export function withQc(finds: Find[], index: Record<string, QcInfo>): Find[] {
  return finds.map((f) => ({ ...f, qc: index[sourceKey(f)]?.count ?? 0 }));
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
