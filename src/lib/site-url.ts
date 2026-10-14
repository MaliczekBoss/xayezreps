import { site } from "./site";

export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : site.url)
).replace(/\/$/, "");

const TRUSTED_HOSTS = new Set(
  [new URL(siteUrl).host, process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL].filter(Boolean),
);

export function trustedOrigin(request: Request) {
  const url = new URL(request.url);
  if (TRUSTED_HOSTS.has(url.host) || url.hostname === "localhost" || url.hostname === "127.0.0.1") return url.origin;
  return siteUrl;
}
