import { createHash } from "node:crypto";
import { revalidateTag } from "next/cache";
import { stamp } from "@/lib/analytics/stats";
import { persistent, run } from "@/lib/analytics/store";
import { getAgentPrices, PRICES_TAG, saveAgentPrice } from "@/lib/prices";
import { fetchAgentPriceCny, getSellers } from "@/lib/remote";
import { sellerFindId, toSellerFind } from "@/lib/seller-find";
import { getAllFinds } from "@/lib/store";
import { clientIp, tooLarge } from "@/lib/rate-limit";

export const maxDuration = 20;

const MAX_IDS = 40;
const MAX_FETCH = 10;
const CONCURRENCY = 4;
const BUDGET_MS = 8000;
const RECHECK_S = 3 * 24 * 60 * 60;
const PER_HOUR = 150;

const ID = /^[a-z0-9-]{1,40}$/;

export async function POST(request: Request) {
  if (tooLarge(request, 16_000)) return Response.json({ error: "bad-request" }, { status: 413 });
  let ids: string[] = [];
  try {
    const body = await request.json();
    const raw: unknown[] = Array.isArray(body?.ids) ? body.ids : [];
    ids = [...new Set(raw.filter((x): x is string => typeof x === "string" && ID.test(x)))].slice(0, MAX_IDS);
  } catch {
    return Response.json({ error: "bad-request" }, { status: 400 });
  }
  if (!ids.length) return Response.json({ prices: {} });

  const [all, stored, sellers] = await Promise.all([getAllFinds(), getAgentPrices(), ids.some((id) => id.startsWith("s-")) ? getSellers() : []]);
  const byId = new Map(all.map((f) => [f.id, f]));
  for (const seller of sellers) {
    for (const item of seller.items) {
      if (!ids.includes(sellerFindId(item.id))) continue;
      const find = toSellerFind(seller.slug, item);
      if (find) byId.set(find.id, find);
    }
  }
  const finds = ids.map((id) => byId.get(id)).filter((f) => f !== undefined);
  const keyOf = (f: (typeof finds)[number]) => `${f.source.platform}:${f.source.id}`;
  const fresh = new Map<string, number>();

  const sources = [...new Map(finds.map((f) => [keyOf(f), f.source])).entries()];
  let due: typeof sources = [];
  if (persistent()) {
    const ip = clientIp(request);
    const who = createHash("sha256").update(`${process.env.ADMIN_SECRET ?? "xayez"}|${ip}`).digest("hex").slice(0, 16);
    const { hour } = stamp(Date.now());
    const [calls, , ...claims] = await run([
      { op: "HINCRBY", keys: [`rl:px:${hour}`], args: [who, 1] },
      { op: "EXPIRE", keys: [`rl:px:${hour}`], args: [3600] },
      ...sources.map(([key]) => ({ op: "SET", keys: [`px:v1:try:${key}`], args: [1, "EX", RECHECK_S, "NX"] })),
    ]);
    if (Number(calls) <= PER_HOUR) due = sources.filter((_, i) => claims[i] !== null && claims[i] !== false).slice(0, MAX_FETCH);
  } else {
    due = sources.filter(([key]) => !stored[key]).slice(0, MAX_FETCH);
  }

  let changed = false;
  const deadline = Date.now() + BUDGET_MS;
  let next = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < due.length && Date.now() < deadline) {
        const [key, source] = due[next++];
        try {
          const cny = await fetchAgentPriceCny(source);
          if (cny) {
            fresh.set(key, cny);
            if (await saveAgentPrice(source, cny)) changed = true;
          }
        } catch {}
      }
    }),
  );
  if (changed) revalidateTag(PRICES_TAG, "max");

  const prices: Record<string, number> = {};
  for (const f of finds) {
    const cny = fresh.get(keyOf(f)) ?? stored[keyOf(f)]?.cny ?? f.priceCny;
    if (cny && cny > 0) prices[f.id] = cny;
  }
  return Response.json({ prices }, { headers: { "Cache-Control": "no-store" } });
}
