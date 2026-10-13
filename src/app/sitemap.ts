import { siteUrl } from "@/lib/site-url";
import type { MetadataRoute } from "next";
import { getSellers } from "@/lib/remote";
import { site } from "@/lib/site";
import { getFinds, getOutfits } from "@/lib/store";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [finds, sellers, outfits] = await Promise.all([getFinds(), getSellers(), getOutfits()]);
  const r = site.routes;
  const pages = [r.finds, r.outfits, r.tools, r.photoSearch, r.linkConverter, r.qcFinder, r.tracking, r.shipCalculator, r.sellers, r.tutorial];

  return [
    { url: siteUrl, changeFrequency: "daily", priority: 1 },
    ...pages.map((p) => ({ url: `${siteUrl}${p}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...finds.map((f) => ({ url: `${siteUrl}${r.product(f.id)}`, lastModified: f.createdAt, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...sellers.map((s) => ({ url: `${siteUrl}${r.seller(s.slug)}`, changeFrequency: "weekly" as const, priority: 0.5 })),
    ...outfits.map((o) => ({ url: `${siteUrl}${r.outfit(o.id)}`, lastModified: o.createdAt, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
