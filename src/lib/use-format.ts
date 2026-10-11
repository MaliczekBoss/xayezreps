"use client";

import { getAgent, type ProductSource } from "./agents";
import type { DictKey } from "./dict";
import { categoryKey, translate } from "./i18n";
import { cnyToPln, formatMoney, formatWeight, type Rates } from "./money";
import { getLiveRates, useRates } from "./rates";
import { getSettings, localeOf, useSettings, type Settings } from "./settings";

type Days = { from: number; to: number };

function makeFormat(s: Settings, rates: Rates) {
  const locale = localeOf(s.lang);
  const t = (key: DictKey, vars?: Record<string, string | number>) => translate(s.lang, key, vars);
  const agent = getAgent(s.agent);
  return {
    t,
    locale,
    settings: s,
    agent,
    money: (pln: number) => formatMoney(pln, s.currency, locale, rates),
    moneyCny: (cny: number) => formatMoney(cnyToPln(cny, rates), s.currency, locale, rates),
    rates,
    weight: (grams: number, unit?: "g" | "kg") => formatWeight(grams, locale, unit),
    pieces: (n: number) => t("pieces", { n }),
    days: (d: Days) => t("days", d),
    category: (c: string) => {
      const key = categoryKey(c);
      return key ? t(key) : c;
    },
    buyUrl: (source: ProductSource) => agent.productUrl(source),
  };
}

export type Format = ReturnType<typeof makeFormat>;

/** Tłumaczenia, waluta, waga i linki agenta według ustawień użytkownika */
export function useFormat(): Format {
  return makeFormat(useSettings(), useRates());
}

/** To samo poza Reactem, np. w powiadomieniach */
export const formatNow = () => makeFormat(getSettings(), getLiveRates());
