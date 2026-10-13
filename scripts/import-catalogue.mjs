// Zamienia katalog na eksport z pliku CSV (catalogue.csv): nowe produkty dostają nasze kategorie,
// cenę w złotówkach i zdjęcie bez tła z /i/<id>.webp. Produkty użyte w outfitach zostają, ale ukryte
// (widać je tylko w outfitach). Uruchom: node scripts/import-catalogue.mjs <catalogue.csv>

import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

const [, , csvFile] = process.argv;
if (!csvFile) {
  console.error("Użycie: node scripts/import-catalogue.mjs <catalogue.csv>");
  process.exit(1);
}

const root = process.cwd();
// Kurs z xayezreps.com/api/exchange-rates w dniu importu: ile juanów za 1 zł
const CNY_PER_PLN = 1.7146;

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

// Kategorie, których eksport nie ma, rozpoznajemy po nazwie – te reguły są pewne w każdej kategorii
const STRONG = [
  ["Klocki", /\blego\b|\btechnic\b|building blocks?/],
  ["Zegarki", /\bwatch(es)?\b|\brolex\b|\bomega\b|audemars|\bpatek\b|richard mill|\blongines\b|\btissot\b|\bcasio\b|g-shock|\bhublot\b|\bseiko\b|breitling|\brm-?0\d\d\b|oyster perpetual|datejust|day-date/],
  ["Paski", /\bbelts?\b/],
  ["Perfumy", /perfume|\bparfum\b|fragrance|cologne|eau de|stronger with you|allure homme|sauvage|bleu de chanel|\baventus\b/],
  ["Bielizna", /\bboxers?\b|\bbriefs\b|underwear|\bthong\b|lingerie/],
];

// Pełne rozpoznawanie dla „other”, „accessories” i „electronics”, gdzie eksport wrzuca wszystko
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

// Eksport nie ma batchy; wyciągamy je z nazwy, a resztę oznaczamy jako zwykły batch (karta go nie pokazuje)
const batchOf = (name) => (/\bbudget\b/i.test(name) ? "Budget batch" : /\bbest\b/i.test(name) ? "Best batch" : "Random batch");

/** Prosty czytnik CSV: pola w cudzysłowach i podwójne cudzysłowy w środku */
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

const cleanName = (s) =>
  s
    .replace(/"{2,}/g, '"')
    .replace(/\s+/g, " ")
    .trim();

// Zdjęcie bez tła z public/i; gdy go nie ma (np. oryginał już nie istnieje), produkt zostaje bez zdjęcia
const imageOf = (id) => (existsSync(path.join(root, "public", "i", `${id}.webp`)) ? `/i/${id}.webp` : "");

// Produkty bez zdjęcia (np. puste zdjęcie w eksporcie) pomijamy – na stronie wyglądałyby jak błąd
// Kategorie poprawione po zdjęciach (scripts/classify-images.py) mają pierwszeństwo przed regułami z nazw
const overridesFile = path.join(root, "data", "category-overrides.json");
const overrides = existsSync(overridesFile) ? JSON.parse(readFileSync(overridesFile, "utf8")) : {};

const allRows = readCsv(readFileSync(csvFile, "utf8"));
const rows = allRows.filter((r) => imageOf(r.id.trim()));
const imported = rows.map((r) => {
  const category = overrides[r.id.trim()] ?? categoryOf(r);
  const cny = Number(r.price_cny);
  return {
    id: r.id.trim(),
    name: cleanName(r.name),
    category,
    batch: batchOf(r.name),
    pricePln: Number.isFinite(cny) && cny > 0 ? Math.round(cny / CNY_PER_PLN) : 0,
    weightGrams: WEIGHT[category] ?? 300,
    views: 0,
    // Polecane w eksporcie trafiają na górę „Najpopularniejszych”
    ...(r.featured === "true" ? { featured: true } : {}),
    image: imageOf(r.id.trim()),
    source: { platform: r.marketplace.trim(), id: r.listing_id.trim() },
    createdAt: new Date(r.added_at).toISOString(),
  };
});

// Produkty z outfitów: zostają tylko do outfitów, ze zdjęciem bez tła
const findsFile = path.join(root, "data", "finds.json");
const outfits = JSON.parse(readFileSync(path.join(root, "data", "outfits.json"), "utf8"));
const used = new Set(outfits.flatMap((o) => o.parts.map((p) => p.findId)));
const old = JSON.parse(readFileSync(findsFile, "utf8"));
const kept = old.filter((f) => used.has(f.id)).map((f) => ({ ...f, image: imageOf(f.id), hidden: true }));

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
