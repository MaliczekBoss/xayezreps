import { site } from "./site";

/**
 * Adres, pod którym strona naprawdę działa: NEXT_PUBLIC_SITE_URL, a na Vercelu – domena produkcyjna projektu
 * (xayezreps.vercel.app albo własna domena, gdy ją podepniesz). site.url to docelowa domena, używana lokalnie.
 * Z tego adresu biorą się linki w podglądach (Discord, Messenger), canonical i mapa strony.
 */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : site.url)
).replace(/\/$/, "");

// Domeny tego wdrożenia. Adres z nagłówka zapytania może podać każdy, więc do linków i pobierania
// zdjęć używamy go tylko, gdy jest na tej liście.
const TRUSTED_HOSTS = new Set(
  [new URL(siteUrl).host, process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL].filter(Boolean),
);

/** Adres strony do linków w odpowiedzi: domena z zapytania, jeśli jest nasza, a w innym wypadku siteUrl */
export function trustedOrigin(request: Request) {
  const url = new URL(request.url);
  if (TRUSTED_HOSTS.has(url.host) || url.hostname === "localhost" || url.hostname === "127.0.0.1") return url.origin;
  return siteUrl;
}
