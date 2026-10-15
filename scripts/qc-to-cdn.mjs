import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { progress } from "./lib/progress.mjs";

const root = process.cwd();
const [outDir, ...extraFiles] = process.argv.slice(2);
if (!outDir) {
  console.error("Użycie: npm run qc:cdn -- <folder> [seed/baza.json …]");
  process.exit(1);
}

const qDir = path.join(outDir, "q");
mkdirSync(qDir, { recursive: true });
const CONCURRENCY = 12;
const MAX = 1400;
const RESIZE = `x-oss-process=image/resize,l_${MAX}/format,webp/quality,q_78`;
const RESIZABLE = new Set(["kk-oss-wh-hk.kakobyy.com", "kk-oss-wh-hk.kakobuy.com", "media.usfans.com", "static.rizzitgoo.com", "oss.acbuy.com"]);

const hashOf = (url) => createHash("sha1").update(url).digest("hex").slice(0, 24);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isPhoto = (u) => typeof u === "string" && /^https:\/\/[^\s"'<>]+$/.test(u) && u.length < 500;

const urls = new Set();
for (const file of readdirSync(path.join(root, "data", "qc"))) {
  for (const list of Object.values(JSON.parse(readFileSync(path.join(root, "data", "qc", file), "utf8")))) {
    if (Array.isArray(list)) list.filter(isPhoto).forEach((u) => urls.add(u));
  }
}
for (const info of Object.values(JSON.parse(readFileSync(path.join(root, "data", "qc-index.json"), "utf8")))) {
  if (isPhoto(info?.cover)) urls.add(info.cover);
}
for (const file of extraFiles) {
  const { keys } = JSON.parse(readFileSync(file, "utf8"));
  for (const [key, entry] of Object.entries(keys)) {
    if (key === "qc:v1:index" && entry.type === "hash") {
      for (const raw of Object.values(entry.value)) {
        try {
          const cover = JSON.parse(raw)?.cover;
          if (isPhoto(cover)) urls.add(cover);
        } catch {}
      }
    } else if (key.startsWith("qc:v1:") && entry.type === "zset") {
      entry.value.map(([member]) => member).filter(isPhoto).forEach((u) => urls.add(u));
    }
  }
}

function sourceOf(url) {
  const direct = url.replace(/^https?:\/\/kako-alosshk-pic\.kakobuy\.com\//, "https://kako-alosshk-pic.oss-cn-hongkong.aliyuncs.com/");
  const host = new URL(direct).hostname;
  return RESIZABLE.has(host) ? `${direct}${direct.includes("?") ? "&" : "?"}${RESIZE}` : direct;
}

async function save(url, target) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(sourceOf(url), { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(60_000) });
      if (res.status === 404 || res.status === 403) return false;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const meta = await sharp(buf).metadata();
      const ready = meta.format === "webp" && (meta.width ?? 0) <= MAX && (meta.height ?? 0) <= MAX;
      const out = ready
        ? buf
        : await sharp(buf, { animated: false }).rotate().resize({ width: MAX, height: MAX, fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
      writeFileSync(`${target}.tmp`, out);
      renameSync(`${target}.tmp`, target);
      return true;
    } catch (error) {
      if (/ENOTFOUND|getaddrinfo|unsupported image|Input buffer/i.test(String(error?.cause?.code ?? error?.message))) return false;
      await sleep(1500 * (attempt + 1));
    }
  }
  return false;
}

const todo = [...urls].filter((u) => !existsSync(path.join(qDir, `${hashOf(u)}.webp`)));
console.log(`Zdjęć QC: ${urls.size}, już pobranych: ${urls.size - todo.length}, do pobrania: ${todo.length}`);
const bar = progress(todo.length, "QC do CDN");
let next = 0;
let failed = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (next < todo.length) {
      const url = todo[next++];
      if (!(await save(url, path.join(qDir, `${hashOf(url)}.webp`)))) failed++;
      bar.tick(`nieudane: ${failed}`);
    }
  }),
);

const present = new Set(readdirSync(qDir).filter((f) => f.endsWith(".webp")).map((f) => f.slice(0, -5)));
const manifest = [...urls].map(hashOf).filter((h) => present.has(h)).sort();
writeFileSync(path.join(root, "data", "qc-cdn.json"), JSON.stringify(manifest));
console.log(`Na CDN: ${manifest.length} z ${urls.size} zdjęć (nieudane/niedostępne: ${urls.size - manifest.length}). Spis: data/qc-cdn.json, pliki: ${qDir}`);
