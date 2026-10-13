import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { stamp } from "./analytics/stats";
import { redisCall, run, storageKind } from "./analytics/store";
import type { Find } from "./finds";

// Wyświetlenia ofert do sortowania „najpopularniejsze”: stały licznik xs:views (id produktu → odsłony strony
// produktu), dopisywany przy każdej odsłonie (analytics/stats.ts → record). Za pierwszym razem doliczamy odsłony
// z dziennych statystyk (trzymanych 100 dni). Do tego wyświetlenia z katalogu (pole views, np. ze starej strony).

export const VIEWS_KEY = "xs:views";
const HISTORY_DAYS = 100;

/** Jednorazowo: odsłony produktów z dziennych statystyk do stałego licznika */
async function backfill() {
  if ((await redisCall(["SET", `${VIEWS_KEY}:seeded`, "1", "NX"])) !== "OK") return;
  const now = Date.now();
  const days = [...new Set(Array.from({ length: HISTORY_DAYS }, (_, i) => stamp(now - i * 86_400_000).day))];
  const pages = (await run(days.map((day) => ({ op: "HGETALL", keys: [`xs:pg:${day}`] })))) as (string[] | null)[];
  const totals = new Map<string, number>();
  for (const flat of pages) {
    for (let i = 0; flat && i < flat.length; i += 2) {
      const id = flat[i].match(/^\/product\/([a-z0-9-]+)$/)?.[1];
      if (id) totals.set(id, (totals.get(id) ?? 0) + Number(flat[i + 1]));
    }
  }
  if (totals.size) await run([...totals].map(([id, n]) => ({ op: "HINCRBY", keys: [VIEWS_KEY], args: [id, n] })));
}

/** Nasze odsłony każdej oferty (id → liczba), odświeżane co godzinę */
export async function getProductViews(): Promise<Record<string, number>> {
  "use cache";
  cacheLife("hours");
  cacheTag("views");
  if (storageKind() !== "redis") return {};
  try {
    await backfill();
    const flat = (await redisCall(["HGETALL", VIEWS_KEY])) as string[] | null;
    const views: Record<string, number> = {};
    for (let i = 0; flat && i < flat.length; i += 2) views[flat[i]] = Number(flat[i + 1]) || 0;
    return views;
  } catch (e) {
    console.error("[views]", (e as Error).message);
    return {};
  }
}

/** Wyświetlenia z katalogu (np. ze starej strony) plus nasze odsłony */
export const withViews = <T extends Find>(finds: T[], views: Record<string, number>): T[] =>
  finds.map((f) => (views[f.id] ? { ...f, views: (f.views ?? 0) + views[f.id] } : f));
