import type { Currency } from "./settings";

export type Rates = Record<Currency, number>;

// Zapasowe kursy (ile jednostek waluty za 1 zł) – średnie NBP z tabeli 199/A/NBP/2026 (13.10.2026).
// Aktualne pobieramy z NBP co godzinę (remote.ts → getRates).
export const FALLBACK_RATES: Rates = { PLN: 1, USD: 0.2553, EUR: 0.2283, CNY: 1.7088 };

export const cnyToPln = (cny: number, rates: Rates = FALLBACK_RATES) => cny / rates.CNY;

export function formatMoney(pln: number, currency: Currency, locale: string, rates: Rates = FALLBACK_RATES) {
  const value = pln * rates[currency];
  const whole = currency === "PLN" || currency === "CNY";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: whole ? 0 : 2,
    minimumFractionDigits: whole ? 0 : 2,
  }).format(whole ? Math.round(value) : value);
}

export function formatWeight(grams: number, locale: string, unit: "g" | "kg" = grams >= 1000 ? "kg" : "g") {
  if (unit === "kg") {
    return `${new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(grams / 1000)} kg`;
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(grams)} g`;
}
