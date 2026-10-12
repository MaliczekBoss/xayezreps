import type { SellerItem } from "./remote";

/** Statystyki cen sklepu do kart i nagłówka sklepu */
export function sellerStats(items: SellerItem[]) {
  const priced = items.filter((i) => i.price > 0);
  const cheapest = priced.reduce<SellerItem | null>((min, i) => (!min || i.price < min.price ? i : min), null);
  return {
    itemCount: items.length,
    minPrice: priced.length ? Math.min(...priced.map((i) => i.price)) : 0,
    maxPrice: priced.length ? Math.max(...priced.map((i) => i.price)) : 0,
    cheapest: cheapest ? { title: cheapest.title, price: cheapest.price } : null,
  };
}
