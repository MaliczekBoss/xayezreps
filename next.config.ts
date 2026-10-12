import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Zdjęcia z panelu admina mogą mieć do 4 MB
    serverActions: { bodySizeLimit: "9mb" },
  },
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
  // Zdjęcia produktów bez tła (public/i) zmieniają się rzadko: przeglądarka trzyma je tydzień, CDN rok
  async headers() {
    return [
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
