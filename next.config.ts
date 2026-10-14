import type { NextConfig } from "next";

const dev = process.env.NODE_ENV === "development";

// Content Security Policy: skąd strona może ładować skrypty, style, zdjęcia i z kim się łączyć.
// Skrypty tylko z naszej domeny (inline zostaje, bo Next wstawia własne skrypty startowe, a nonce wyłączyłby
// statyczne strony), zdjęcia z dowolnego HTTPS (sklepy i magazyny agentów), żadnych ramek, obcych formularzy
// ani wtyczek. Lokalnie dochodzi eval i websocket dla odświeżania na żywo.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${dev ? " ws: wss:" : ""}`,
  "media-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Zawsze HTTPS – przeglądarka nie spróbuje już połączenia bez szyfrowania (2 lata)
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Strony nie da się osadzić w cudzej ramce (clickjacking) – starsze przeglądarki nie znają frame-ancestors
  { key: "X-Frame-Options", value: "DENY" },
  // Przeglądarka nie zgaduje typu pliku (np. nie potraktuje zdjęcia jak skryptu)
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Strona nie potrzebuje kamery, mikrofonu, lokalizacji ani płatności przez przeglądarkę
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Bez nagłówka X-Powered-By: Next.js – nie zdradzamy, na czym działa strona
  poweredByHeader: false,
  images: {
    remotePatterns: [
      // Zdjęcia produktów xayezreps
      { protocol: "https", hostname: "cdn.xayezreps.com", pathname: "/**" },
      { protocol: "https", hostname: "xayezreps.pl", pathname: "/**" },
      // Miniatury z Weidiana i 1688 w sekcji QC
      { protocol: "https", hostname: "si.geilicdn.com", pathname: "/**" },
      { protocol: "https", hostname: "img.alicdn.com", pathname: "/**" },
      // Zdjęcia outfitów z xayezreps.com
      { protocol: "https", hostname: "xayezreps.com", pathname: "/api/img/**" },
      // Zdjęcia QC z magazynu Kakobuy (oryginały mają po 2–3 MB, więc je zmniejszamy)
      { protocol: "https", hostname: "kk-oss-wh-hk.kakobuy.com", pathname: "/**" },
      { protocol: "https", hostname: "kk-oss-wh-hk.kakobyy.com", pathname: "/**" },
      { protocol: "https", hostname: "kako-alosshk-pic.kakobuy.com", pathname: "/**" },
      { protocol: "https", hostname: "media.usfans.com", pathname: "/**" },
      { protocol: "https", hostname: "a-wh.loongbuy.com", pathname: "/**" },
      { protocol: "https", hostname: "img.customizeify.com", pathname: "/**" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  // Nagłówki bezpieczeństwa dla całej strony, panel admina bez cache; zdjęcia produktów bez tła (public/i)
  // zmieniają się rzadko: przeglądarka trzyma je tydzień, CDN rok
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Panel admina i jego API: bez cache i bez indeksowania
      {
        source: "/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      { source: "/api/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      {
        source: "/i/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, s-maxage=31536000, stale-while-revalidate=86400" }],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
