import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { redisCall, storageKind } from "./analytics/store";

// Dane panelu admina (produkty, outfity) i wgrane zdjęcia.
// Z Upstash Redis (Vercel) wszystko siedzi w bazie; bez niego – w plikach w folderze data (lokalnie, VPS).
// Plik z repozytorium jest „źródłem nowości”: gdy się zmieni (nowe wdrożenie), jego nowe pozycje
// trafiają do bazy, ale zmiany zrobione w panelu i usunięte tam pozycje zostają nietknięte.

export type DocName = "finds" | "outfits";

type WithId = { id: string };

// Wymiana całej listy: gdy znacznik się zmieni, lista w bazie jest zastępowana plikiem z repozytorium
// (stara trafia do kopii xd:{nazwa}:backup:{znacznik}). Zmień znacznik tylko przy imporcie całego katalogu.
const RESET: Record<DocName, string> = {
  finds: "2026-10-14-views-from-old-site",
  outfits: "",
};

// Przykładowe outfity z pierwszej wersji strony – zastąpione outfitami z xayezreps.com
const RETIRED: Record<DocName, string[]> = {
  finds: [],
  outfits: ["o-moncler-winter", "o-corteiz-daily", "o-summer"],
};

// Stałe ścieżki (bez zmiennych), żeby przy wdrożeniu dołączyć tylko te pliki, a nie cały projekt
const fileOf = (name: DocName) =>
  name === "finds" ? path.join(process.cwd(), "data", "finds.json") : path.join(process.cwd(), "data", "outfits.json");

async function readFileRaw(name: DocName): Promise<string> {
  try {
    return name === "finds" ? await readFile(path.join(process.cwd(), "data", "finds.json"), "utf-8") : await readFile(path.join(process.cwd(), "data", "outfits.json"), "utf-8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "[]";
    throw error;
  }
}

// Ostatnio wczytana lista na tej instancji serwera. Katalog ma kilka MB, a strony czytają go wiele razy,
// więc przez chwilę używamy kopii w pamięci (zapis z panelu podmienia ją od razu).
const MEMO_MS = 30_000;
const memo = new Map<DocName, { at: number; list: unknown[] }>();

/** Lista z magazynu; fresh – zawsze prosto z magazynu (panel admina przed zapisem) */
export async function readDoc<T extends WithId>(name: DocName, { fresh = false } = {}): Promise<T[]> {
  const hit = memo.get(name);
  if (!fresh && hit && Date.now() - hit.at < MEMO_MS) return hit.list as T[];
  const list = await loadDoc<T>(name);
  memo.set(name, { at: Date.now(), list });
  // Panel admina zmienia listę w miejscu, więc dostaje własną kopię
  return fresh ? structuredClone(list) : list;
}

async function loadDoc<T extends WithId>(name: DocName): Promise<T[]> {
  const fileRaw = await readFileRaw(name);
  if (storageKind() !== "redis") return JSON.parse(fileRaw) as T[];

  const version = createHash("sha1").update(fileRaw).digest("hex").slice(0, 16);
  const [raw, seeded, reset] = await Promise.all([redisCall(["GET", `xd:${name}`]), redisCall(["GET", `xd:${name}:seed`]), redisCall(["GET", `xd:${name}:reset`])]);

  if (RESET[name] && reset !== RESET[name]) {
    // Nowy katalog z importu: stara lista do kopii, plik z repozytorium staje się listą w bazie
    // NX: przy kilku jednoczesnych wejściach kopia zostaje z pierwszego, czyli ze starej listy
    if (typeof raw === "string") await redisCall(["SET", `xd:${name}:backup:${RESET[name]}`, raw, "NX"]);
    await redisCall(["DEL", `xd:${name}:deleted`]);
    await redisCall(["SET", `xd:${name}`, fileRaw]);
    await redisCall(["SET", `xd:${name}:seed`, version]);
    await redisCall(["SET", `xd:${name}:reset`, RESET[name]]);
    return JSON.parse(fileRaw) as T[];
  }
  if (typeof raw === "string" && seeded === version) return JSON.parse(raw) as T[];

  // Pierwsze uruchomienie albo nowa wersja pliku: dokładamy nowe pozycje z repozytorium
  const fromFile = JSON.parse(fileRaw) as T[];
  const current = typeof raw === "string" ? (JSON.parse(raw) as T[]) : [];
  const deleted = new Set(((await redisCall(["SMEMBERS", `xd:${name}:deleted`])) as string[] | null) ?? []);
  const retired = new Set(RETIRED[name]);
  const known = new Set(current.map((x) => x.id));
  const merged = [...current.filter((x) => !retired.has(x.id)), ...fromFile.filter((x) => !known.has(x.id) && !deleted.has(x.id) && !retired.has(x.id))];
  await redisCall(["SET", `xd:${name}`, JSON.stringify(merged)]);
  await redisCall(["SET", `xd:${name}:seed`, version]);
  return merged;
}

export async function writeDoc<T>(name: DocName, list: T[]) {
  memo.set(name, { at: Date.now(), list: structuredClone(list) as unknown[] });
  if (storageKind() === "redis") {
    await redisCall(["SET", `xd:${name}`, JSON.stringify(list)]);
    return;
  }
  const file = fileOf(name);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(`${file}.tmp`, JSON.stringify(list, null, 2), "utf-8");
  await rename(`${file}.tmp`, file);
}

/** Zapamiętuje usunięcie w panelu, żeby kolejne wdrożenie nie przywróciło tej pozycji z repozytorium */
export async function markDeleted(name: DocName, id: string) {
  if (storageKind() === "redis") await redisCall(["SADD", `xd:${name}:deleted`, id]);
}

/* ---------- Zdjęcia ---------- */

const UPLOAD_NAME = /^[\w-]+\.webp$/;
const uploadPath = (name: string) => path.join(process.cwd(), "data", "uploads", path.basename(name));

/** Zmniejsza zdjęcie do 1600 px (WEBP) i zapisuje je; zwraca adres /uploads/… */
export async function storeImage(input: ArrayBuffer): Promise<string> {
  const webp = await sharp(Buffer.from(input)).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
  const name = `${randomUUID()}.webp`;
  if (storageKind() === "redis") {
    await redisCall(["SET", `xi:${name}`, webp.toString("base64")]);
  } else {
    await mkdir(path.join(process.cwd(), "data", "uploads"), { recursive: true });
    await writeFile(uploadPath(name), webp);
  }
  return `/uploads/${name}`;
}

export async function readImage(name: string): Promise<Buffer | null> {
  if (storageKind() === "redis") {
    const raw = await redisCall(["GET", `xi:${name}`]);
    if (typeof raw === "string") return Buffer.from(raw, "base64");
  }
  try {
    return await readFile(uploadPath(name));
  } catch {
    return null;
  }
}

export async function removeImage(url: string) {
  if (!url.startsWith("/uploads/")) return;
  const name = path.basename(url);
  try {
    if (storageKind() === "redis") await redisCall(["DEL", `xi:${name}`]);
    else await unlink(uploadPath(name));
  } catch {
    // Zdjęcia mogło już nie być – nic nie szkodzi
  }
}

export const isUploadName = (name: string) => UPLOAD_NAME.test(name) || /^[\w-]+\.(jpg|png|webp|avif|gif)$/.test(name);
