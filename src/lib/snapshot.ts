import "server-only";

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ProductSource } from "./agents";

type Kind = "qc" | "items";

const shards = new Map<string, Promise<Record<string, unknown>>>();

const keyOf = (source: ProductSource) => `${source.platform}:${source.id}`;
const shardOf = (key: string) => createHash("sha1").update(key).digest("hex").slice(0, 2);

function shard(kind: Kind, key: string) {
  const name = `${kind}/${shardOf(key)}`;
  let entries = shards.get(name);
  if (!entries) {
    entries = readFile(path.join(process.cwd(), "data", kind, `${shardOf(key)}.json`), "utf-8").then(
      (raw) => JSON.parse(raw) as Record<string, unknown>,
      () => ({}),
    );
    shards.set(name, entries);
  }
  return entries;
}

export async function snapshotQc(source: ProductSource): Promise<string[] | undefined> {
  const key = keyOf(source);
  const value = (await shard("qc", key))[key];
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value.filter((p): p is string => typeof p === "string") : [];
}

export async function snapshotItem(source: ProductSource): Promise<Record<string, unknown> | null | undefined> {
  const key = keyOf(source);
  const value = (await shard("items", key))[key];
  if (value === undefined) return undefined;
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}
