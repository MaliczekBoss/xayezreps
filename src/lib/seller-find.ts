import { parseSource } from "./agents";
import type { Category, Find } from "./finds";
import type { SellerItem } from "./remote";

const RULES: [Category, RegExp][] = [
  ["Buty", /\bshoes?\b|sneakers?|\bslides?\b|slippers?|\bboots?\b|trainers?|air force|\bjordan\b|\bdunks?\b|yeezy|new ?balance|air max|\bshox\b|loafers?|\bclogs?\b|\bugg\b/i],
  ["Bluzy", /hoodie|\bzip\b|crewneck|sweatshirt|\bfleece\b/i],
  ["Swetry", /sweater|\bknit\b|cardigan/i],
  ["Kurtki", /jacket|puffer|\bcoat\b|windbreaker|\bvest\b|\bparka\b|\bgilet\b/i],
  ["Komplety", /tracksuit|\bset\b|\bsuits?\b/i],
  ["Spodenki", /\bshorts\b|\bjorts\b/i],
  ["Spodnie", /\bpants?\b|\bjeans?\b|sweatpants|trousers|joggers|\bcargo\b/i],
  ["Koszulki", /\btees?\b|t-?shirts?|\bshirts?\b|tank ?tops?|jersey|\bpolo\b|longsleeve/i],
  ["Czapki", /\bcaps?\b|\bhats?\b|beanie|balaclava/i],
  ["Torby", /\bbags?\b|backpack|\btote\b|wallet|\bpurse\b/i],
  ["Paski", /\bbelts?\b/i],
  ["Zegarki", /\bwatch(es)?\b|\brolex\b/i],
  ["Biżuteria", /necklace|bracelet|\brings?\b|earrings?|pendant|\bchains?\b/i],
  ["Bielizna", /\bboxers?\b|underwear|\bbriefs\b|\bsocks\b/i],
  ["Perfumy", /perfume|parfum|cologne|fragrance/i],
];

const WEIGHT: Partial<Record<Category, number>> = {
  Buty: 1300,
  Bluzy: 750,
  Swetry: 600,
  Kurtki: 1200,
  Komplety: 900,
  Spodenki: 420,
  Spodnie: 700,
  Koszulki: 250,
  Czapki: 150,
  Torby: 700,
  Paski: 350,
  Zegarki: 250,
  Biżuteria: 80,
  Bielizna: 150,
  Perfumy: 300,
};

const categoryOf = (title: string): Category => RULES.find(([, re]) => re.test(title))?.[0] ?? "Akcesoria";

export const sellerFindId = (itemId: string) => `s-${itemId}`;

export const sellerOfferHref = (slug: string, itemId: string) => `/sellers/${slug}/${itemId}`;

export function toSellerFind(slug: string, item: SellerItem): Find | null {
  const source = parseSource(item.link);
  if (!source) return null;
  const category = categoryOf(item.title);
  return {
    id: sellerFindId(item.id),
    name: item.title,
    category,
    batch: "Random batch",
    pricePln: Math.round(item.price),
    weightGrams: WEIGHT[category] ?? 300,
    views: 0,
    image: item.image,
    source,
    createdAt: item.createdAt ?? "",
    href: sellerOfferHref(slug, item.id),
  };
}
