import "server-only";

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { AwsClient } from "aws4fetch";
import { Binary } from "mongodb";
import sharp from "sharp";
import { mongo, mongoConfigured } from "./analytics/mongo";
import { persistent, redisCall } from "./analytics/store";
import { IMAGES_URL } from "./images";

const COPIES = "qc:v1:copy";
const MAX = 1400;
const RESIZE = `x-oss-process=image/resize,l_${MAX}/format,webp/quality,q_78`;
const RESIZABLE = new Set(["kk-oss-wh-hk.kakobyy.com", "kk-oss-wh-hk.kakobuy.com", "media.usfans.com", "static.rizzitgoo.com", "oss.acbuy.com"]);
const PER_CALL = 40;

export const qcHash = (url: string) => createHash("sha1").update(url).digest("hex").slice(0, 24);

let bulk: Set<string> | null = null;
function onCdn() {
  if (!bulk) {
    try {
      bulk = new Set(JSON.parse(readFileSync(path.join(process.cwd(), "data", "qc-cdn.json"), "utf8")) as string[]);
    } catch {
      bulk = new Set();
    }
  }
  return bulk;
}

const S3 = {
  endpoint: (process.env.S3_ENDPOINT ?? "").replace(/\/+$/, ""),
  bucket: process.env.S3_BUCKET ?? "",
  keyId: process.env.S3_ACCESS_KEY_ID ?? "",
  secret: process.env.S3_SECRET_ACCESS_KEY ?? "",
};
const s3 = /^https?:\/\//.test(S3.endpoint) && S3.bucket && S3.keyId && S3.secret
  ? new AwsClient({ accessKeyId: S3.keyId, secretAccessKey: S3.secret, service: "s3", region: process.env.S3_REGION || "auto" })
  : null;

let copiesCache: { at: number; value: Record<string, string> } | null = null;

export async function qcCopies(): Promise<Record<string, string>> {
  if (!persistent()) return {};
  if (copiesCache && performance.now() - copiesCache.at < 60_000) return copiesCache.value;
  try {
    const flat = ((await redisCall(["HGETALL", COPIES])) as string[] | null) ?? [];
    const value: Record<string, string> = {};
    for (let i = 0; i + 1 < flat.length; i += 2) value[flat[i]] = flat[i + 1];
    copiesCache = { at: performance.now(), value };
    return value;
  } catch {
    return copiesCache?.value ?? {};
  }
}

export function qcPublicUrl(url: string, copies: Record<string, string> = {}): string | null {
  const hash = qcHash(url);
  const where = IMAGES_URL && onCdn().has(hash) ? "cdn" : copies[hash];
  if (where === "cdn" && IMAGES_URL) return `${IMAGES_URL}/q/${hash}.webp`;
  if (where === "db") return `/q/${hash}.webp`;
  return null;
}

function sourceOf(url: string) {
  const direct = url.replace(/^https?:\/\/kako-alosshk-pic\.kakobuy\.com\//, "https://kako-alosshk-pic.oss-cn-hongkong.aliyuncs.com/");
  return RESIZABLE.has(new URL(direct).hostname) ? `${direct}${direct.includes("?") ? "&" : "?"}${RESIZE}` : direct;
}

async function webpOf(url: string): Promise<Buffer | null> {
  const res = await fetch(sourceOf(url), { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(30_000), cache: "no-store" });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  const meta = await sharp(buf).metadata();
  if (meta.format === "webp" && (meta.width ?? 0) <= MAX && (meta.height ?? 0) <= MAX) return buf;
  return sharp(buf, { animated: false }).rotate().resize({ width: MAX, height: MAX, fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
}

async function store(hash: string, data: Buffer): Promise<"cdn" | "db" | null> {
  if (s3) {
    const res = await s3.fetch(`${S3.endpoint}/${S3.bucket}/q/${hash}.webp`, {
      method: "PUT",
      body: new Uint8Array(data),
      headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable" },
    });
    if (res.ok) return "cdn";
    console.error(`[qc-cdn] S3 ${res.status} dla q/${hash}.webp`);
  }
  if (mongoConfigured()) {
    const { images } = await mongo();
    await images.updateOne({ _id: `q/${hash}.webp` }, { $set: { data: new Binary(data), type: "image/webp", size: data.length } }, { upsert: true });
    return "db";
  }
  return null;
}

export async function copyQcPhotos(urls: string[]) {
  if (!persistent() || (!s3 && !mongoConfigured())) return 0;
  const copies = await qcCopies();
  const todo = [...new Set(urls)].filter((u) => /^https:\/\//.test(u) && !qcPublicUrl(u, copies)).slice(0, PER_CALL);
  let done = 0;
  for (const url of todo) {
    const hash = qcHash(url);
    try {
      if (!(await redisCall(["SET", `qc:v1:copying:${hash}`, "1", "EX", 600, "NX"]))) continue;
      const data = await webpOf(url);
      const where = data && (await store(hash, data));
      if (where) {
        await redisCall(["HSET", COPIES, hash, where]);
        copies[hash] = where;
        done++;
      }
    } catch (error) {
      console.error("[qc-cdn]", (error as Error).message);
    }
  }
  if (done) copiesCache = null;
  return done;
}
