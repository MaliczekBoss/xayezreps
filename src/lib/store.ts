import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { readDoc, writeDoc } from "./docstore";
import type { Find } from "./finds";
import type { Outfit } from "./outfits";

// Produkty i outfity: Upstash Redis na Vercelu, pliki JSON lokalnie (szczegóły w docstore.ts)

export const FINDS_TAG = "finds";
export const OUTFITS_TAG = "outfits";

/** Wszystkie produkty, także ukryte (używane tylko w outfitach) – z cache, odświeżane po zmianach w adminie */
export async function getAllFinds(): Promise<Find[]> {
  "use cache";
  cacheTag(FINDS_TAG);
  cacheLife("max");
  return readDoc<Find>("finds");
}

/** Katalog sklepu: produkty widoczne w wyszukiwarce, rzędach i kategoriach */
export async function getFinds(): Promise<Find[]> {
  "use cache";
  cacheTag(FINDS_TAG);
  cacheLife("max");
  return (await readDoc<Find>("finds")).filter((f) => !f.hidden);
}

/** Aktualna lista prosto z magazynu, dla panelu admina */
export const getFindsFresh = () => readDoc<Find>("finds", { fresh: true });

export const saveFinds = (list: Find[]) => writeDoc("finds", list);

export async function getOutfits(): Promise<Outfit[]> {
  "use cache";
  cacheTag(OUTFITS_TAG);
  cacheLife("max");
  return readDoc<Outfit>("outfits");
}

export const getOutfitsFresh = () => readDoc<Outfit>("outfits", { fresh: true });

export const saveOutfits = (list: Outfit[]) => writeDoc("outfits", list);
