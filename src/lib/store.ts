import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { readDoc } from "./docstore";
import type { Find } from "./finds";
import { IMAGES_URL, imageUrl } from "./images";
import type { Outfit } from "./outfits";

const withImages = <T extends { image: string }>(list: T[]) => (IMAGES_URL ? list.map((x) => ({ ...x, image: imageUrl(x.image) })) : list);

export const FINDS_TAG = "finds";
export const OUTFITS_TAG = "outfits";

export async function getAllFinds(): Promise<Find[]> {
  "use cache";
  cacheTag(FINDS_TAG);
  cacheLife("max");
  return withImages(await readDoc<Find>("finds"));
}

export async function getFinds(): Promise<Find[]> {
  "use cache";
  cacheTag(FINDS_TAG);
  cacheLife("max");
  return withImages((await readDoc<Find>("finds")).filter((f) => !f.hidden));
}

export async function getOutfits(): Promise<Outfit[]> {
  "use cache";
  cacheTag(OUTFITS_TAG);
  cacheLife("max");
  return withImages(await readDoc<Outfit>("outfits"));
}

