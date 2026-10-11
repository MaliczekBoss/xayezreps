import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { agents, sourceUrl } from "./agents";
import { sortNewest } from "./finds";
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

const FEED_SIZE = 10;
const CANDIDATES = 20;

/** Najnowsze findy, które mają prawdziwe zdjęcia QC; odświeżane co godzinę */
export async function getQcFeed(): Promise<QcEntry[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("qc-feed");

  // Kilka findów może prowadzić do tej samej aukcji (np. warianty), a zdjęcia QC są per aukcja
  const seen = new Set<string>();
  const finds = sortNewest(await getFinds())
    .filter((f) => {
      const key = `${f.source.platform}:${f.source.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, CANDIDATES);
  const entries = await Promise.all(
    finds.map(async (f): Promise<QcEntry | null> => {
      try {
        const photos = await fetchQcPhotos(agents[0].productUrl(f.source));
        if (!photos?.length) return null;
        return { id: f.id, name: f.name, pricePln: f.pricePln, photos: photos.length, cover: photos[0], url: sourceUrl(f.source) };
      } catch {
        return null;
      }
    }),
  );
  return entries.filter((e): e is QcEntry => e !== null).slice(0, FEED_SIZE);
}
