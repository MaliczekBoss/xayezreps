import type { MetadataRoute } from "next";
import { getSellers } from "@/lib/remote";
import { site } from "@/lib/site";
import { getFinds, getOutfits } from "@/lib/store";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [finds, sellers, outfits] = await Promise.all([getFinds(), getSellers(), getOutfits()]);
  const r = site.routes;
  const pages = [r.finds, r.outfits, r.tools, r.photoSearch, r.linkConverter, r.qcFinder, r.tracking, r.shipCalculator, r.sellers, r.tutorial];

  return [
    { url: site.url, changeFrequency: "daily", priority: 1 },
    ...pages.map((p) => ({ url: `${site.url}${p}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...finds.map((f) => ({ url: `${site.url}${r.product(f.id)}`, lastModified: f.createdAt, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...sellers.map((s) => ({ url: `${site.url}${r.seller(s.slug)}`, changeFrequency: "weekly" as const, priority: 0.5 })),
    ...outfits.map((o) => ({ url: `${site.url}${r.outfit(o.id)}`, lastModified: o.createdAt, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
