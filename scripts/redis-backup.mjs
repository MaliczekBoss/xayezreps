// Kopia całej bazy Upstash Redis do pliku JSON: każdy klucz z typem, czasem wygaśnięcia i wartością,
// a obok podsumowanie (co jest w bazie, ile kluczy i ile zajmuje każda część).
// Tylko czyta – wystarczy token tylko do odczytu (Vercel → Storage → baza → .env.local: KV_REST_API_READ_ONLY_TOKEN).
//
//   KV_REST_API_URL=… KV_REST_API_READ_ONLY_TOKEN=… npm run db:backup -- <folder>
//
// Sesji admina (adm:) i liczników limitów zapytań ze skrótami adresów IP (rl:) nie kopiujemy – i tak szybko wygasają.
// Pliki są tylko dla właściciela (na Linuksie/macOS); kopię trzymaj prywatnie, nie wrzucaj do repozytorium.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const url = (process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? "").replace(/\/$/, "");
const token = process.env.KV_REST_API_READ_ONLY_TOKEN ?? process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
const outDir = process.argv[2];
if (!url.startsWith("https://") || !token || !outDir) {
  console.error("Użycie: KV_REST_API_URL=… KV_REST_API_READ_ONLY_TOKEN=… npm run db:backup -- <folder>");
  process.exit(1);
}

// Wyniki w base64: wartości bywają binarne (np. zdjęcia), a JSON z REST psułby takie bajty
const HEADERS = { Authorization: `Bearer ${token}`, "Upstash-Encoding": "base64", "Content-Type": "application/json" };
const BATCH = 50;
// Duże napisy (np. cały katalog) pobieramy pojedynczo
const BIG_STRING = 512 * 1024;
const SKIP = /^(adm|rl):/;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b64 = (s) => Buffer.from(s, "base64");

/** Kilka poleceń naraz (/pipeline); zwraca wyniki w tej samej kolejności */
async function pipeline(commands) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(`${url}/pipeline`, { method: "POST", headers: HEADERS, body: JSON.stringify(commands), signal: AbortSignal.timeout(120000) });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return (await res.json()).map((r) => {
        if (r.error) throw new Error(r.error);
        return r.result;
      });
    } catch (e) {
      if (attempt === 4) throw e;
      await sleep(1500 * (attempt + 1));
    }
  }
}

/** Napis z bazy: tekst, a gdy to nie jest poprawny UTF-8 – { base64 } */
function decode(value) {
  const buf = b64(value);
  const text = buf.toString("utf8");
  return Buffer.from(text, "utf8").equals(buf) ? text : { base64: value };
}

// 1. Wszystkie klucze (SCAN)
const keys = [];
let cursor = "0";
do {
  const [[next, batch]] = await pipeline([["SCAN", cursor, "COUNT", "1000"]]);
  cursor = b64(next).toString("utf8");
  for (const k of batch) keys.push(b64(k).toString("utf8"));
  process.stdout.write(`\rKlucze: ${keys.length}`);
} while (cursor !== "0");
const unique = [...new Set(keys)].filter((k) => !SKIP.test(k)).sort();
console.log(`\rKluczy w bazie: ${new Set(keys).size}, w kopii: ${unique.length} (bez sesji admina i limitów zapytań)`);

// 2. Typ, czas wygaśnięcia i długość napisów, potem wartości według typu
const dump = {};
for (let i = 0; i < unique.length; i += BATCH) {
  const part = unique.slice(i, i + BATCH);
  const meta = await pipeline(part.flatMap((k) => [["TYPE", k], ["PTTL", k]]));
  const types = part.map((_, j) => b64(meta[j * 2]).toString("utf8"));
  // Długość tylko dla napisów – STRLEN na innym typie to błąd
  const strings = part.filter((_, j) => types[j] === "string");
  const lengths = new Map((strings.length ? await pipeline(strings.map((k) => ["STRLEN", k])) : []).map((n, j) => [strings[j], Number(n)]));
  const small = [];
  for (let j = 0; j < part.length; j++) {
    const key = part[j];
    const type = types[j];
    const pttl = Number(meta[j * 2 + 1]);
    dump[key] = { type, ttlMs: pttl >= 0 ? pttl : null, value: null };
    if (type === "string" && lengths.get(key) > BIG_STRING) continue;
    if (type === "string") small.push([key, ["GET", key]]);
    else if (type === "hash") small.push([key, ["HGETALL", key]]);
    else if (type === "set") small.push([key, ["SMEMBERS", key]]);
    else if (type === "zset") small.push([key, ["ZRANGE", key, "0", "-1", "WITHSCORES"]]);
    else if (type === "list") small.push([key, ["LRANGE", key, "0", "-1"]]);
  }
  const values = small.length ? await pipeline(small.map(([, c]) => c)) : [];
  small.forEach(([key], j) => (dump[key].value = values[j]));
  process.stdout.write(`\rWartości: ${Math.min(i + BATCH, unique.length)}/${unique.length}`);
}
for (const [key, entry] of Object.entries(dump)) {
  if (entry.type === "string" && entry.value === null) [entry.value] = await pipeline([["GET", key]]);
}
console.log();

// 3. Z base64 na czytelne wartości
for (const entry of Object.values(dump)) {
  const v = entry.value;
  if (v === null) continue;
  if (entry.type === "string") entry.value = decode(v);
  else if (entry.type === "hash") entry.value = Object.fromEntries(Array.from({ length: v.length / 2 }, (_, j) => [b64(v[2 * j]).toString("utf8"), decode(v[2 * j + 1])]));
  else if (entry.type === "zset") entry.value = Array.from({ length: v.length / 2 }, (_, j) => [decode(v[2 * j]), Number(b64(v[2 * j + 1]).toString("utf8"))]);
  else entry.value = v.map(decode);
}

// 4. Zapis i podsumowanie po przedrostkach kluczy
const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
await mkdir(outDir, { recursive: true, mode: 0o700 });
const file = path.join(outDir, `redis-${stamp}.json`);
const json = JSON.stringify({ exportedAt: new Date().toISOString(), database: new URL(url).host, keys: dump }, null, 1);
await writeFile(file, json, { mode: 0o600 });

const groups = new Map();
for (const [key, entry] of Object.entries(dump)) {
  const prefix = key.split(":").slice(0, 2).join(":");
  const g = groups.get(prefix) ?? { keys: 0, bytes: 0, types: new Set() };
  g.keys++;
  g.bytes += JSON.stringify(entry.value).length;
  g.types.add(entry.type);
  groups.set(prefix, g);
}
const rows = [...groups.entries()].sort((a, b) => b[1].bytes - a[1].bytes);
const kb = (n) => `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;
const summary = [
  `Kopia bazy ${new URL(url).host} z ${new Date().toLocaleString("pl-PL")}`,
  `Plik: ${path.basename(file)} (${kb(json.length)}), kluczy: ${unique.length}`,
  "",
  "Przedrostek klucza".padEnd(34) + "Kluczy".padStart(8) + "Rozmiar".padStart(12) + "  Typ",
  ...rows.map(([p, g]) => p.padEnd(34) + String(g.keys).padStart(8) + kb(g.bytes).padStart(12) + "  " + [...g.types].join(", ")),
].join("\n");
await writeFile(path.join(outDir, `redis-${stamp}-podsumowanie.txt`), `${summary}\n`, { mode: 0o600 });
console.log(summary);
