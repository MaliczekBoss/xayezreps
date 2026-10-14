import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

const [, , csvFile] = process.argv;
if (!csvFile) {
  console.error("Użycie: node scripts/import-catalogue.mjs <catalogue.csv | baza.json>");
  process.exit(1);
}

const root = process.cwd();
async function plnPerCny() {
  try {
    const res = await fetch("https://www.usfans.com/api/config/aggregation", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; xayezreps.pl)", Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    const rate = (await res.json()).data.exchangeRateList.find((r) => r.currencyCode === "PLN");
    if (rate?.exchangeRate > 0) {
      console.log(`Kurs USFans z ${rate.updateTime}: 1 CNY = ${rate.exchangeRate} zł`);
      return rate.exchangeRate;
    }
  } catch {}
  try {
    const res = await fetch("https://api.nbp.pl/api/exchangerates/rates/a/cny/?format=json", { signal: AbortSignal.timeout(10000) });
    const { rates, table } = await res.json();
    const { mid, no, effectiveDate } = rates[0];
    console.log(`USFans nie odpowiada – kurs NBP ${no} (tabela ${table}) z ${effectiveDate}: 1 CNY = ${mid} zł`);
    return mid;
  } catch {
    console.warn("USFans i NBP nie odpowiadają – kurs z tabeli 199/A/NBP/2026 (13.10.2026)");
    return 0.5852;
  }
}
const PLN_PER_CNY = await plnPerCny();

const gendersFile = path.join(root, "data", "gender.json");
const genders = existsSync(gendersFile) ? JSON.parse(readFileSync(gendersFile, "utf8")) : {};
const genderOf = (id) => (["men", "women"].includes(genders[id]) ? { gender: genders[id] } : {});

const pricesFile = path.join(root, "data", "prices.json");
const agentPrices = existsSync(pricesFile) ? JSON.parse(readFileSync(pricesFile, "utf8")) : {};

const WEIGHT = {
  Bluzy: 750,
  Swetry: 600,
  Koszulki: 250,
  Kurtki: 1200,
  Spodnie: 700,
  Spodenki: 420,
  Spódnice: 300,
  Buty: 1300,
  Paski: 350,
  Torby: 700,
  Czapki: 150,
  Biżuteria: 80,
  Bielizna: 150,
  Komplety: 900,
  Perfumy: 300,
  Zegarki: 250,
  Elektronika: 250,
  Klocki: 1200,
  Akcesoria: 150,
};

const BASE = {
  shoes: "Buty",
  "t-shirts": "Koszulki",
  hoodies: "Bluzy",
  sweaters: "Swetry",
  jackets: "Kurtki",
  pants: "Spodnie",
  shorts: "Spodenki",
  sets: "Komplety",
  headwear: "Czapki",
  bags: "Torby",
  accessories: "Akcesoria",
  jewelry: "Biżuteria",
  electronics: "Elektronika",
  other: "Akcesoria",
};

const STRONG = [
  ["Klocki", /\blego\b|\btechnic\b|building blocks?/],
  ["Zegarki", /\bwatch(es)?\b|\brolex\b|\bomega\b|audemars|\bpatek\b|richard mill|\blongines\b|\btissot\b|\bcasio\b|g-shock|\bhublot\b|\bseiko\b|breitling|\brm-?0\d\d\b|oyster perpetual|datejust|day-date/],
  ["Paski", /\bbelts?\b/],
  ["Perfumy", /perfume|\bparfum\b|fragrance|cologne|eau de|stronger with you|allure homme|sauvage|bleu de chanel|\baventus\b/],
  ["Bielizna", /\bboxers?\b|\bbriefs\b|underwear|\bthong\b|lingerie/],
];

const BY_NAME = [
  ...STRONG,
  ["Elektronika", /air ?pods|\biphone\b|phone case|\bcase\b|magsafe|mag safe|headphones|earbuds|\bbuds\b|\bjbl\b|\bmarshall\b|\bdyson\b|speaker|printer|charger|power bank|battery pack|\bipad\b|macbook|playstation|\bps5\b|nintendo|camera|vacuum|hairdryer|clippers|air tag/],
  ["Buty", /\bshoes?\b|sneakers?|\bslides?\b|slippers?|\bboots?\b|booots|timberlands?|\bugg\b|\bclogs?\b|trainers?|air force|\bjordan \d|\bdunks?\b|yeezy|new ?balance|dr\.? ?martens|\basics\b|\basisc\b|\bgel-|mercurial|\bcurb\b|\bgats\b|\bdefender\b|\bcircuit\b|triple s|\bskates?\b|loafers?|\bmules?\b|new rock|\bcrocs\b|air max|\bshox\b|flyknit|gucci ace/],
  ["Torby", /\bbags?\b|backpack|\btote\b|wallet|\bpurse\b|\bsaddle\b|birkin|crossbody|\bpouch\b|duffle|keepall|neverfull|abbesses|pochette|\bspeedy\b/],
  ["Biżuteria", /necklace|neclace|bracelet|braclet|\brings?\b|earrings?|pendant|pedant|choker|\bchains?\b/],
  ["Czapki", /\bcaps?\b|\bhats?\b|beanie|balaclava|turban/],
  ["Swetry", /sweater|\bknit\b|cardigan/],
  ["Bluzy", /hoodie|\bzip\b|crewneck|sweatshirt|\bfleece\b/],
  ["Kurtki", /jacket|jcaket|puffer|\bpuffy\b|\bcoat\b|windbreaker|\bvest\b|daunenjacke|\bparka\b|\bgilet\b/],
  ["Komplety", /tracksuit|\bsuits?\b|\bset\b|v\dset/],
  ["Spodenki", /\bshorts\b|\bjorts\b/],
  ["Spodnie", /\bpants?\b|\bjeans?\b|\bsweats\b|sweatpants|trousers|joggers|\bcargo\b|double knees?|\b501\b/],
  ["Koszulki", /\btees?\b|t-?shirts?|\bshirts?\b|tank ?tops?|\btops?\b|jersey|\bpolo\b|longsleeve|\bmerch\b/],
  ["Spódnice", /\bskirts?\b/],
];

function categoryOf(row) {
  const name = row.name.toLowerCase();
  const base = BASE[row.category] ?? "Akcesoria";
  const rules = ["other", "accessories", "electronics"].includes(row.category) ? BY_NAME : STRONG;
  for (const [category, re] of rules) if (re.test(name)) return category;
  return base;
}

const batchOf = (name) => (/\bbudget\b/i.test(name) ? "Budget batch" : /\bbest\b/i.test(name) ? "Best batch" : "Random batch");

function readCsv(text) {
  const rows = [];
  let field = "";
  let row = [];
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field || row.length) rows.push([...row, field]);
  const [header, ...data] = rows;
  return data.filter((r) => r.length === header.length).map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), r[i]])));
}

const CP1252 = { "€": 0x80, "‚": 0x82, ƒ: 0x83, "„": 0x84, "…": 0x85, "†": 0x86, "‡": 0x87, ˆ: 0x88, "‰": 0x89, Š: 0x8a, "‹": 0x8b, Œ: 0x8c, Ž: 0x8e, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97, "˜": 0x98, "™": 0x99, š: 0x9a, "›": 0x9b, œ: 0x9c, ž: 0x9e, Ÿ: 0x9f };

function fixEncoding(s) {
  if (!/[Â-ô][\u0080-¿€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/.test(s)) return s;
  const bytes = [];
  for (const ch of s) {
    const code = ch.codePointAt(0);
    if (code < 256) bytes.push(code);
    else if (CP1252[ch] !== undefined) bytes.push(CP1252[ch]);
    else return s;
  }
  const fixed = Buffer.from(bytes).toString("utf8");
  return fixed.includes("�") ? s : fixed;
}

const cleanName = (s) =>
  fixEncoding(s)
    .replace(/"{2,}/g, '"')
    .replace(/\s+/g, " ")
    .trim();

const USFANS_CHANNEL = { 1: "1688", 2: "taobao", 3: "weidian" };

function sourceOf(r) {
  const link = r.link ?? "";
  const usfans = link.match(/usfans\.com\/product\/(\d)\/(\d+)/);
  if (usfans && USFANS_CHANNEL[usfans[1]]) return { platform: USFANS_CHANNEL[usfans[1]], id: usfans[2] };
  const weidian = link.match(/weidian\.com\/.*itemI[Dd]=(\d+)/);
  if (weidian) return { platform: "weidian", id: weidian[1] };
  return { platform: r.marketplace.trim(), id: r.listing_id.trim() };
}

const imageOf = (id) => (existsSync(path.join(root, "public", "i", `${id}.webp`)) ? `/i/${id}.webp` : "");

const overridesFile = path.join(root, "data", "category-overrides.json");
const overrides = existsSync(overridesFile) ? JSON.parse(readFileSync(overridesFile, "utf8")) : {};

const allRows = csvFile.toLowerCase().endsWith(".json")
  ? JSON.parse(readFileSync(csvFile, "utf8").replace(/^﻿/, "")).map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v == null ? "" : String(v)])))
  : readCsv(readFileSync(csvFile, "utf8"));
const rows = allRows.filter((r) => imageOf(r.id.trim()));
const imported = rows.map((r) => {
  const category = overrides[r.id.trim()] ?? categoryOf(r);
  const source = sourceOf(r);
  const agentCny = Number(agentPrices[`${source.platform}:${source.id}`]?.cny);
  const pln = Number(r.price_pln);
  const cny = Number(r.price_cny);
  const pricePln = agentCny > 0 ? agentCny * PLN_PER_CNY : pln > 0 ? pln : cny > 0 ? cny * PLN_PER_CNY : 0;
  const priceCny = agentCny > 0 ? agentCny : pln > 0 ? Math.round((pln / PLN_PER_CNY) * 100) / 100 : cny > 0 ? cny : 0;
  return {
    id: r.id.trim(),
    name: cleanName(r.name),
    category,
    batch: batchOf(r.name),
    pricePln: Math.round(pricePln),
    ...(priceCny > 0 ? { priceCny } : {}),
    weightGrams: WEIGHT[category] ?? 300,
    views: Number(r.views) > 0 ? Math.round(Number(r.views)) : 0,
    ...(r.featured === "true" ? { featured: true } : {}),
    image: imageOf(r.id.trim()),
    ...genderOf(r.id.trim()),
    source,
    createdAt: new Date(r.added_at).toISOString(),
  };
});

const findsFile = path.join(root, "data", "finds.json");
const outfits = JSON.parse(readFileSync(path.join(root, "data", "outfits.json"), "utf8"));
const used = new Set(outfits.flatMap((o) => o.parts.map((p) => p.findId)));
const old = JSON.parse(readFileSync(findsFile, "utf8"));
const kept = old.filter((f) => used.has(f.id)).map(({ gender, ...f }) => ({ ...f, image: imageOf(f.id), ...genderOf(f.id), hidden: true }));

const ids = new Set();
for (const f of [...imported, ...kept]) {
  if (ids.has(f.id)) throw new Error(`Powtórzone id: ${f.id}`);
  ids.add(f.id);
}

const all = [...imported, ...kept];
writeFileSync(`${findsFile}.tmp`, JSON.stringify(all, null, 2));
renameSync(`${findsFile}.tmp`, findsFile);

const count = {};
for (const f of imported) count[f.category] = (count[f.category] ?? 0) + 1;
console.log(`Nowy katalog: ${imported.length} produktów (pominięte bez zdjęcia: ${allRows.length - rows.length}), ukrytych z outfitów: ${kept.length}`);
console.log(Object.entries(count).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} ${n}`).join(", "));
console.log(`Bez ceny: ${imported.filter((f) => !f.pricePln).length}, polecanych: ${imported.filter((f) => f.featured).length}, bez zdjęcia: ${[...imported, ...kept].filter((f) => !f.image).length}`);
