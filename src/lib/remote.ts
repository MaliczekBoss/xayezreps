import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { cacheLife, cacheTag } from "next/cache";
import type { ProductSource } from "./agents";
import { FALLBACK_RATES, type Rates } from "./money";
import { persistent, redisCall } from "./analytics/store";
import { imageUrl } from "./images";
import { snapshotItem } from "./snapshot";

const OLD_API = "https://xayezreps.com/api";
const OLD_HEADERS = { "User-Agent": "xayezreps.pl (+https://xayezreps.pl)", Accept: "application/json" };
const OLD_TIMEOUT_MS = 5000;

let oldSiteFailures = 0;
let oldSitePausedUntil = 0;

async function fromOldSite(pathAndQuery: string): Promise<{ ok: boolean; body: unknown } | null> {
  if (performance.now() < oldSitePausedUntil) return null;
  try {
    const res = await fetch(`${OLD_API}${pathAndQuery}`, { headers: OLD_HEADERS, signal: AbortSignal.timeout(OLD_TIMEOUT_MS), cache: "no-store" });
    if (res.status >= 502) throw new Error(`HTTP ${res.status}`);
    const body: unknown = await res.json().catch(() => null);
    oldSiteFailures = 0;
    return { ok: res.ok, body };
  } catch {
    if (++oldSiteFailures >= 3) {
      oldSiteFailures = 0;
      oldSitePausedUntil = performance.now() + 30 * 60_000;
    }
    return null;
  }
}

export async function getRates(): Promise<Rates> {
  "use cache";
  cacheLife("hours");
  cacheTag("rates");
  return (await usfansRates()) ?? (await nbpRates()) ?? FALLBACK_RATES;
}

async function usfansRates(): Promise<Rates | null> {
  try {
    const res = await fetch("https://www.usfans.com/api/config/aggregation", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; xayezreps.pl)", Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const list = (await res.json())?.data?.exchangeRateList as { currencyCode: string; exchangeRate: number }[] | undefined;
    const perCny = (code: string) => {
      const rate = list?.find((r) => r.currencyCode === code)?.exchangeRate;
      return typeof rate === "number" && rate > 0 ? rate : null;
    };
    const [pln, usd, eur] = [perCny("PLN"), perCny("USD"), perCny("EUR")];
    return pln && usd && eur ? { PLN: 1, USD: usd / pln, EUR: eur / pln, CNY: 1 / pln } : null;
  } catch {
    return null;
  }
}

async function nbpRates(): Promise<Rates | null> {
  try {
    const res = await fetch("https://api.nbp.pl/api/exchangerates/tables/a/?format=json", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const [table] = (await res.json()) as { rates?: { code: string; mid: number }[] }[];
    const perPln = (code: string) => {
      const mid = table?.rates?.find((r) => r.code === code)?.mid;
      return typeof mid === "number" && mid > 0 ? 1 / mid : null;
    };
    const [USD, EUR, CNY] = [perPln("USD"), perPln("EUR"), perPln("CNY")];
    return USD && EUR && CNY ? { PLN: 1, USD, EUR, CNY } : null;
  } catch {
    return null;
  }
}

export type SellerItem = { id: string; title: string; price: number; image: string; link: string; createdAt?: string };

export type Seller = {
  slug: string;
  name: string;
  description: string;
  tags: string[];
  profileImg: string;
  itemCount: number;
  items: SellerItem[];
};

export async function getSellers(): Promise<Seller[]> {
  "use cache";
  cacheLife("max");
  cacheTag("sellers");
  type Saved = { slug: string; name: string; description?: string; tags?: string[]; items?: SellerItem[] };
  const raw = JSON.parse(await readFile(path.join(process.cwd(), "data", "sellers.json"), "utf-8").catch(() => "[]")) as Saved[];
  return raw
    .map((s) => ({
      slug: s.slug,
      name: s.name.replace(/\s+/g, " ").trim(),
      description: (s.description ?? "").trim(),
      tags: s.tags ?? [],
      profileImg: "",
      itemCount: s.items?.length ?? 0,
      items: (s.items ?? []).filter((i) => i.title && i.image && i.link).map((i) => ({ ...i, image: imageUrl(i.image) })),
    }))
    .sort((a, b) => b.itemCount - a.itemCount);
}

const PLATFORM_CODE: Record<ProductSource["platform"], string> = { weidian: "WD", taobao: "TB", "1688": "AL" };

export type ItemDetails = {
  title: string;
  priceCny: number;
  domesticShipCny: number;
  images: string[];
  descriptionImages: string[];
  available: boolean;
  seller: string | null;
  colors: { name: string; image?: string }[];
  sizes: string[];
  priceRangeCny: [number, number];
  qcCount: number;
};

export async function fetchItemDetails(source: ProductSource): Promise<ItemDetails | null> {
  const { data } = await agentData(source);
  if (data?.details) return data.details;
  const saved = await snapshotItem(source);
  if (saved !== undefined) return saved && parseItemDetails(saved);
  const res = await fromOldSite(`/item-details?platform=${PLATFORM_CODE[source.platform]}&platformID=${encodeURIComponent(source.id)}`);
  return res?.ok && res.body && typeof res.body === "object" ? parseItemDetails(res.body as Record<string, unknown>) : null;
}

const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const amount = (v: unknown) => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const skuPrices = (d: Record<string, unknown>) =>
  (list(d.skuList) as { price?: unknown; discountPrice?: unknown }[])
    .map((s) => amount(s.discountPrice) || amount(s.price))
    .filter((p) => p > 0);
const httpsUrl = (v: unknown) => {
  const url = text(v).replace(/^\/\//, "https://").replace(/^http:\/\//, "https://");
  return /^https:\/\/[^\s"'<>]+$/.test(url) ? url : null;
};

function parseUsfansGoods(d: Record<string, unknown>): ItemDetails | null {
  const title = text(d.titleEn) || text(d.title);
  if (!title) return null;
  type Value = { valueName?: unknown; valueNameEn?: unknown; picUrl?: unknown };
  type Prop = { propName?: unknown; propNameEn?: unknown; valuesList?: unknown };
  type Sku = { stock?: unknown };

  const props = list(d.properties) as Prop[];
  const values = (re: RegExp) => list(props.find((p) => re.test(`${text(p.propNameEn)} ${text(p.propName)}`))?.valuesList) as Value[];
  const nameOf = (v: Value) => text(v.valueNameEn) || text(v.valueName);
  const colors = values(/colou?r|颜色|顏色/i)
    .map((v) => ({ name: nameOf(v), image: httpsUrl(v.picUrl) ?? undefined }))
    .filter((c) => c.name);
  const sizes = values(/size|尺码|尺寸/i).map(nameOf).filter(Boolean);

  const skus = list(d.skuList) as Sku[];
  const prices = skuPrices(d);
  const base = prices.length ? Math.min(...prices) : amount(d.price);
  const all = prices.length ? prices : [base];
  const stocks = skus.map((s) => s.stock).filter((n): n is number => typeof n === "number");
  const stock = stocks.length ? stocks.reduce((sum, n) => sum + Math.max(0, n), 0) : typeof d.stock === "number" ? d.stock : null;
  const descriptionImages = [...text(d.description).matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((m) => httpsUrl(m[1])).filter((u): u is string => Boolean(u));

  return {
    title,
    priceCny: base,
    domesticShipCny: amount(d.deliveryPrice),
    images: list(d.images).map(httpsUrl).filter((u): u is string => Boolean(u)).slice(0, 8),
    descriptionImages: [...new Set(descriptionImages)].slice(0, 8),
    available: stock === null || stock > 0,
    seller: text(d.shopNameEn) || text(d.shopName) || null,
    colors: colors.slice(0, 30),
    sizes: [...new Set(sizes)].slice(0, 30),
    priceRangeCny: [Math.min(...all), Math.max(...all)],
    qcCount: 0,
  };
}

function parseItemDetails(d: Record<string, unknown>): ItemDetails | null {
  if (!d.title) return null;
  type Attr = { tag?: string; name?: string; values?: { name?: string; image?: string }[] };
  const attrs = list(d.attributes) as Attr[];
  const findAttr = (re: RegExp) => attrs.find((a) => re.test(`${a.tag ?? ""} ${a.name ?? ""}`));
  const colors = (findAttr(/colou?r|颜色/i)?.values ?? []).filter((v) => v.name).map((v) => ({ name: v.name!, image: v.image }));
  const sizes = (findAttr(/size|尺码|尺寸/i)?.values ?? []).filter((v) => v.name).map((v) => v.name!);
  const variantPrices = list(d.skus)
    .map((s) => (s as { price?: unknown }).price)
    .filter((p): p is number => typeof p === "number");
  const base = typeof d.price === "number" ? d.price : 0;
  const all = variantPrices.length ? variantPrices : [base];
  const seller = (d.seller as { name?: unknown } | null | undefined)?.name;

  return {
    title: String(d.title),
    priceCny: base,
    domesticShipCny: typeof d.domesticShip === "number" ? d.domesticShip : 0,
    images: list(d.images).filter((i): i is string => typeof i === "string").slice(0, 8),
    descriptionImages: list(d.description).filter((i): i is string => typeof i === "string" && /^https:\/\//.test(i)).slice(0, 8),
    available: d.isAvailable !== false,
    seller: typeof seller === "string" ? seller : null,
    colors: colors.slice(0, 30),
    sizes: sizes.slice(0, 30),
    priceRangeCny: [Math.min(...all), Math.max(...all)],
    qcCount: typeof d.qcCount === "number" ? d.qcCount : 0,
  };
}

const USFANS_CHANNEL: Record<ProductSource["platform"], number> = { "1688": 1, taobao: 2, weidian: 3 };

type Goods = { data: Record<string, unknown> | null; status: string };

async function fetchUsfansGoods(source: ProductSource): Promise<Goods> {
  try {
    const url = `https://www.usfans.com/api/goods/info?channel=${USFANS_CHANNEL[source.platform]}&goodsId=${encodeURIComponent(source.id)}&refresh=false&queryDelivery=false&activityId=`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; xayezreps.pl)", Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    if (!res.ok) return { data: null, status: `http-${res.status}` };
    const d = await res.json().catch(() => null);
    const code = typeof d?.code === "number" && Number.isInteger(d.code) ? d.code : null;
    if (code === null) return { data: null, status: "bad-response" };
    const data = code === 200 && d.data && typeof d.data === "object" ? (d.data as Record<string, unknown>) : null;
    return { data, status: String(code) };
  } catch {
    return { data: null, status: "error" };
  }
}

const WEIDIAN_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
  Accept: "application/json",
  Referer: "https://weidian.com/",
};

type WeidianValue = { name: string; image?: string };
type WeidianAttr = { title: string; values: WeidianValue[] };

async function weidianApi(path: string, param: Record<string, string>): Promise<Record<string, unknown> | null> {
  const res = await fetch(`https://thor.weidian.com/${path}?param=${encodeURIComponent(JSON.stringify(param))}`, {
    headers: WEIDIAN_HEADERS,
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const body = (await res.json().catch(() => null)) as { status?: { code?: number }; result?: unknown } | null;
  return body?.status?.code === 0 && body.result && typeof body.result === "object" ? (body.result as Record<string, unknown>) : null;
}

function weidianData(input: { title: string; pricesFen: number[]; stock: number | null; images: unknown[]; attrs: WeidianAttr[] }): AgentData | null {
  const prices = input.pricesFen.filter((p) => p > 0).map((p) => p / 100);
  const colorAttr = input.attrs.find((a) => /colou?r|颜色|顏色|款|style/i.test(a.title)) ?? input.attrs.find((a) => a.values.some((v) => v.image));
  const sizeAttr = input.attrs.find((a) => a !== colorAttr && /size|尺码|尺寸|码/i.test(a.title));
  const priceCny = prices.length ? Math.min(...prices) : null;
  const images = [...new Set(input.images.map(httpsUrl).filter((u): u is string => Boolean(u)))].slice(0, 8);
  const details: ItemDetails | null = input.title
    ? {
        title: input.title,
        priceCny: priceCny ?? 0,
        domesticShipCny: 0,
        images,
        descriptionImages: [],
        available: input.stock === null || input.stock > 0,
        seller: null,
        colors: (colorAttr?.values ?? []).filter((v) => v.name).slice(0, 30),
        sizes: [...new Set((sizeAttr?.values ?? []).map((v) => v.name).filter(Boolean))].slice(0, 30),
        priceRangeCny: prices.length ? [Math.min(...prices), Math.max(...prices)] : [0, 0],
        qcCount: 0,
      }
    : null;
  return priceCny || details ? { priceCny, details, from: "weidian", at: new Date().toISOString() } : null;
}

async function fetchWeidianSku(source: ProductSource): Promise<AgentData | null> {
  const r = await weidianApi("detail/getItemSkuInfo/1.0", { itemId: source.id });
  if (!r) return null;
  type Sku = { skuInfo?: { discountPrice?: unknown; originalPrice?: unknown; stock?: unknown; img?: unknown } };
  type Attr = { attrTitle?: unknown; attrValues?: unknown };
  type Value = { attrValue?: unknown; img?: unknown };
  const skus = list(r.skuInfos) as Sku[];
  const fen = skus.map((sku) => amount(sku.skuInfo?.discountPrice) || amount(sku.skuInfo?.originalPrice)).filter((p) => p > 0);
  return weidianData({
    title: text(r.itemTitle),
    pricesFen: fen.length ? fen : [amount(r.itemDiscountLowPrice) || amount(r.itemOriginalLowPrice)],
    stock: typeof r.itemStock === "number" ? r.itemStock : null,
    images: [r.itemMainPic, ...skus.map((sku) => sku.skuInfo?.img)],
    attrs: (list(r.attrList) as Attr[]).map((a) => ({
      title: text(a.attrTitle),
      values: (list(a.attrValues) as Value[]).map((v) => ({ name: text(v.attrValue), image: httpsUrl(v.img) ?? undefined })),
    })),
  });
}

async function fetchWeidianInfo(source: ProductSource): Promise<AgentData | null> {
  const r = await weidianApi("detail/getItemInfo/1.0", { vItemId: source.id });
  const model = (r?.default_model ?? null) as Record<string, unknown> | null;
  const item = (model?.item_info ?? null) as Record<string, unknown> | null;
  if (!item) return null;
  type Attr = { attr_title?: unknown; attr_values?: unknown };
  type Value = { attr_value?: unknown; img?: unknown };
  const props = (model?.sku_properties ?? {}) as Record<string, unknown>;
  return weidianData({
    title: text(item.item_name),
    pricesFen: [amount(item.itemLowPrice) || amount(item.origin_price) * 100],
    stock: typeof item.stock === "number" ? item.stock : null,
    images: [item.item_head, ...list(item.imgs)],
    attrs: (list(props.attr_list) as Attr[]).map((a) => ({
      title: text(a.attr_title),
      values: (list(a.attr_values) as Value[]).map((v) => ({ name: text(v.attr_value), image: httpsUrl(v.img) ?? undefined })),
    })),
  });
}

export type AgentData = { priceCny: number | null; details: ItemDetails | null; from: "usfans" | "weidian"; at: string };
type Agent = { data: AgentData | null; status: string };

const AGENT_TTL_S = 3 * 24 * 60 * 60;
const LAST_TTL_S = 30 * 24 * 60 * 60;
const MISS_TTL_S = 60 * 60;
const BLOCK_TTL_S = 60 * 60;
const BLOCKED_KEY = "ag:v1:blocked:usfans";
const memo = ((globalThis as { __xayezAgent?: Map<string, { until: number; value: string }> }).__xayezAgent ??= new Map());

async function cacheGet(key: string): Promise<string | null> {
  if (!persistent()) {
    const hit = memo.get(key);
    return hit && hit.until > Date.now() ? hit.value : null;
  }
  try {
    return (await redisCall(["GET", key])) as string | null;
  } catch {
    return null;
  }
}

async function cacheSet(key: string, value: string, ttlS: number, onlyNew = false): Promise<boolean> {
  if (!persistent()) {
    if (onlyNew && (memo.get(key)?.until ?? 0) > Date.now()) return false;
    memo.set(key, { until: Date.now() + ttlS * 1000, value });
    return true;
  }
  try {
    return (await redisCall(["SET", key, value, "EX", ttlS, ...(onlyNew ? ["NX"] : [])])) === "OK";
  } catch {
    return false;
  }
}

export const usfansBlocked = async () => Boolean(await cacheGet(BLOCKED_KEY));

export async function markUsfansBlocked(status: string) {
  if (await cacheSet(BLOCKED_KEY, status, BLOCK_TTL_S, true)) console.warn(`[agent] USFans blokuje (${status}) – przez godzinę ceny i szczegóły z Weidiana`);
}

const blockedStatus = (status: string) => /^(90000|http-403|http-429|http-5\d\d)/.test(status);

async function remember(key: string, data: AgentData) {
  const json = JSON.stringify(data);
  await Promise.all([cacheSet(`ag:v1:${key}`, json, AGENT_TTL_S), cacheSet(`ag:v1:last:${key}`, json, LAST_TTL_S)]);
}

async function fromUsfans(source: ProductSource): Promise<{ data: AgentData | null; status: string }> {
  if (await usfansBlocked()) return { data: null, status: "usfans-blocked" };
  const goods = await fetchUsfansGoods(source);
  if (!goods.data) {
    if (blockedStatus(goods.status)) await markUsfansBlocked(goods.status);
    return { data: null, status: goods.status };
  }
  const prices = skuPrices(goods.data);
  const data: AgentData = {
    priceCny: prices.length ? Math.min(...prices) : amount(goods.data.price) || null,
    details: parseUsfansGoods(goods.data),
    from: "usfans",
    at: new Date().toISOString(),
  };
  return { data: data.priceCny || data.details ? data : null, status: goods.status };
}

const FALLBACKS: { name: string; load: (source: ProductSource) => Promise<AgentData | null> }[] = [
  { name: "weidian", load: fetchWeidianSku },
  { name: "weidian-info", load: fetchWeidianInfo },
];

async function loadAgent(source: ProductSource, key: string): Promise<Agent> {
  const cached = await cacheGet(`ag:v1:${key}`);
  if (cached) {
    try {
      const data = JSON.parse(cached) as AgentData;
      return { data, status: `cache ${data.from}` };
    } catch {}
  }
  const last = async (status: string): Promise<Agent> => {
    const raw = await cacheGet(`ag:v1:last:${key}`);
    try {
      return raw ? { data: JSON.parse(raw) as AgentData, status: `${status} -> last` } : { data: null, status };
    } catch {
      return { data: null, status };
    }
  };
  if (await cacheGet(`ag:v1:miss:${key}`)) return last("miss");
  if (!(await cacheSet(`ag:v1:lock:${key}`, "1", 120, true))) return last("busy");

  const primary = await fromUsfans(source);
  if (primary.data) {
    await remember(key, primary.data);
    return { data: primary.data, status: primary.status };
  }
  let status = primary.status;
  for (const fallback of FALLBACKS) {
    const data = await fallback.load(source).catch(() => null);
    if (data) {
      await remember(key, data);
      return { data, status: `${status} -> ${fallback.name}` };
    }
    status = `${status} -> ${fallback.name}-fail`;
  }
  await cacheSet(`ag:v1:miss:${key}`, "1", MISS_TTL_S);
  return last(status);
}

const agentInFlight = new Map<string, Promise<Agent>>();

export function agentData(source: ProductSource): Promise<Agent> {
  const key = `${source.platform}:${source.id}`;
  let pending = agentInFlight.get(key);
  if (!pending) {
    pending = loadAgent(source, key)
      .catch((): Agent => ({ data: null, status: "error" }))
      .finally(() => setTimeout(() => agentInFlight.delete(key), 5000));
    agentInFlight.set(key, pending);
  }
  return pending;
}

export async function agentStatus(source: ProductSource) {
  const pending = agentInFlight.get(`${source.platform}:${source.id}`);
  return pending ? (await pending).status : "";
}

export async function fetchAgentPriceCny(source: ProductSource): Promise<number | null> {
  return (await agentData(source)).data?.priceCny ?? null;
}

export async function fetchOldSiteQc(productUrl: string): Promise<string[] | null> {
  const res = await fromOldSite(`/qc?url=${encodeURIComponent(productUrl)}`);
  if (!res) return null;
  const photos = (res.body as { photos?: unknown } | null)?.photos;
  if (!Array.isArray(photos)) return res.ok ? [] : null;
  return photos.filter((p): p is string => typeof p === "string" && /^https:\/\//.test(p));
}
