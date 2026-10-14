import type { NextConfig } from "next";

const dev = process.env.NODE_ENV === "development";

const imagesUrl = (() => {
  try {
    return process.env.NEXT_PUBLIC_IMAGES_URL ? new URL(process.env.NEXT_PUBLIC_IMAGES_URL) : null;
  } catch {
    return null;
  }
})();

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
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  outputFileTracingIncludes: {
    "/api/qc": ["./data/qc/**"],
    "/api/cron/qc": ["./data/qc/**"],
    "/api/item": ["./data/items/**"],
    "/**": ["./data/sellers.json"],
  },
  images: {
    remotePatterns: [
      ...(imagesUrl
        ? [{ protocol: imagesUrl.protocol === "http:" ? ("http" as const) : ("https" as const), hostname: imagesUrl.hostname, port: imagesUrl.port, pathname: "/**" }]
        : []),
      { protocol: "https", hostname: "si.geilicdn.com", pathname: "/**" },
      { protocol: "https", hostname: "img.alicdn.com", pathname: "/**" },
      { protocol: "https", hostname: "kk-oss-wh-hk.kakobuy.com", pathname: "/**" },
      { protocol: "https", hostname: "kk-oss-wh-hk.kakobyy.com", pathname: "/**" },
      { protocol: "https", hostname: "kako-alosshk-pic.oss-cn-hongkong.aliyuncs.com", pathname: "/**" },
      { protocol: "https", hostname: "media.usfans.com", pathname: "/**" },
      { protocol: "https", hostname: "a-wh.loongbuy.com", pathname: "/**" },
      { protocol: "https", hostname: "img.customizeify.com", pathname: "/**" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      { source: "/api/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      {
        source: "/:dir(i|s|o)/:file*",
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
