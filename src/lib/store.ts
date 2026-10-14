import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { readDoc } from "./docstore";
import type { Find } from "./finds";
import type { Outfit } from "./outfits";

// Produkty i outfity: Upstash Redis na Vercelu, pliki JSON lokalnie (szczegóły w docstore.ts)

export const FINDS_TAG = "finds";
export const OUTFITS_TAG = "outfits";

/** Wszystkie produkty, także ukryte (używane tylko w outfitach) – z cache */
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

export async function getOutfits(): Promise<Outfit[]> {
  "use cache";
  cacheTag(OUTFITS_TAG);
  cacheLife("max");
  return readDoc<Outfit>("outfits");
}

