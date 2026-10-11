import "server-only";

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { cacheLife, cacheTag } from "next/cache";
import type { Find } from "./finds";

// Produkty trzymamy w pliku JSON. Działa na serwerze z trwałym dyskiem (next start, VPS).
// Na hostingu bez dysku (np. Vercel) podmień te funkcje na bazę danych.
const DATA_DIR = path.join(process.cwd(), "data");
const FINDS_FILE = path.join(DATA_DIR, "finds.json");
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

export const FINDS_TAG = "finds";

async function readFinds(): Promise<Find[]> {
  try {
    return JSON.parse(await readFile(FINDS_FILE, "utf-8")) as Find[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

/** Lista produktów dla strony głównej – z cache, odświeżana po zmianach w adminie */
export async function getFinds(): Promise<Find[]> {
  "use cache";
  cacheTag(FINDS_TAG);
  cacheLife("max");
  return readFinds();
}

/** Aktualna lista prosto z pliku, dla panelu admina */
export const getFindsFresh = readFinds;

export async function saveFinds(list: Find[]) {
  await mkdir(DATA_DIR, { recursive: true });
  const tmp = `${FINDS_FILE}.tmp`;
  await writeFile(tmp, JSON.stringify(list, null, 2), "utf-8");
  await rename(tmp, FINDS_FILE);
}
