// Zapisuje sprzedawców ze starej strony (xayezreps.com) u nas: dane do data/sellers.json, zdjęcia produktów
// (max 720 px) do public/s/<id>.webp. Po tym podstrony sprzedawców nie potrzebują starej strony.
// Pobrane zdjęcia są pomijane, więc można przerwać i puścić ponownie. Uruchom: npm run sellers:snapshot

import { existsSync, mkdirSync } from "node:fs";
import { rename, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { progress } from "./lib/progress.mjs";

const root = process.cwd();
const outDir = path.join(root, "public", "s");
const HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; xayezreps.pl)", Accept: "application/json" };
const CONCURRENCY = 8;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Id produktu u sprzedawcy to UUID – bezpieczna nazwa pliku; na wszelki wypadek tylko te znaki
const fileOf = (id) => `${String(id).replace(/[^\w-]/g, "")}.webp`;

async function getJson(url) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(60000) });
      if (res.ok) return await res.json();
      console.log(`  ${url} → ${res.status}, ponawiam`);
    } catch (e) {
      console.log(`  ${url} → ${e.message}, ponawiam`);
    }
    await sleep(3000 * (attempt + 1));
  }
  throw new Error(`Nie udało się pobrać ${url}`);
}

/** Zdjęcie produktu: max 720 px, WebP; true, gdy plik jest na dysku */
async function saveImage(url, target) {
  if (existsSync(target)) return true;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": HEADERS["User-Agent"] }, signal: AbortSignal.timeout(30000) });
      if (res.status === 404 || res.status === 403) return false;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await sharp(buf, { animated: false })
        .rotate()
        .resize({ width: 720, height: 720, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 76 })
        .toFile(`${target}.tmp`);
      await rename(`${target}.tmp`, target);
      return true;
    } catch {
      await sleep(1500 * (attempt + 1));
    }
  }
  return false;
}

mkdirSync(outDir, { recursive: true });
const raw = await getJson("https://xayezreps.com/api/sellers");
const items = raw.flatMap((s) => (s.items ?? []).filter((i) => i.id && i.title && i.image && i.link));
console.log(`Sprzedawcy: ${raw.length}, produkty: ${items.length}`);

const saved = new Set();
const bar = progress(items.length, "Zdjęcia");
let next = 0;
let missing = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (next < items.length) {
      const item = items[next++];
      if (await saveImage(item.image, path.join(outDir, fileOf(item.id)))) saved.add(String(item.id));
      else missing++;
      bar.tick(`bez zdjęcia: ${missing}`);
    }
  }),
);

const sellers = raw.map((s) => ({
  slug: s.slug,
  name: s.name,
  description: s.description ?? "",
  tags: s.tags ?? [],
  items: (s.items ?? [])
    .filter((i) => saved.has(String(i.id)) && i.title && i.link)
    .map((i) => ({ id: String(i.id), title: i.title, price: i.price, image: `/s/${fileOf(i.id)}`, link: i.link, createdAt: i.createdAt })),
}));

const file = path.join(root, "data", "sellers.json");
await writeFile(`${file}.tmp`, JSON.stringify(sellers));
await rename(`${file}.tmp`, file);
console.log(`Zapisano ${sellers.length} sprzedawców, ${sellers.reduce((n, s) => n + s.items.length, 0)} produktów; bez zdjęcia (pominięte): ${missing}`);
