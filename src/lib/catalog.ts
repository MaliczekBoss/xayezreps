import "server-only";

import { categories, sortNewest, sortPopular, type Find } from "./finds";
import { getQcIndex, withQc } from "./qc-feed";
import { buildSearchIndex, searchFinds, type SearchIndex } from "./search";
import { getFinds } from "./store";
import { live } from "./live";
import { getSellers } from "./remote";
import { sellerFindId, toSellerFind } from "./seller-find";

export const CATALOG_PAGE = 30;

export const SORTS = ["random", "popular", "newest", "priceAsc", "priceDesc", "qc"] as const;
export type CatalogSort = (typeof SORTS)[number];

export type CatalogQuery = {
  q?: string;
  category?: string;
  batch?: string;
  qcOnly?: boolean;
  sort?: CatalogSort | null;
  seed?: string;
  offset?: number;
  limit?: number;
};

export const newSeed = () => Math.random().toString(36).slice(2, 10);

function shuffled(list: Find[], seed: string) {
  const rank = (id: string) => {
    let h = 2166136261;
    for (const ch of `${seed}|${id}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return (h ^ (h >>> 16)) >>> 0;
  };
  return list
    .map((f) => ({ f, r: rank(f.id) }))
    .sort((a, b) => a.r - b.r)
    .map(({ f }) => f);
}

export type CatalogPage = {
  items: Find[];
  total: number;
  corrected: string | null;
  relaxed: boolean;
};

export type CatalogFacets = {
  counts: [string, number][];
  all: number;
  hasQc: boolean;
};

type Prepared = { finds: Find[]; index: SearchIndex; facets: CatalogFacets };

const FRESH_MS = 30_000;
let prepared: { key: string; at: number; value: Prepared } | null = null;

const signature = (list: Find[]) => `${list.length}|${list.reduce((h, f) => (h * 31 + f.id.length * 7 + f.name.length + f.pricePln + (f.qc ?? 0) + f.views) | 0, 7)}`;

async function prepare(): Promise<Prepared> {
  if (prepared && performance.now() - prepared.at < FRESH_MS) return prepared.value;
  const [raw, qcIndex] = await Promise.all([getFinds().then(live), getQcIndex()]);
  const finds = sortPopular(withQc(raw, qcIndex));
  const key = signature(finds);
  if (prepared?.key === key) {
    prepared.at = performance.now();
    return prepared.value;
  }

  const byCategory = new Map<string, number>();
  for (const f of finds) byCategory.set(f.category, (byCategory.get(f.category) ?? 0) + 1);
  const facets: CatalogFacets = {
    counts: categories.filter((c) => byCategory.has(c)).map((c) => [c, byCategory.get(c)!]),
    all: finds.length,
    hasQc: finds.some((f) => f.qc),
  };
  const value = { finds, index: buildSearchIndex(finds), facets };
  prepared = { key, at: performance.now(), value };
  return value;
}

export async function getCatalogFacets(): Promise<CatalogFacets> {
  return (await prepare()).facets;
}

export async function queryCatalog(query: CatalogQuery): Promise<CatalogPage> {
  const { finds, index } = await prepare();
  const q = (query.q ?? "").trim().slice(0, 100);
  const base = finds.filter(
    (f) =>
      (!query.category || f.category === query.category) &&
      (!query.batch || f.batch === query.batch) &&
      (!query.qcOnly || Boolean(f.qc)),
  );
  const found = searchFinds(index, base, q);

  let list = found.items;
  const sort = query.sort ?? (q ? null : "random");
  if (sort === "random") list = shuffled(list, query.seed || "0");
  if (sort === "newest") list = sortNewest(list);
  if (sort === "priceAsc") list = [...list].sort((a, b) => (a.pricePln || Infinity) - (b.pricePln || Infinity));
  if (sort === "priceDesc") list = [...list].sort((a, b) => b.pricePln - a.pricePln);
  if (sort === "qc") list = [...list].sort((a, b) => (b.qc ?? 0) - (a.qc ?? 0));

  const offset = Math.max(0, query.offset ?? 0);
  const limit = Math.min(Math.max(1, query.limit ?? CATALOG_PAGE), 60);
  return { items: list.slice(offset, offset + limit), total: list.length, corrected: found.corrected, relaxed: found.relaxed };
}

export async function searchCatalog(q: string, category?: string | null) {
  const { finds, index } = await prepare();
  const base = category ? finds.filter((f) => f.category === category) : finds;
  return searchFinds(index, base, q);
}

export async function popularIn(category: string, limit: number, skip: Set<string>) {
  const { finds } = await prepare();
  return finds.filter((f) => f.category === category && !skip.has(f.id)).slice(0, limit);
}

export async function findsByIds(ids: string[]): Promise<Find[]> {
  const { finds } = await prepare();
  const byId = new Map(finds.map((f) => [f.id, f]));
  if (ids.some((id) => id.startsWith("s-") && !byId.has(id))) {
    const offers: Find[] = [];
    for (const seller of await getSellers()) {
      for (const item of seller.items) {
        if (!ids.includes(sellerFindId(item.id))) continue;
        const find = toSellerFind(seller.slug, item);
        if (find) offers.push(find);
      }
    }
    for (const f of await live(offers)) byId.set(f.id, f);
  }
  return ids.map((id) => byId.get(id)).filter((f): f is Find => Boolean(f));
}

export function parseCatalogQuery(params: URLSearchParams): CatalogQuery {
  const sort = params.get("sort");
  const seed = params.get("seed") ?? "";
  return {
    q: params.get("q") ?? "",
    category: params.get("category") ?? "",
    batch: params.get("batch") ?? "",
    qcOnly: params.get("qc") === "1",
    sort: SORTS.includes(sort as CatalogSort) ? (sort as CatalogSort) : null,
    seed: /^[a-z0-9]{1,16}$/i.test(seed) ? seed : "",
    offset: Number(params.get("offset")) || 0,
  };
}
