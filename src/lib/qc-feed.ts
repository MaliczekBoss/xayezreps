import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { cacheLife, cacheTag } from "next/cache";
import { sourceUrl } from "./agents";
import { sortNewest, type Find } from "./finds";
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

const sourceKey = (f: Pick<Find, "source">) => `${f.source.platform}:${f.source.id}`;

/**
 * Liczba zdjęć QC i okładka dla każdej aukcji – z migawki data/qc-index.json (npm run qc:snapshot).
 * Nie pytamy serwisu QC przy ładowaniu strony: przy kilku tysiącach aukcji każda wolna odpowiedź
 * blokowała cały katalog. Aukcje spoza migawki mają po prostu 0, a pełne QC i tak ładuje się na stronie produktu.
 */
export async function getQcIndex(): Promise<Record<string, QcInfo>> {
  "use cache";
  cacheLife("days");
  cacheTag("qc-index");
  try {
    return JSON.parse(await readFile(path.join(process.cwd(), "data", "qc-index.json"), "utf-8")) as Record<string, QcInfo>;
  } catch {
    return {};
  }
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
