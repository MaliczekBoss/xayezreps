import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseSource, sourceUrl } from "../src/lib/agents.ts";
import { dropPartial, loadPartial, progress, savePartial } from "./lib/progress.mjs";

const mode = process.argv[2];
if (mode !== "qc" && mode !== "items") {
  console.error("Użycie: node scripts/old-site-snapshot.mjs qc|items");
  process.exit(1);
}

const root = process.cwd();
const API = "https://xayezreps.com/api";
const HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; xayezreps.pl)", Accept: "application/json" };
const CONCURRENCY = mode === "qc" ? 3 : 2;
const CODE = { weidian: "WD", taobao: "TB", 1688: "AL" };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shardOf = (key) => createHash("sha1").update(key).digest("hex").slice(0, 2);
const isPhoto = (u) => typeof u === "string" && /^https:\/\/[^\s"'<>]+$/.test(u) && u.length < 500;

async function ask(url, read) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(30000) });
      if ([429, 502, 503, 504].includes(res.status)) {
        await sleep(2000 + attempt * 3000);
        continue;
      }
      return read(res.status, await res.json().catch(() => null));
    } catch {
      await sleep(2000 + attempt * 2000);
    }
  }
  return undefined;
}

const qcOf = (source) =>
  ask(`${API}/qc?url=${encodeURIComponent(sourceUrl(source))}`, (_status, d) => (Array.isArray(d?.photos) ? d.photos.filter(isPhoto) : null));

const itemOf = (source) =>
  ask(`${API}/item-details?platform=${CODE[source.platform]}&platformID=${encodeURIComponent(source.id)}`, (status, d) => {
    if (status >= 500) return undefined;
    if (!d || typeof d !== "object" || !d.title) return null;
    const strings = (list, re) => (Array.isArray(list) ? list.filter((x) => typeof x === "string" && re.test(x)) : []);
    return {
      title: String(d.title),
      price: typeof d.price === "number" ? d.price : 0,
      domesticShip: typeof d.domesticShip === "number" ? d.domesticShip : 0,
      images: strings(d.images, /^https?:\/\//).slice(0, 8),
      description: strings(d.description, /^https:\/\//).slice(0, 8),
      isAvailable: d.isAvailable !== false,
      seller: d.seller?.name ? { name: String(d.seller.name) } : null,
      attributes: (Array.isArray(d.attributes) ? d.attributes : [])
        .filter((a) => Array.isArray(a?.values) && a.values.length)
        .map((a) => ({ tag: a.tag, name: a.name, values: a.values.slice(0, 30).map((v) => ({ name: v?.name, image: v?.image })) })),
      skus: [...new Set((Array.isArray(d.skus) ? d.skus : []).map((s) => s?.price).filter((p) => typeof p === "number"))].map((price) => ({ price })),
      qcCount: typeof d.qcCount === "number" ? d.qcCount : 0,
    };
  });

const finds = JSON.parse(await readFile(path.join(root, "data", "finds.json"), "utf-8"));
const sellers = JSON.parse(await readFile(path.join(root, "data", "sellers.json"), "utf-8").catch(() => "null")) ?? (await (await fetch(`${API}/sellers`, { headers: HEADERS })).json());
const sources = new Map();
for (const f of finds) sources.set(`${f.source.platform}:${f.source.id}`, f.source);
for (const s of sellers) {
  for (const item of s.items ?? []) {
    const source = parseSource(item.link ?? "");
    if (source) sources.set(`${source.platform}:${source.id}`, source);
  }
}

const partialFile = path.join(root, "data", `.old-site-${mode}.partial.json`);
const result = await loadPartial(partialFile);
const todo = [...sources.entries()].filter(([key]) => !(key in result));
console.log(`${mode}: aukcji ${sources.size}, już zapisanych ${sources.size - todo.length}, zostało ${todo.length}`);

const bar = progress(todo.length, mode === "qc" ? "QC" : "Szczegóły");
let next = 0;
let found = Object.values(result).filter((v) => (Array.isArray(v) ? v.length : v)).length;
let failed = 0;
let unsaved = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (next < todo.length) {
      const [key, source] = todo[next++];
      const value = await (mode === "qc" ? qcOf(source) : itemOf(source));
      if (value === undefined) failed++;
      else {
        result[key] = value;
        if (Array.isArray(value) ? value.length : value) found++;
      }
      bar.tick(`${mode === "qc" ? "ze zdjęciami" : "ze szczegółami"}: ${found}, bez odpowiedzi: ${failed}`);
      if (++unsaved >= 50) {
        unsaved = 0;
        await savePartial(partialFile, result);
      }
    }
  }),
);
await savePartial(partialFile, result);

const shards = new Map();
for (const [key, value] of Object.entries(result).sort(([a], [b]) => a.localeCompare(b))) {
  const shard = shardOf(key);
  if (!shards.has(shard)) shards.set(shard, {});
  shards.get(shard)[key] = value;
}
const dir = path.join(root, "data", mode);
await mkdir(dir, { recursive: true });
for (const [shard, entries] of shards) {
  const file = path.join(dir, `${shard}.json`);
  await writeFile(`${file}.tmp`, JSON.stringify(entries));
  await rename(`${file}.tmp`, file);
}

if (mode === "qc") {
  const indexFile = path.join(root, "data", "qc-index.json");
  const index = JSON.parse(await readFile(indexFile, "utf-8").catch(() => "{}"));
  for (const [key, photos] of Object.entries(result)) if (photos.length) index[key] = { count: photos.length, cover: photos[0] };
  const sorted = Object.fromEntries(Object.entries(index).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(`${indexFile}.tmp`, JSON.stringify(sorted));
  await rename(`${indexFile}.tmp`, indexFile);
}

console.log(`Zapisano ${Object.keys(result).length} aukcji w ${shards.size} częściach (data/${mode}); ${mode === "qc" ? "ze zdjęciami" : "ze szczegółami"}: ${found}; bez odpowiedzi: ${failed}`);
if (failed === 0) await dropPartial(partialFile);
else console.log("Część aukcji nie odpowiedziała – uruchom skrypt jeszcze raz, dokończy tylko brakujące.");
