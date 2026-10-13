import "server-only";

import type { Find } from "./finds";
import { getAgentPrices, withAgentPrices } from "./prices";
import { getRates } from "./remote";
import { getProductViews, withViews } from "./views";

/**
 * Produkty z aktualnymi danymi, których nie ma w zapisanym katalogu: cena zsynchronizowana z agentem
 * (prices.ts, ten sam kurs co strona produktu) i wyświetlenia oferty (views.ts). Używaj wszędzie, gdzie widać cenę.
 */
export async function live<T extends Find>(finds: T[]): Promise<T[]> {
  const [prices, rates, views] = await Promise.all([getAgentPrices(), getRates(), getProductViews()]);
  return withViews(withAgentPrices(finds, prices, rates), views);
}
