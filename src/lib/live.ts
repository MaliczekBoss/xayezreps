import "server-only";

import { parseSource } from "./agents";
import type { Find } from "./finds";
import { getAgentPrices, withAgentPrices } from "./prices";
import { getRates, type SellerItem } from "./remote";
import { getProductViews, withViews } from "./views";

/**
 * Produkty z aktualnymi danymi, których nie ma w zapisanym katalogu: cena zsynchronizowana z agentem
 * (prices.ts, ten sam kurs co strona produktu) i wyświetlenia oferty (views.ts). Używaj wszędzie, gdzie widać cenę.
 */
export async function live<T extends Find>(finds: T[]): Promise<T[]> {
  const [prices, rates, views] = await Promise.all([getAgentPrices(), getRates(), getProductViews()]);
  return withViews(withAgentPrices(finds, prices, rates), views);
}

/** Produkty sprzedawcy z ceną zsynchronizowaną z agentem (ten sam kurs co strona oferty) */
export async function liveSellerItems(items: SellerItem[]): Promise<SellerItem[]> {
  const [prices, rates] = await Promise.all([getAgentPrices(), getRates()]);
  return items.map((i) => {
    const source = parseSource(i.link);
    const cny = source ? prices[`${source.platform}:${source.id}`]?.cny : undefined;
    return cny && cny > 0 && rates.CNY > 0 ? { ...i, price: Math.round(cny / rates.CNY) } : i;
  });
}
