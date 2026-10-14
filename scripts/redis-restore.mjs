// Wgrywa kopię z `npm run db:backup` do bazy Upstash Redis – np. przy przenosinach na nowe konto.
// Domyślnie tylko do PUSTEJ bazy (żeby niczego nie nadpisać); --force wgrywa mimo to, zastępując klucze z kopii.
// Potrzebny pełny token (nie „read only”):
//
//   KV_REST_API_URL=… KV_REST_API_TOKEN=… npm run db:restore -- <plik.json> [--force]
//
// Liczniki unikalnych odwiedzających (xs:uh, xs:ud – binarne HyperLogLog) przez REST nie dadzą się wgrać
// bajt w bajt, więc są pomijane: statystyki unikalnych osób zaczną się od zera, reszta danych wraca w całości.

import { readFile } from "node:fs/promises";

const url = (process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? "").replace(/\/$/, "");
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
const file = process.argv[2];
const force = process.argv.includes("--force");
if (!url.startsWith("https://") || !token || !file) {
  console.error("Użycie: KV_REST_API_URL=… KV_REST_API_TOKEN=… npm run db:restore -- <plik.json> [--force]");
  process.exit(1);
}

async function pipeline(commands) {
  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).map((r) => {
    if (r.error) throw new Error(r.error);
    return r.result;
  });
}

const { keys, database } = JSON.parse(await readFile(file, "utf-8"));
const [size] = await pipeline([["DBSIZE"]]);
if (size > 0 && !force) {
  console.error(`Baza docelowa ma już ${size} kluczy – nic nie wgrywam. Żeby wgrać mimo to (klucze z kopii zostaną zastąpione), dodaj --force.`);
  process.exit(1);
}

const isBinary = (v) => v && typeof v === "object" && !Array.isArray(v) && "base64" in v;
let restored = 0;
const skipped = [];
for (const [key, { type, ttlMs, value }] of Object.entries(keys)) {
  const flat = type === "hash" ? Object.values(value) : type === "zset" ? value.map(([m]) => m) : type === "string" ? [value] : value;
  if (flat.some(isBinary)) {
    skipped.push(key);
    continue;
  }
  const commands = [["DEL", key]];
  if (type === "string") commands.push(["SET", key, value]);
  else if (type === "hash") commands.push(["HSET", key, ...Object.entries(value).flat()]);
  else if (type === "set") commands.push(["SADD", key, ...value]);
  else if (type === "zset") commands.push(["ZADD", key, ...value.flatMap(([member, score]) => [String(score), member])]);
  else if (type === "list") commands.push(["RPUSH", key, ...value]);
  else {
    skipped.push(key);
    continue;
  }
  if (ttlMs) commands.push(["PEXPIRE", key, String(ttlMs)]);
  await pipeline(commands);
  restored++;
  if (restored % 20 === 0) process.stdout.write(`\rWgrane: ${restored}`);
}
console.log(`\rWgrane klucze: ${restored} z kopii bazy ${database}; pominięte: ${skipped.length}${skipped.length ? ` (${skipped.slice(0, 5).join(", ")}${skipped.length > 5 ? ", …" : ""})` : ""}`);
