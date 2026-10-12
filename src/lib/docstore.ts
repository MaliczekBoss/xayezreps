import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { redisCall, storageKind } from "./analytics/store";

// Dane panelu admina (produkty, outfity) i wgrane zdjęcia.
// Z Upstash Redis (Vercel) wszystko siedzi w bazie; bez niego – w plikach w folderze data (lokalnie, VPS).
// Pusta baza przy pierwszym odczycie wypełnia się zawartością pliku z repozytorium.

export type DocName = "finds" | "outfits";

// Stałe ścieżki (bez zmiennych), żeby przy wdrożeniu dołączyć tylko te pliki, a nie cały projekt
const fileOf = (name: DocName) =>
  name === "finds" ? path.join(process.cwd(), "data", "finds.json") : path.join(process.cwd(), "data", "outfits.json");

async function readFileDoc<T>(name: DocName): Promise<T[]> {
  try {
    const raw = name === "finds" ? await readFile(path.join(process.cwd(), "data", "finds.json"), "utf-8") : await readFile(path.join(process.cwd(), "data", "outfits.json"), "utf-8");
    return JSON.parse(raw) as T[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export async function readDoc<T>(name: DocName): Promise<T[]> {
  if (storageKind() !== "redis") return readFileDoc<T>(name);
  const raw = await redisCall(["GET", `xd:${name}`]);
  if (typeof raw === "string") return JSON.parse(raw) as T[];
  const seed = await readFileDoc<T>(name);
  await redisCall(["SET", `xd:${name}`, JSON.stringify(seed)]);
  return seed;
}

export async function writeDoc<T>(name: DocName, list: T[]) {
  if (storageKind() === "redis") {
    await redisCall(["SET", `xd:${name}`, JSON.stringify(list)]);
    return;
  }
  const file = fileOf(name);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(`${file}.tmp`, JSON.stringify(list, null, 2), "utf-8");
  await rename(`${file}.tmp`, file);
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
