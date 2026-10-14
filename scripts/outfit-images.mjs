import { existsSync, mkdirSync } from "node:fs";
import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { progress } from "./lib/progress.mjs";

const root = process.cwd();
const outDir = path.join(root, "public", "o");
const file = path.join(root, "data", "outfits.json");
const UA = "Mozilla/5.0 (compatible; xayezreps.pl)";
const CONCURRENCY = 6;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fileOf = (id) => `${String(id).replace(/[^\w-]/g, "")}.webp`;

async function saveImage(url, target) {
  if (existsSync(target)) return true;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30000) });
      if (res.status === 404 || res.status === 403) return false;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await sharp(buf, { animated: false })
        .rotate()
        .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
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
const outfits = JSON.parse(await readFile(file, "utf-8"));
const todo = outfits.filter((o) => /^https?:\/\//.test(o.image ?? ""));
console.log(`Outfity: ${outfits.length}, zdjęcia do przeniesienia: ${todo.length}`);

const bar = progress(todo.length, "Zdjęcia outfitów");
const failed = [];
let next = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (next < todo.length) {
      const outfit = todo[next++];
      if (await saveImage(outfit.image, path.join(outDir, fileOf(outfit.id)))) outfit.image = `/o/${fileOf(outfit.id)}`;
      else failed.push(`${outfit.id}: ${outfit.image}`);
      bar.tick(`nieudane: ${failed.length}`);
    }
  }),
);

await writeFile(`${file}.tmp`, `${JSON.stringify(outfits, null, 2)}\n`);
await rename(`${file}.tmp`, file);
console.log(`Przeniesione: ${todo.length - failed.length}, nieudane: ${failed.length}`);
if (failed.length) console.log(failed.slice(0, 20).join("\n"));
