import type { MetadataRoute } from "next";
import { getSellers } from "@/lib/remote";
import { site } from "@/lib/site";
import { getFinds } from "@/lib/store";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [finds, sellers] = await Promise.all([getFinds(), getSellers()]);
  const r = site.routes;
  const pages = [r.finds, r.tools, r.linkConverter, r.qcFinder, r.tracking, r.shipCalculator, r.sellers, r.tutorial];

  return [
    { url: site.url, changeFrequency: "daily", priority: 1 },
    ...pages.map((p) => ({ url: `${site.url}${p}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...finds.map((f) => ({ url: `${site.url}${r.product(f.id)}`, lastModified: f.createdAt, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...sellers.map((s) => ({ url: `${site.url}${r.seller(s.slug)}`, changeFrequency: "weekly" as const, priority: 0.5 })),
  ];
}
