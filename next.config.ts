import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Zdjęcia z panelu admina mogą mieć do 4 MB
    serverActions: { bodySizeLimit: "5mb" },
  },
  images: {
    remotePatterns: [
      // Zdjęcia produktów xayezreps
      { protocol: "https", hostname: "cdn.xayezreps.com", pathname: "/**" },
      { protocol: "https", hostname: "xayezreps.pl", pathname: "/**" },
      // Miniatury z Weidiana i 1688 w sekcji QC
      { protocol: "https", hostname: "si.geilicdn.com", pathname: "/**" },
      { protocol: "https", hostname: "img.alicdn.com", pathname: "/**" },
      // Zdjęcia QC z magazynu Kakobuy (oryginały mają po 2–3 MB, więc je zmniejszamy)
      { protocol: "https", hostname: "kk-oss-wh-hk.kakobuy.com", pathname: "/**" },
    ],
    formats: ["image/avif", "image/webp"],
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
