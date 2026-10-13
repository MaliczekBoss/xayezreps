// Odświeża data/prices.json: aktualną cenę w juanach dla każdej aukcji z data/finds.json, prosto ze strony
// agenta (USFans, api/goods/info – to samo, co widzi klient). Bierzemy najtańszy dostępny wariant.
// Import katalogu przelicza tę cenę na złotówki kursem USFans. Uruchom: npm run prices:snapshot
// (z --missing pobiera tylko aukcje, których jeszcze nie ma w pliku – np. po zmianie linków)

import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { dropPartial, loadPartial, progress, savePartial } from "./lib/progress.mjs";

const root = process.cwd();
const CHANNEL = { 1688: 1, taobao: 2, weidian: 3 };
const HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; xayezreps.pl)", Accept: "application/json" };
// Pytamy powoli, żeby nie obciążać agenta
const CONCURRENCY = 3;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Najniższa cena wariantu (z promocją, jeśli jest) albo cena produktu, gdy wariantów nie ma */
async function price({ platform, id }) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(`https://www.usfans.com/api/goods/info?channel=${CHANNEL[platform]}&goodsId=${id}&refresh=false&queryDelivery=false&activityId=`, {
        headers: HEADERS,
        signal: AbortSignal.timeout(20000),
      });
      if ([429, 500, 502, 503, 504].includes(res.status)) {
        await sleep(2000 + attempt * 3000);
        continue;
      }
      const d = await res.json().catch(() => null);
      if (d?.code !== 200 || !d.data) return null;
      const skus = Array.isArray(d.data.skuList) ? d.data.skuList : [];
      const prices = skus.map((s) => (s.discountPrice > 0 ? s.discountPrice : s.price)).filter((p) => typeof p === "number" && p > 0);
      const cny = prices.length ? Math.min(...prices) : d.data.price > 0 ? d.data.price : null;
      return cny ? { cny, at: new Date().toISOString() } : null;
    } catch {
      await sleep(2000);
    }
  }
  return null;
}

const finds = JSON.parse(await readFile(path.join(root, "data", "finds.json"), "utf-8"));
const file = path.join(root, "data", "prices.json");
const previous = JSON.parse(await readFile(file, "utf-8").catch(() => "{}"));
const onlyMissing = process.argv.includes("--missing");
// Wynik przerwanego uruchomienia: sprawdzone aukcje pomijamy; przy --missing zostają też wszystkie dotychczasowe ceny
const partialFile = `${file}.partial`;
const prices = { ...(onlyMissing ? previous : {}), ...(await loadPartial(partialFile)) };
const sources = [...new Map(finds.map((f) => [`${f.source.platform}:${f.source.id}`, f.source])).entries()].filter(([key]) => !prices[key]);
if (Object.keys(prices).length) console.log(`Wznawiam: ${Object.keys(prices).length} aukcji z ceną, zostało ${sources.length}`);
const bar = progress(sources.length, "Ceny");
let next = 0;
let missing = 0;
let unsaved = 0;

await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (next < sources.length) {
      const [key, source] = sources[next++];
      const found = await price(source);
      if (found) prices[key] = found;
      else if (previous[key]) prices[key] = previous[key];
      else missing++;
      bar.tick(`bez ceny: ${missing}`);
      if (++unsaved >= 100) {
        unsaved = 0;
        await savePartial(partialFile, prices);
      }
    }
  }),
);

const sorted = Object.fromEntries(Object.entries(prices).sort(([a], [b]) => a.localeCompare(b)));
await writeFile(`${file}.tmp`, JSON.stringify(sorted));
await rename(`${file}.tmp`, file);
await dropPartial(partialFile);
console.log(`Ceny z USFans: ${Object.keys(sorted).length}/${sources.length} aukcji, bez ceny: ${missing}`);
