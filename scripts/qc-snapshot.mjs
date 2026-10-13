// Odświeża data/qc-index.json: liczbę zdjęć QC i okładkę dla każdej aukcji z data/finds.json.
// Strona czyta tę migawkę zamiast odpytywać kilkaset aukcji przy każdym buildzie.
// Uruchom: npm run qc:snapshot

import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { dropPartial, loadPartial, progress, savePartial } from "./lib/progress.mjs";

const root = process.cwd();
const USFANS = { 1688: 1, taobao: 2, weidian: 3 };
const HEADERS = { "User-Agent": "xayezreps.pl (+https://xayezreps.pl)", Accept: "application/json" };
// API odpowiada 429 przy większej liczbie równoległych zapytań
const CONCURRENCY = 3;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function qc({ platform, id }) {
  const url = `https://www.usfans.com/product/${USFANS[platform]}/${id}?ref=xayez`;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(`https://xayezreps.com/api/qc?url=${encodeURIComponent(url)}`, { headers: HEADERS, signal: AbortSignal.timeout(30000) });
      if ([429, 502, 503, 504].includes(res.status)) {
        await sleep(2000 + attempt * 3000);
        continue;
      }
      // Dla aukcji bez zdjęć API odpowiada 500 z pustą listą
      const d = await res.json().catch(() => null);
      if (!Array.isArray(d?.photos)) return null;
      const photos = d.photos.filter((p) => typeof p === "string" && p.startsWith("https://"));
      return { count: photos.length, cover: photos[0] ?? null };
    } catch {
      await sleep(2000);
    }
  }
  return null;
}

const finds = JSON.parse(await readFile(path.join(root, "data", "finds.json"), "utf-8"));
const sources = [...new Map(finds.map((f) => [`${f.source.platform}:${f.source.id}`, f.source])).entries()];
const file = path.join(root, "data", "qc-index.json");
const previous = JSON.parse(await readFile(file, "utf-8").catch(() => "{}"));
// Wynik przerwanego uruchomienia: sprawdzone aukcje pomijamy
const partialFile = `${file}.partial`;
const index = await loadPartial(partialFile);
const todo = sources.filter(([key]) => !(key in index));
if (Object.keys(index).length) console.log(`Wznawiam: ${Object.keys(index).length} aukcji już sprawdzonych, zostało ${todo.length}`);
const bar = progress(todo.length, "QC");
let next = 0;
let failed = 0;
let withQc = Object.values(index).filter((v) => v.count > 0).length;
let unsaved = 0;

await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (next < todo.length) {
      const [key, source] = todo[next++];
      const info = await qc(source);
      if (info) index[key] = info;
      else if (previous[key]) index[key] = previous[key];
      else failed++;
      if (index[key]?.count > 0) withQc++;
      bar.tick(`ze zdjęciami: ${withQc}, bez odpowiedzi: ${failed}`);
      if (++unsaved >= 100) {
        unsaved = 0;
        await savePartial(partialFile, index);
      }
    }
  }),
);

const sorted = Object.fromEntries(Object.entries(index).sort(([a], [b]) => a.localeCompare(b)));
await writeFile(`${file}.tmp`, JSON.stringify(sorted));
await rename(`${file}.tmp`, file);
await dropPartial(partialFile);
const withPhotos = Object.values(sorted).filter((v) => v.count > 0).length;
console.log(`aukcje: ${sources.length}, w migawce: ${Object.keys(sorted).length}, ze zdjęciami: ${withPhotos}, bez odpowiedzi: ${failed}`);
