import { revalidateTag } from "next/cache";
import { persistent, redisCall } from "@/lib/analytics/store";
import { PRICES_TAG, saveAgentPrice } from "@/lib/prices";
import { fetchAgentPriceCny } from "@/lib/remote";
import { getAllFinds } from "@/lib/store";
import { isCronRequest } from "@/lib/rate-limit";

export const maxDuration = 60;

const BUDGET_MS = 45_000;
const CONCURRENCY = 2;
const CURSOR = "px:v1:cursor";

export async function GET(request: Request) {
  if (!isCronRequest(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!persistent()) return Response.json({ error: "no-storage" }, { status: 503 });

  const finds = await getAllFinds();
  const sources = [...new Map(finds.map((f) => [`${f.source.platform}:${f.source.id}`, f.source])).entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, s]) => s);
  if (sources.length === 0) return Response.json({ checked: 0 });

  const start = Number(await redisCall(["GET", CURSOR])) || 0;
  const deadline = Date.now() + BUDGET_MS;
  let next = start;
  let checked = 0;
  let changed = 0;
  let failed = 0;

  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (Date.now() < deadline && checked < sources.length) {
        const source = sources[next++ % sources.length];
        checked++;
        try {
          const cny = await fetchAgentPriceCny(source);
          if (!cny) failed++;
          else if (await saveAgentPrice(source, cny)) changed++;
        } catch {
          failed++;
        }
      }
    }),
  );

  await redisCall(["SET", CURSOR, next % sources.length]);
  if (changed > 0) revalidateTag(PRICES_TAG, "max");
  return Response.json({ checked, changed, failed, from: start, next: next % sources.length, total: sources.length });
}
