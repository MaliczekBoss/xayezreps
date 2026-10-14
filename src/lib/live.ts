import "server-only";

import { parseSource } from "./agents";
import type { Find } from "./finds";
import { getAgentPrices, withAgentPrices } from "./prices";
import { getRates, type SellerItem } from "./remote";
import { getProductViews, withViews } from "./views";

export async function live<T extends Find>(finds: T[]): Promise<T[]> {
  const [prices, rates, views] = await Promise.all([getAgentPrices(), getRates(), getProductViews()]);
  return withViews(withAgentPrices(finds, prices, rates), views);
}

export async function liveSellerItems(items: SellerItem[]): Promise<SellerItem[]> {
  const [prices, rates] = await Promise.all([getAgentPrices(), getRates()]);
  return items.map((i) => {
    const source = parseSource(i.link);
    const cny = source ? prices[`${source.platform}:${source.id}`]?.cny : undefined;
    return cny && cny > 0 && rates.CNY > 0 ? { ...i, price: Math.round(cny / rates.CNY) } : i;
  });
}
