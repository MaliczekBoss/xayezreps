import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { cacheLife, cacheTag } from "next/cache";
import type { ProductSource } from "./agents";
import { FALLBACK_RATES, type Rates } from "./money";
import { snapshotItem } from "./snapshot";

// Dane z zewnątrz: kursy walut (USFans, NBP), ceny i szczegóły produktów u agenta (USFans, na żywo), sprzedawcy.
// Sprzedawców, galerie QC i szczegóły produktów ze starej strony (xayezreps.com) mamy zapisane u siebie
// (data/sellers.json, data/qc, data/items) – to zapas, gdy USFans nie odpowie. Starą stronę pytamy już tylko
// o to, czego nie ma w zapisie, z krótkim limitem czasu, więc jej wyłączenie niczego u nas nie psuje.
const OLD_API = "https://xayezreps.com/api";
const OLD_HEADERS = { "User-Agent": "xayezreps.pl (+https://xayezreps.pl)", Accept: "application/json" };
const OLD_TIMEOUT_MS = 5000;

// Bezpiecznik: gdy stara strona leży, po 3 błędach z rzędu nie pytamy jej przez 30 min (na tej instancji serwera),
// żeby nic u nas nie czekało na jej odpowiedź
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

/**
 * Kursy walut (ile jednostek za 1 zł) – te, po których USFans przelicza ceny klientom, więc ceny na stronie
 * zgadzają się z kasą agenta. Gdy USFans nie odpowiada – średnie kursy NBP, a w ostateczności kursy zapasowe.
 * Odświeżamy co godzinę.
 */
export async function getRates(): Promise<Rates> {
  "use cache";
  cacheLife("hours");
  cacheTag("rates");
  return (await usfansRates()) ?? (await nbpRates()) ?? FALLBACK_RATES;
}

/** Kursy USFans: ile jednostek waluty za 1 juana, przeliczone na „za 1 zł” */
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

/** Średnie kursy NBP z tabeli A (publikowane w dni robocze około południa) */
async function nbpRates(): Promise<Rates | null> {
  try {
    const res = await fetch("https://api.nbp.pl/api/exchangerates/tables/a/?format=json", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const [table] = (await res.json()) as { rates?: { code: string; mid: number }[] }[];
    // NBP podaje, ile złotych kosztuje 1 jednostka waluty, a my liczymy odwrotnie
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

/** Sprzedawcy razem z produktami – zapisani u nas ze starej strony (npm run sellers:snapshot), zdjęcia w public/s */
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
      items: (s.items ?? []).filter((i) => i.title && i.image && i.link),
    }))
    .sort((a, b) => b.itemCount - a.itemCount);
}

const PLATFORM_CODE: Record<ProductSource["platform"], string> = { weidian: "WD", taobao: "TB", "1688": "AL" };

export type ItemDetails = {
  title: string;
  priceCny: number;
  domesticShipCny: number;
  images: string[];
  /** Zdjęcia z opisu w sklepie (np. tabela rozmiarów) */
  descriptionImages: string[];
  available: boolean;
  seller: string | null;
  colors: { name: string; image?: string }[];
  sizes: string[];
  priceRangeCny: [number, number];
  qcCount: number;
};

/**
 * Szczegóły produktu (tytuł, zdjęcia, warianty, dostępność, cena w juanach) – na żywo z USFans, więc zmiany
 * u agenta od razu widać u nas. Gdy USFans nie odpowie: zapis ze starej strony, a dla aukcji spoza zapisu
 * (np. link wklejony w narzędziu QC) – stara strona, dopóki odpowiada.
 */
export async function fetchItemDetails(source: ProductSource): Promise<ItemDetails | null> {
  const { data } = await fetchUsfansGoods(source);
  const live = data && parseUsfansGoods(data);
  if (live) return live;
  const saved = await snapshotItem(source);
  if (saved !== undefined) return saved && parseItemDetails(saved);
  const res = await fromOldSite(`/item-details?platform=${PLATFORM_CODE[source.platform]}&platformID=${encodeURIComponent(source.id)}`);
  return res?.ok && res.body && typeof res.body === "object" ? parseItemDetails(res.body as Record<string, unknown>) : null;
}

const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
/** Kwota z odpowiedzi agenta – liczba albo liczba zapisana tekstem („89.00”); inaczej 0 */
const amount = (v: unknown) => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** Ceny wariantów u USFans w juanach, z promocją, jeśli jest */
const skuPrices = (d: Record<string, unknown>) =>
  (list(d.skuList) as { price?: unknown; discountPrice?: unknown }[])
    .map((s) => amount(s.discountPrice) || amount(s.price))
    .filter((p) => p > 0);
/** Adres zdjęcia ze sklepu: „//host/…” i http → https, inne odrzucamy */
const httpsUrl = (v: unknown) => {
  const url = text(v).replace(/^\/\//, "https://").replace(/^http:\/\//, "https://");
  return /^https:\/\/[^\s"'<>]+$/.test(url) ? url : null;
};

/**
 * Odpowiedź USFans (api/goods/info) → szczegóły na stronie produktu. Pola jak na ich stronie produktu:
 * properties [{ propNameEn, valuesList [{ valueNameEn, valueName, picUrl }] }], skuList [{ price, discountPrice, stock }],
 * images, description (HTML), deliveryPrice, shopName, stock.
 */
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
  // Stan magazynu: suma wariantów, a bez niej – całej aukcji; brak danych = dostępny
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

// Cena i szczegóły biorą tę samą odpowiedź USFans: zapytania o tę samą aukcję w tej samej chwili idą raz.
// status – krótki opis odpowiedzi (tylko ASCII) do nagłówka X-Agent-Status w /api/item, np. „200 title=1 skus=12 prices=12”
type Goods = { data: Record<string, unknown> | null; status: string };
const goodsInFlight = new Map<string, Promise<Goods>>();

function fetchUsfansGoods(source: ProductSource): Promise<Goods> {
  const key = `${source.platform}:${source.id}`;
  let pending = goodsInFlight.get(key);
  if (!pending) {
    pending = (async (): Promise<Goods> => {
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
      const shape = data ? ` title=${text(data.titleEn) || text(data.title) ? 1 : 0} skus=${list(data.skuList).length} prices=${skuPrices(data).length}` : "";
      return { data, status: `${code}${shape}` };
    })()
      .catch((): Goods => ({ data: null, status: "error" }))
      .finally(() => setTimeout(() => goodsInFlight.delete(key), 5000));
    goodsInFlight.set(key, pending);
  }
  return pending;
}

/** Jak USFans odpowiedział na ostatnie (sprzed najwyżej kilku sekund) pytanie o tę aukcję; pusty – nie pytaliśmy */
export async function agentStatus(source: ProductSource) {
  const pending = goodsInFlight.get(`${source.platform}:${source.id}`);
  return pending ? (await pending).status : "";
}

/** Aktualna cena u agenta (USFans) w juanach: najtańszy wariant, z promocją, jeśli jest */
export async function fetchAgentPriceCny(source: ProductSource): Promise<number | null> {
  const { data: d } = await fetchUsfansGoods(source);
  if (!d) return null;
  const prices = skuPrices(d);
  return prices.length ? Math.min(...prices) : amount(d.price) || null;
}

/**
 * Zdjęcia QC ze starej strony na żywo – dopóki odpowiada (zapis jej galerii mamy w data/qc).
 * Dla produktów bez zdjęć API odpowiada 500 z pustą listą, więc patrzymy na treść, a nie na status.
 */
export async function fetchOldSiteQc(productUrl: string): Promise<string[] | null> {
  const res = await fromOldSite(`/qc?url=${encodeURIComponent(productUrl)}`);
  if (!res) return null;
  const photos = (res.body as { photos?: unknown } | null)?.photos;
  if (!Array.isArray(photos)) return res.ok ? [] : null;
  return photos.filter((p): p is string => typeof p === "string" && /^https:\/\//.test(p));
}
