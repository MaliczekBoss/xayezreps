import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { progress } from "./lib/progress.mjs";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const [findsFile = "data/finds.json", imagesDir = "public/i", reportFile = "data/.ai-categories.json"] = args.filter((a) => !a.startsWith("--"));

const BASE = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
const KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-5.6-luna";
if (!KEY) {
  console.error("Brak OPENAI_API_KEY – uruchom: node --env-file=.env.local scripts/ai-categories.mjs [finds.json] [folder zdjęć] [raport] [--apply]");
  process.exit(1);
}

const CATEGORIES = ["Bluzy", "Swetry", "Koszulki", "Kurtki", "Spodnie", "Spodenki", "Spódnice", "Buty", "Paski", "Torby", "Czapki", "Biżuteria", "Bielizna", "Komplety", "Perfumy", "Zegarki", "Elektronika", "Klocki", "Akcesoria"];

const RULES = `You assign products from a replica-fashion catalog (Weidian/Taobao listings) to exactly one shop category.
Decide by WHAT THE PRODUCT IS (its type), never by brand. Names can be English, Polish, Chinese, brand shorthand or misspelled.

Categories (use the exact Polish name):
- Bluzy: hoodies, sweatshirts, crewneck sweatshirts, zip-up hoodies, quarter-zips, fleece pullovers (not knitwear)
- Swetry: knitwear – sweaters, jumpers, knit cardigans, knit polos, knit vests
- Koszulki: t-shirts, long-sleeve tees, polo shirts, button-up shirts, tank tops, sports jerseys
- Kurtki: jackets, coats, puffers, windbreakers, varsity/bomber/leather jackets, gilets and vests
- Spodnie: trousers, jeans, joggers, sweatpants, cargo pants, leggings
- Spodenki: shorts, swim shorts
- Spódnice: skirts and dresses
- Komplety: matching sets sold as one listing (tracksuit top + bottom, tee + shorts, pyjama sets)
- Buty: all footwear – sneakers, boots, slides, sandals, loafers, slippers
- Czapki: caps, hats, beanies, bucket hats, balaclavas
- Paski: belts
- Torby: bags, backpacks, wallets, card holders, pouches, luggage
- Biżuteria: rings, necklaces, chains, bracelets, earrings, pendants, brooches, keychains
- Zegarki: watches
- Bielizna: underwear – boxers, briefs, bras, lingerie
- Perfumy: perfume, fragrance, cologne
- Elektronika: earphones, AirPods, headphones, speakers, chargers, phone cases, gadgets
- Klocki: LEGO and building-block sets
- Akcesoria: everything else – sunglasses and glasses, socks, scarves, gloves, ties, hair accessories, figures and toys (not blocks), home items

If the name does not tell the product type, keep the current category and set sure=false.`;

async function ask(messages, schema, attempt = 0) {
  try {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      signal: AbortSignal.timeout(120_000),
      body: JSON.stringify({
        model: MODEL,
        reasoning_effort: "none",
        messages,
        response_format: { type: "json_schema", json_schema: { name: "categories", strict: true, schema } },
      }),
    });
    if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const d = await res.json();
    return JSON.parse(d?.choices?.[0]?.message?.content ?? "{}");
  } catch (error) {
    if (attempt >= 4) throw error;
    await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
    return ask(messages, schema, attempt + 1);
  }
}

const verdict = {
  type: "object",
  additionalProperties: false,
  properties: { category: { type: "string", enum: CATEGORIES }, sure: { type: "boolean" } },
  required: ["category", "sure"],
};
const batchSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    items: {
      type: "array",
      items: { type: "object", additionalProperties: false, properties: { id: { type: "string" }, ...verdict.properties }, required: ["id", "category", "sure"] },
    },
  },
  required: ["items"],
};

async function pool(list, size, work) {
  let next = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (next < list.length) await work(list[next++]);
  }));
}

const finds = JSON.parse(readFileSync(findsFile, "utf8"));
const report = existsSync(reportFile) ? JSON.parse(readFileSync(reportFile, "utf8")) : { text: {}, photo: {} };
const save = () => writeFileSync(reportFile, JSON.stringify(report));

const textTodo = finds.filter((f) => !report.text[f.id]);
const batches = [];
for (let i = 0; i < textTodo.length; i += 40) batches.push(textTodo.slice(i, i + 40));
const bar1 = progress(batches.length, "Nazwy");
await pool(batches, 6, async (batch) => {
  try {
    const list = batch.map((f) => ({ id: f.id, name: f.name, current: f.category }));
    const out = await ask(
      [
        { role: "system", content: RULES },
        { role: "user", content: `Classify each product. Return every id exactly once.\n${JSON.stringify(list)}` },
      ],
      batchSchema,
    );
    for (const item of out.items ?? []) if (batch.some((f) => f.id === item.id)) report.text[item.id] = { category: item.category, sure: item.sure };
    save();
  } catch (error) {
    console.log(`  partia nieudana: ${error.message}`);
  }
  bar1.tick();
});

const suspects = finds.filter((f) => report.text[f.id] && report.text[f.id].category !== f.category && !report.photo[f.id]);
console.log(`Do sprawdzenia ze zdjęciem: ${suspects.length}`);
const bar2 = progress(suspects.length, "Zdjęcia");
await pool(suspects, 8, async (f) => {
  try {
    const file = path.join(imagesDir, `${f.id}.webp`);
    const content = [{ type: "text", text: `Product name: ${f.name}\nWhich single category is this product? Look at the photo.` }];
    if (existsSync(file)) content.push({ type: "image_url", image_url: { url: `data:image/webp;base64,${readFileSync(file).toString("base64")}`, detail: "low" } });
    const out = await ask([{ role: "system", content: RULES }, { role: "user", content }], verdict);
    report.photo[f.id] = { category: out.category, sure: out.sure };
    save();
  } catch (error) {
    console.log(`  ${f.id}: ${error.message}`);
  }
  bar2.tick();
});

const changes = finds
  .filter((f) => report.photo[f.id]?.sure && report.photo[f.id].category !== f.category)
  .map((f) => ({ id: f.id, name: f.name, from: f.category, to: report.photo[f.id].category, hidden: Boolean(f.hidden) }));
report.changes = changes;
save();

const moves = {};
for (const c of changes) moves[`${c.from} → ${c.to}`] = (moves[`${c.from} → ${c.to}`] ?? 0) + 1;
console.log(`Sprawdzone nazwy: ${Object.keys(report.text).length}/${finds.length}, ze zdjęciem: ${Object.keys(report.photo).length}, zmiany: ${changes.length}`);
console.log(Object.entries(moves).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => `  ${v}× ${k}`).join("\n"));

if (apply && changes.length) {
  const byId = new Map(changes.map((c) => [c.id, c.to]));
  for (const f of finds) if (byId.has(f.id)) f.category = byId.get(f.id);
  writeFileSync(findsFile, JSON.stringify(finds, null, 2));
  const overridesFile = path.join(path.dirname(findsFile), "category-overrides.json");
  const overrides = existsSync(overridesFile) ? JSON.parse(readFileSync(overridesFile, "utf8")) : {};
  for (const c of changes) overrides[c.id] = c.to;
  writeFileSync(overridesFile, `${JSON.stringify(Object.fromEntries(Object.entries(overrides).sort()), null, 2)}\n`);
  console.log(`Zapisano ${changes.length} zmian w ${findsFile} i ${overridesFile}`);
}
