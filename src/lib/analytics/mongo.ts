import "server-only";

import { MongoBulkWriteError, MongoClient, type Binary, type Collection, type Db } from "mongodb";

type KvDoc = { _id: string; t: "string" | "hash"; v: unknown; exp: Date | null };
type MemberDoc = { _id: string; k: string; m: string; exp: Date | null };
type ScoreDoc = { _id: string; k: string; m: string; s: number; exp: Date | null };
export type ImageDoc = { _id: string; data: Binary; type: string; size: number };

const URI = process.env.MONGODB_URI ?? "";

export const mongoConfigured = () => /^mongodb(\+srv)?:\/\//.test(URI);

type Handles = { db: Db; kv: Collection<KvDoc>; members: Collection<MemberDoc>; scores: Collection<ScoreDoc>; images: Collection<ImageDoc> };

const cache = globalThis as { __xayezMongo?: Promise<Handles> };

export function mongo(): Promise<Handles> {
  cache.__xayezMongo ??= (async () => {
    const client = new MongoClient(URI, { maxPoolSize: 10, serverSelectionTimeoutMS: 8000 });
    await client.connect();
    const named = client.db(process.env.MONGODB_DB || undefined);
    const db = named.databaseName === "test" && !process.env.MONGODB_DB ? client.db("xayezreps") : named;
    const handles: Handles = {
      db,
      kv: db.collection<KvDoc>("kv"),
      members: db.collection<MemberDoc>("kv_members"),
      scores: db.collection<ScoreDoc>("kv_scores"),
      images: db.collection<ImageDoc>("images"),
    };
    await Promise.all([
      handles.kv.createIndex({ exp: 1 }, { expireAfterSeconds: 0 }),
      handles.members.createIndex({ exp: 1 }, { expireAfterSeconds: 0 }),
      handles.members.createIndex({ k: 1, exp: 1 }),
      handles.members.createIndex({ k: 1, m: 1 }),
      handles.scores.createIndex({ exp: 1 }, { expireAfterSeconds: 0 }),
      handles.scores.createIndex({ k: 1, s: 1 }),
      handles.scores.createIndex({ k: 1, exp: 1 }),
    ]);
    return handles;
  })().catch((error) => {
    cache.__xayezMongo = undefined;
    throw error;
  });
  return cache.__xayezMongo;
}

const live = () => ({ $or: [{ exp: null }, { exp: { $gt: new Date() } }] });
const memberId = (key: string, member: string) => `${key}\u0000${member}`;
const encodeField = (field: string) => field.replace(/[%.]/g, (c) => (c === "%" ? "%25" : "%2E")).replace(/^\$/, "%24");
const decodeField = (field: string) => field.replace(/%(25|2E|24)/g, (_, c: string) => ({ "25": "%", "2E": ".", "24": "$" })[c]!);
const score = (raw: string | number) => (raw === "-inf" ? -Infinity : raw === "+inf" ? Infinity : Number(raw));
const asText = (value: unknown) => (value === null || value === undefined ? null : typeof value === "string" ? value : String(value));

function rangeOf(length: number, start: number, stop: number) {
  const from = Math.max(0, start < 0 ? length + start : start);
  const to = Math.min(length - 1, stop < 0 ? length + stop : stop);
  return from > to ? null : [from, to + 1];
}

async function insertMissing<T extends { _id: string }>(collection: Collection<T>, docs: T[]) {
  if (docs.length === 0) return 0;
  try {
    return (await collection.insertMany(docs as never[], { ordered: false })).insertedCount;
  } catch (error) {
    if (error instanceof MongoBulkWriteError && error.writeErrors && [error.writeErrors].flat().every((e) => e.code === 11000)) {
      return error.insertedCount;
    }
    throw error;
  }
}

async function sortedMembers(scores: Collection<ScoreDoc>, key: string, direction: 1 | -1) {
  return scores.find({ k: key, ...live() }, { projection: { m: 1, s: 1 } }).sort({ s: direction, m: direction }).toArray();
}

export async function mongoCommand(op: string, keys: string[], args: (string | number)[]): Promise<unknown> {
  const { kv, members, scores } = await mongo();
  const [key] = keys;
  const now = new Date();

  switch (op) {
    case "GET": {
      const doc = await kv.findOne({ _id: key, ...live() });
      return doc?.t === "string" ? asText(doc.v) : null;
    }
    case "SET": {
      const value = String(args[0]);
      const options = args.slice(1).map(String);
      const ex = options.findIndex((o) => o.toUpperCase() === "EX");
      const px = options.findIndex((o) => o.toUpperCase() === "PX");
      const ttlMs = ex >= 0 ? Number(options[ex + 1]) * 1000 : px >= 0 ? Number(options[px + 1]) : null;
      const exp = ttlMs === null ? null : new Date(now.getTime() + ttlMs);
      const doc = { t: "string" as const, v: value, exp };
      if (!options.some((o) => o.toUpperCase() === "NX")) {
        await kv.replaceOne({ _id: key }, doc, { upsert: true });
        return "OK";
      }
      if ((await insertMissing(kv, [{ _id: key, ...doc }])) === 1) return "OK";
      const replaced = await kv.replaceOne({ _id: key, exp: { $ne: null, $lte: now } }, doc);
      return replaced.modifiedCount === 1 ? "OK" : null;
    }
    case "DEL": {
      let removed = 0;
      for (const k of [key, ...args.map(String)]) {
        const [a, b, c] = await Promise.all([kv.deleteOne({ _id: k }), members.deleteMany({ k }), scores.deleteMany({ k })]);
        if (a.deletedCount || b.deletedCount || c.deletedCount) removed++;
      }
      return removed;
    }
    case "EXISTS": {
      const [a, b, c] = await Promise.all([
        kv.countDocuments({ _id: key, ...live() }, { limit: 1 }),
        members.countDocuments({ k: key, ...live() }, { limit: 1 }),
        scores.countDocuments({ k: key, ...live() }, { limit: 1 }),
      ]);
      return a || b || c ? 1 : 0;
    }
    case "EXPIRE": {
      const exp = new Date(now.getTime() + Number(args[0]) * 1000);
      const [a, b, c] = await Promise.all([
        kv.updateOne({ _id: key, ...live() }, { $set: { exp } }),
        members.updateMany({ k: key, exp: null }, { $set: { exp } }),
        scores.updateMany({ k: key, exp: null }, { $set: { exp } }),
      ]);
      return a.matchedCount || b.matchedCount || c.matchedCount ? 1 : 0;
    }
    case "INCRBY": {
      const doc = await kv.findOneAndUpdate(
        { _id: key },
        { $inc: { v: Number(args[0]) }, $setOnInsert: { t: "string", exp: null } } as never,
        { upsert: true, returnDocument: "after" },
      );
      return Number(doc?.v ?? 0);
    }
    case "HINCRBY": {
      const path = `v.${encodeField(String(args[0]))}`;
      const doc = await kv.findOneAndUpdate(
        { _id: key },
        { $inc: { [path]: Number(args[1]) }, $setOnInsert: { t: "hash", exp: null } } as never,
        { upsert: true, returnDocument: "after", projection: { [path]: 1 } },
      );
      return Number((doc?.v as Record<string, unknown> | undefined)?.[encodeField(String(args[0]))] ?? 0);
    }
    case "HSET": {
      const fields: Record<string, string> = {};
      for (let i = 0; i + 1 < args.length; i += 2) fields[`v.${encodeField(String(args[i]))}`] = String(args[i + 1]);
      const before = await kv.findOneAndUpdate(
        { _id: key },
        { $set: fields, $setOnInsert: { t: "hash", exp: null } } as never,
        { upsert: true, returnDocument: "before", projection: Object.fromEntries(Object.keys(fields).map((f) => [f, 1])) },
      );
      const had = (before?.v ?? {}) as Record<string, unknown>;
      return Object.keys(fields).filter((f) => !(f.slice(2) in had)).length;
    }
    case "HGET": {
      const field = encodeField(String(args[0]));
      const doc = await kv.findOne({ _id: key, ...live() }, { projection: { [`v.${field}`]: 1 } });
      return asText((doc?.v as Record<string, unknown> | undefined)?.[field]);
    }
    case "HGETALL": {
      const doc = await kv.findOne({ _id: key, ...live() });
      if (doc?.t !== "hash") return [];
      return Object.entries((doc.v ?? {}) as Record<string, unknown>).flatMap(([f, v]) => [decodeField(f), String(v)]);
    }
    case "SADD":
    case "PFADD": {
      const unique = [...new Set(args.map(String))];
      const added = await insertMissing(members, unique.map((m) => ({ _id: memberId(key, m), k: key, m, exp: null })));
      return op === "PFADD" ? (added > 0 ? 1 : 0) : added;
    }
    case "SREM":
      return (await members.deleteMany({ _id: { $in: args.map((m) => memberId(key, String(m))) } })).deletedCount;
    case "SMEMBERS":
      return (await members.find({ k: key, ...live() }, { projection: { m: 1 } }).toArray()).map((d) => d.m);
    case "PFCOUNT": {
      if (keys.length === 1) return members.countDocuments({ k: key, ...live() });
      const [row] = await members.aggregate<{ n: number }>([{ $match: { k: { $in: keys }, ...live() } }, { $group: { _id: "$m" } }, { $count: "n" }]).toArray();
      return row?.n ?? 0;
    }
    case "ZADD": {
      const onlyNew = String(args[0]).toUpperCase() === "NX";
      const rest = onlyNew ? args.slice(1) : args;
      const pairs: { s: number; m: string }[] = [];
      for (let i = 0; i + 1 < rest.length; i += 2) pairs.push({ s: score(rest[i]), m: String(rest[i + 1]) });
      if (pairs.length === 0) return 0;
      if (onlyNew) return insertMissing(scores, pairs.map(({ s, m }) => ({ _id: memberId(key, m), k: key, m, s, exp: null })));
      const result = await scores.bulkWrite(
        pairs.map(({ s, m }) => ({
          updateOne: { filter: { _id: memberId(key, m) }, update: { $set: { s }, $setOnInsert: { k: key, m, exp: null } }, upsert: true },
        })),
        { ordered: false },
      );
      return result.upsertedCount;
    }
    case "ZCARD":
      return scores.countDocuments({ k: key, ...live() });
    case "ZRANGE":
    case "ZREVRANGE": {
      const list = await sortedMembers(scores, key, op === "ZRANGE" ? 1 : -1);
      const range = rangeOf(list.length, Number(args[0]), Number(args[1]));
      return range ? list.slice(range[0], range[1]).map((d) => d.m) : [];
    }
    case "ZREMRANGEBYRANK": {
      const list = await sortedMembers(scores, key, 1);
      const range = rangeOf(list.length, Number(args[0]), Number(args[1]));
      if (!range) return 0;
      return (await scores.deleteMany({ _id: { $in: list.slice(range[0], range[1]).map((d) => d._id) } })).deletedCount;
    }
    case "ZREMRANGEBYSCORE":
      return (await scores.deleteMany({ k: key, s: { $gte: score(args[0]), $lte: score(args[1]) } })).deletedCount;
    default:
      throw new Error(`MongoDB: nieobsługiwana komenda ${op}`);
  }
}
