import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import type { ProductSource } from "./agents";
import { FALLBACK_RATES, type Rates } from "./money";

// Dane z API obecnej strony xayezreps.com (sprzedawcy, QC, szczegóły produktów); kursy walut z NBP
const API = "https://xayezreps.com/api";
const HEADERS = { "User-Agent": "xayezreps.pl (+https://xayezreps.pl)", Accept: "application/json" };

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

type RawSeller = {
  slug: string;
  name: string;
  description?: string;
  tags?: string[];
  profileImg?: string;
  items?: { id: string; title: string; price: number; image: string; link: string; createdAt?: string }[];
};

/** Sprzedawcy razem z produktami, odświeżani co godzinę */
export async function getSellers(): Promise<Seller[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("sellers");
  try {
    const res = await fetch(`${API}/sellers`, { headers: HEADERS, signal: AbortSignal.timeout(20000) });
    if (!res.ok) return [];
    const raw = (await res.json()) as RawSeller[];
    return raw
      .map((s) => ({
        slug: s.slug,
        name: s.name.replace(/\s+/g, " ").trim(),
        description: (s.description ?? "").trim(),
        tags: s.tags ?? [],
        profileImg: s.profileImg ?? "",
        itemCount: s.items?.length ?? 0,
        items: (s.items ?? [])
          .filter((i) => i.title && i.image && i.link)
          .map((i) => ({ id: String(i.id), title: i.title, price: i.price, image: i.image, link: i.link, createdAt: i.createdAt })),
      }))
      .sort((a, b) => b.itemCount - a.itemCount);
  } catch {
    return [];
  }
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

/** Szczegóły produktu ze sklepu (tytuł, warianty, cena w juanach) */
export async function fetchItemDetails(source: ProductSource): Promise<ItemDetails | null> {
  const url = `${API}/item-details?platform=${PLATFORM_CODE[source.platform]}&platformID=${encodeURIComponent(source.id)}`;
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(15000), cache: "no-store" });
  if (!res.ok) return null;
  const d = await res.json();
  if (!d || typeof d !== "object" || !d.title) return null;

  type Attr = { tag?: string; name?: string; values?: { name?: string; image?: string }[] };
  const attrs: Attr[] = Array.isArray(d.attributes) ? d.attributes : [];
  const findAttr = (re: RegExp) => attrs.find((a) => re.test(`${a.tag ?? ""} ${a.name ?? ""}`));
  const colors = (findAttr(/colou?r|颜色/i)?.values ?? []).filter((v) => v.name).map((v) => ({ name: v.name!, image: v.image }));
  const sizes = (findAttr(/size|尺码|尺寸/i)?.values ?? []).filter((v) => v.name).map((v) => v.name!);
  const skuPrices: number[] = Array.isArray(d.skus) ? d.skus.map((s: { price?: number }) => s.price).filter((p: unknown) => typeof p === "number") : [];
  const base = typeof d.price === "number" ? d.price : 0;
  const all = skuPrices.length ? skuPrices : [base];

  return {
    title: String(d.title),
    priceCny: base,
    domesticShipCny: typeof d.domesticShip === "number" ? d.domesticShip : 0,
    images: Array.isArray(d.images) ? d.images.filter((i: unknown) => typeof i === "string").slice(0, 8) : [],
    descriptionImages: Array.isArray(d.description)
      ? d.description.filter((i: unknown) => typeof i === "string" && /^https:\/\//.test(i)).slice(0, 8)
      : [],
    available: d.isAvailable !== false,
    seller: d.seller?.name ?? null,
    colors: colors.slice(0, 30),
    sizes: sizes.slice(0, 30),
    priceRangeCny: [Math.min(...all), Math.max(...all)],
    qcCount: typeof d.qcCount === "number" ? d.qcCount : 0,
  };
}

const USFANS_CHANNEL: Record<ProductSource["platform"], number> = { "1688": 1, taobao: 2, weidian: 3 };

/** Aktualna cena u agenta (USFans) w juanach: najtańszy wariant, z promocją, jeśli jest */
export async function fetchAgentPriceCny(source: ProductSource): Promise<number | null> {
  const url = `https://www.usfans.com/api/goods/info?channel=${USFANS_CHANNEL[source.platform]}&goodsId=${encodeURIComponent(source.id)}&refresh=false&queryDelivery=false&activityId=`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; xayezreps.pl)", Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const d = await res.json().catch(() => null);
  if (d?.code !== 200 || !d.data) return null;
  type Sku = { price?: number; discountPrice?: number | null };
  const skus: Sku[] = Array.isArray(d.data.skuList) ? d.data.skuList : [];
  const prices = skus.map((s) => (s.discountPrice && s.discountPrice > 0 ? s.discountPrice : s.price)).filter((p): p is number => typeof p === "number" && p > 0);
  if (prices.length) return Math.min(...prices);
  return typeof d.data.price === "number" && d.data.price > 0 ? d.data.price : null;
}

/** Zdjęcia QC z magazynów agentów */
export async function fetchQcPhotos(productUrl: string, timeoutMs = 20000): Promise<string[] | null> {
  const res = await fetch(`${API}/qc?url=${encodeURIComponent(productUrl)}`, {
    headers: HEADERS,
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  // Dla produktów bez zdjęć API odpowiada 500 z pustą listą, więc patrzymy na treść, a nie na status
  const d = await res.json().catch(() => null);
  if (!Array.isArray(d?.photos)) return res.ok ? [] : null;
  return d.photos.filter((p: unknown) => typeof p === "string" && /^https:\/\//.test(p));
}

/** Status przesyłki; zwraca surowe dane albo null, gdy usługa nie odpowiada */
export async function fetchTracking(number: string): Promise<unknown | null> {
  try {
    const res = await fetch(`${API}/tracking?number=${encodeURIComponent(number)}`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
