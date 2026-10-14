import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { cacheLife, cacheTag } from "next/cache";
import type { ProductSource } from "./agents";
import { redisCall, storageKind } from "./analytics/store";
import type { Find } from "./finds";
import type { Rates } from "./money";

export const PRICES_TAG = "prices";
const KEY = "px:v1";

type AgentPrice = { cny: number; at: string };

const keyOf = (s: ProductSource) => `${s.platform}:${s.id}`;
const mem = ((globalThis as { __xayezPrices?: Map<string, AgentPrice> }).__xayezPrices ??= new Map());

export async function saveAgentPrice(source: ProductSource, cny: number): Promise<boolean> {
  if (!(cny > 0)) return false;
  const key = keyOf(source);
  const value: AgentPrice = { cny: Math.round(cny * 100) / 100, at: new Date().toISOString() };
  if (storageKind() === "memory") {
    const changed = mem.get(key)?.cny !== value.cny;
    mem.set(key, value);
    return changed;
  }
  const prev = (await redisCall(["HGET", KEY, key])) as string | null;
  await redisCall(["HSET", KEY, key, JSON.stringify(value)]);
  try {
    return prev ? (JSON.parse(prev) as AgentPrice).cny !== value.cny : true;
  } catch {
    return true;
  }
}

export async function getAgentPrices(): Promise<Record<string, AgentPrice>> {
  "use cache";
  cacheLife("hours");
  cacheTag(PRICES_TAG);
  const prices = (await readFile(path.join(process.cwd(), "data", "prices.json"), "utf-8")
    .then((t) => JSON.parse(t) as Record<string, AgentPrice>)
    .catch(() => ({}))) as Record<string, AgentPrice>;
  try {
    if (storageKind() === "memory") {
      for (const [k, v] of mem) prices[k] = v;
    } else {
      const flat = (await redisCall(["HGETALL", KEY])) as string[] | null;
      for (let i = 0; flat && i < flat.length; i += 2) {
        try {
          const v = JSON.parse(flat[i + 1]) as AgentPrice;
          if (v?.cny > 0) prices[flat[i]] = v;
        } catch {}
      }
    }
  } catch (e) {
    console.error("[prices]", (e as Error).message);
  }
  return prices;
}

export const withAgentPrices = <T extends Find>(finds: T[], prices: Record<string, AgentPrice>, rates: Rates): T[] =>
  finds.map((f) => {
    const cny = prices[keyOf(f.source)]?.cny ?? f.priceCny ?? 0;
    return cny > 0 && rates.CNY > 0 ? { ...f, priceCny: cny, pricePln: Math.round(cny / rates.CNY) } : f;
  });
