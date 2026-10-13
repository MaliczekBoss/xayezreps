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
