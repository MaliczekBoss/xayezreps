import "server-only";

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { persistent, redisCall } from "./analytics/store";

export type DocName = "finds" | "outfits";

type WithId = { id: string };

const RESET: Record<DocName, string> = {
  finds: "2026-10-15-ai-categories",
  outfits: "2026-10-14-outfits-local-images",
};

const RETIRED: Record<DocName, string[]> = {
  finds: [],
  outfits: ["o-moncler-winter", "o-corteiz-daily", "o-summer"],
};

async function readFileRaw(name: DocName): Promise<string> {
  try {
    return name === "finds" ? await readFile(path.join(process.cwd(), "data", "finds.json"), "utf-8") : await readFile(path.join(process.cwd(), "data", "outfits.json"), "utf-8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "[]";
    throw error;
  }
}

const MEMO_MS = 30_000;
const memo = new Map<DocName, { at: number; list: unknown[] }>();

export async function readDoc<T extends WithId>(name: DocName): Promise<T[]> {
  const hit = memo.get(name);
  if (hit && performance.now() - hit.at < MEMO_MS) return hit.list as T[];
  const list = await loadDoc<T>(name);
  memo.set(name, { at: performance.now(), list });
  return list;
}

async function loadDoc<T extends WithId>(name: DocName): Promise<T[]> {
  const fileRaw = await readFileRaw(name);
  if (!persistent()) return JSON.parse(fileRaw) as T[];

  const version = createHash("sha1").update(fileRaw).digest("hex").slice(0, 16);
  const [raw, seeded, reset] = await Promise.all([redisCall(["GET", `xd:${name}`]), redisCall(["GET", `xd:${name}:seed`]), redisCall(["GET", `xd:${name}:reset`])]);

  if (RESET[name] && reset !== RESET[name]) {
    if (typeof raw === "string") await redisCall(["SET", `xd:${name}:backup:${RESET[name]}`, raw, "NX"]);
    await redisCall(["DEL", `xd:${name}:deleted`]);
    await redisCall(["SET", `xd:${name}`, fileRaw]);
    await redisCall(["SET", `xd:${name}:seed`, version]);
    await redisCall(["SET", `xd:${name}:reset`, RESET[name]]);
    return JSON.parse(fileRaw) as T[];
  }
  if (typeof raw === "string" && seeded === version) return JSON.parse(raw) as T[];

  const fromFile = JSON.parse(fileRaw) as T[];
  const current = typeof raw === "string" ? (JSON.parse(raw) as T[]) : [];
  const deleted = new Set(((await redisCall(["SMEMBERS", `xd:${name}:deleted`])) as string[] | null) ?? []);
  const retired = new Set(RETIRED[name]);
  const known = new Set(current.map((x) => x.id));
  const merged = [...current.filter((x) => !retired.has(x.id)), ...fromFile.filter((x) => !known.has(x.id) && !deleted.has(x.id) && !retired.has(x.id))];
  await redisCall(["SET", `xd:${name}`, JSON.stringify(merged)]);
  await redisCall(["SET", `xd:${name}:seed`, version]);
  return merged;
}

const UPLOAD_NAME = /^[\w-]+\.webp$/;
const uploadPath = (name: string) => path.join(process.cwd(), "data", "uploads", path.basename(name));

export async function readImage(name: string): Promise<Buffer | null> {
  if (persistent()) {
    const raw = await redisCall(["GET", `xi:${name}`]);
    if (typeof raw === "string") return Buffer.from(raw, "base64");
  }
  try {
    return await readFile(uploadPath(name));
  } catch {
    return null;
  }
}

export const isUploadName = (name: string) => UPLOAD_NAME.test(name) || /^[\w-]+\.(jpg|png|webp|avif|gif)$/.test(name);
