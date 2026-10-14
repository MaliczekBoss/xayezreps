import { mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

const [, , listFile, outDir] = process.argv;
if (!listFile || !outDir) {
  console.error("Użycie: node scripts/fetch-images.mjs <lista.json> <folder>");
  process.exit(1);
}

const CONCURRENCY = 6;
const PAUSE_MS = 60;
const HEADERS = { "User-Agent": "xayezreps.pl image import (+https://xayezreps.pl)" };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const extOf = (type, url) => (type.includes("png") ? ".png" : type.includes("jpeg") || type.includes("jpg") ? ".jpg" : type.includes("webp") ? ".webp" : path.extname(new URL(url).pathname) || ".img");

mkdirSync(outDir, { recursive: true });
const list = JSON.parse(readFileSync(listFile, "utf8"));
const done = new Set(readdirSync(outDir).map((f) => f.replace(/\.[^.]+$/, "")));
const todo = list.filter((x) => !done.has(x.id));
console.log(`Do pobrania: ${todo.length} z ${list.length} (reszta już jest)`);

let next = 0;
let ok = 0;
const failed = [];

async function fetchOne({ id, url }) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(30000) });
      if (res.status === 429 || res.status >= 500) {
        await sleep(1500 * (attempt + 1));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const target = path.join(outDir, id + extOf(res.headers.get("content-type") ?? "", url));
      writeFileSync(target + ".tmp", buf);
      renameSync(target + ".tmp", target);
      return true;
    } catch (e) {
      if (attempt === 3) failed.push(`${id}: ${e.message}`);
      await sleep(1000 * (attempt + 1));
    }
  }
  return false;
}

await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (next < todo.length) {
      const item = todo[next++];
      if (await fetchOne(item)) ok++;
      if ((ok + failed.length) % 250 === 0) console.log(`  ${ok + failed.length}/${todo.length}`);
      await sleep(PAUSE_MS);
    }
  }),
);

console.log(`Pobrane: ${ok}, nieudane: ${failed.length}`);
if (failed.length) {
  writeFileSync(path.join(outDir, "..", "failed.txt"), failed.join("\n"));
  console.log(failed.slice(0, 20).join("\n"));
  process.exitCode = 1;
}
