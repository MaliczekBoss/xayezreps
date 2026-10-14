import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Binary, MongoBulkWriteError, MongoClient } from "mongodb";

const encodeField = (field) => field.replace(/[%.]/g, (c) => (c === "%" ? "%25" : "%2E")).replace(/^\$/, "%24");
const memberId = (key, member) => `${key}\u0000${member}`;

async function insertAll(collection, docs, size = 500) {
  let inserted = 0;
  for (let i = 0; i < docs.length; i += size) {
    try {
      inserted += (await collection.insertMany(docs.slice(i, i + size), { ordered: false })).insertedCount;
    } catch (error) {
      if (!(error instanceof MongoBulkWriteError)) throw error;
      inserted += error.insertedCount;
    }
  }
  return inserted;
}

function database(client) {
  const named = client.db(process.env.MONGODB_DB || undefined);
  return named.databaseName === "test" && !process.env.MONGODB_DB ? client.db("xayezreps") : named;
}

async function seedData(db, root, log) {
  const file = path.join(root, "seed", "baza.json");
  if (!existsSync(file)) return;
  const meta = db.collection("meta");
  try {
    await meta.insertOne({ _id: "seed-baza", started: new Date(), host: process.env.HOSTNAME ?? "" });
  } catch (error) {
    if (error?.code === 11000) return;
    throw error;
  }
  if ((await db.collection("kv").estimatedDocumentCount()) > 0) {
    log("Baza MongoDB ma już dane – nie wgrywam seed/baza.json.");
    await meta.updateOne({ _id: "seed-baza" }, { $set: { skipped: true } });
    return;
  }
  log("Wgrywam dane z seed/baza.json do MongoDB…");
  const { keys } = JSON.parse(readFileSync(file, "utf8"));
  const kv = [];
  const members = [];
  const scores = [];
  let skipped = 0;
  for (const [key, { type, ttlMs, value }] of Object.entries(keys)) {
    const exp = ttlMs ? new Date(Date.now() + ttlMs) : null;
    const binary = (v) => v && typeof v === "object" && !Array.isArray(v) && "base64" in v;
    if (type === "string") {
      if (binary(value)) skipped++;
      else kv.push({ _id: key, t: "string", v: value, exp });
    } else if (type === "hash") {
      const v = {};
      for (const [field, raw] of Object.entries(value)) v[encodeField(field)] = typeof raw === "string" && /^-?\d+$/.test(raw) ? Number(raw) : raw;
      kv.push({ _id: key, t: "hash", v, exp });
    } else if (type === "set") {
      for (const m of value) members.push({ _id: memberId(key, String(m)), k: key, m: String(m), exp });
    } else if (type === "zset") {
      for (const [m, s] of value) scores.push({ _id: memberId(key, String(m)), k: key, m: String(m), s: Number(s), exp });
    } else skipped++;
  }
  const counts = [await insertAll(db.collection("kv"), kv, 50), await insertAll(db.collection("kv_members"), members), await insertAll(db.collection("kv_scores"), scores)];
  await meta.updateOne({ _id: "seed-baza" }, { $set: { done: new Date(), keys: counts } });
  log(`Dane wgrane: ${counts[0]} kluczy, ${counts[1]} elementów zbiorów, ${counts[2]} wpisów historii; pominięte: ${skipped}.`);
}

async function seedImages(db, root, log) {
  const dir = path.join(root, "seed", "images");
  if (!existsSync(dir)) return;
  const files = ["i", "s", "o"].flatMap((folder) =>
    existsSync(path.join(dir, folder)) ? readdirSync(path.join(dir, folder)).filter((f) => /^[\w-]+\.webp$/.test(f)).map((f) => `${folder}/${f}`) : [],
  );
  const images = db.collection("images");
  const have = new Set((await images.find({}, { projection: { _id: 1 } }).toArray()).map((d) => d._id));
  const missing = files.filter((id) => !have.has(id));
  if (missing.length === 0) return;
  log(`Wgrywam ${missing.length} zdjęć do MongoDB…`);
  let done = 0;
  for (let i = 0; i < missing.length; i += 100) {
    const docs = missing.slice(i, i + 100).map((id) => {
      const data = readFileSync(path.join(dir, id));
      return { _id: id, data: new Binary(data), type: "image/webp", size: data.length };
    });
    done += await insertAll(images, docs, 100);
    if (Math.floor(i / 100) % 20 === 0) log(`Zdjęcia: ${Math.min(i + 100, missing.length)}/${missing.length}`);
  }
  log(`Zdjęcia wgrane: ${done}. Folder seed/images można teraz usunąć, żeby zwolnić miejsce.`);
}

export async function seed(root, log) {
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  await client.connect();
  try {
    const db = database(client);
    log(`MongoDB: baza „${db.databaseName}”`);
    await seedData(db, root, log);
    await seedImages(db, root, log);
  } finally {
    await client.close();
  }
}
