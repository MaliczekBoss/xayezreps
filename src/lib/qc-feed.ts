import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { cacheLife, cacheTag } from "next/cache";
import { sourceUrl, type ProductSource } from "./agents";
import { sortNewest, type Find } from "./finds";
import { qcKey, storedQcIndex, type QcInfo } from "./qc-store";
import { live } from "./live";
import { getAllFinds, getFinds } from "./store";

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

const FEED_SIZE = 16;

const sourceKey = (f: Pick<Find, "source">) => qcKey(f.source);

/**
 * Liczba zdjęć QC i okładka dla każdej aukcji: migawka data/qc-index.json (npm run qc:snapshot)
 * uzupełniona o zdjęcia zapisane u nas (qc-store.ts) – większa liczba wygrywa, okładka jest najnowsza.
 * Nie pytamy źródeł QC przy ładowaniu strony: przy kilku tysiącach aukcji każda wolna odpowiedź
 * blokowała cały katalog. Nowe zdjęcia dopisują strona produktu i codzienny cron (/api/cron/qc).
 */
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
  return snapshot;
}

/** Aukcje z naszego katalogu (także ukryte części outfitów) – tylko dla nich zapisujemy QC */
export async function isCatalogSource(source: ProductSource) {
  const finds = await getAllFinds();
  return finds.some((f) => qcKey(f.source) === qcKey(source));
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
