"use client";

import Link from "next/link";
import { categories, sortPopular, type Find } from "@/lib/finds";
import { site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";
import { HeroBanners } from "./hero-banners";
import { HeroSearch } from "./hero-search";
import { ProductImage } from "./product-image";
import type { ToolPreviews } from "./tools";

const chips = categories.filter((c) => ["Bluzy", "Spodnie", "Spodenki", "Buty", "Torby", "Paski", "Zegarki"].includes(c));

const chip =
  "inline-flex h-9 items-center rounded-xl border border-line bg-card px-3.5 text-[0.8125rem] font-medium text-muted transition-colors hover:border-line-strong hover:text-fg";

export function Hero({ finds, previews }: { finds: Find[]; previews: ToolPreviews }) {
  const f = useFormat();
  const { t } = f;
  const popular = sortPopular(finds);

  return (
    <section id="top" aria-labelledby="hero-title" className="mx-auto grid max-w-7xl items-center gap-x-12 gap-y-10 px-4 pb-14 pt-32 sm:px-6 sm:pb-16 sm:pt-40 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:px-8">
      <div className="min-w-0 max-w-[40rem]">
        <h1 id="hero-title" className="text-[clamp(2.75rem,6vw,4.25rem)] font-semibold leading-[1.02] tracking-[-0.035em]">
          <span className="block">{t("hero.title1")}</span>
          <span className="fancy block text-[1.1em] leading-[1] text-muted">{t("hero.title2")}</span>
        </h1>
        <p className="mt-5 max-w-[30rem] text-[1.0625rem] leading-relaxed text-muted">{t("hero.lead")}</p>

        <HeroSearch />

        <ul aria-label={t("hero.all")} className="mt-4 flex flex-wrap gap-2">
          {chips.map((c) => (
            <li key={c}>
              <Link href={`${site.routes.finds}?category=${encodeURIComponent(c)}`} className={chip}>
                {f.category(c)}
              </Link>
            </li>
          ))}
          <li>
            <Link href={site.routes.finds} className={chip}>
              {t("hero.more")}
            </Link>
          </li>
        </ul>

      </div>

      <div className="min-w-0">
        <HeroBanners data={previews} />
        <div className="mt-4 flex items-center justify-center gap-3 text-sm text-muted">
          <span aria-hidden="true" className="flex -space-x-2">
            {popular.slice(0, 4).map((p) => (
              <span key={p.id} className="relative size-7 overflow-hidden rounded-full border-2 border-bg bg-card">
                <ProductImage src={p.image} sizes="1.75rem" />
              </span>
            ))}
          </span>
          {t("footer.trust", { n: site.buyers })}
        </div>
      </div>
    </section>
  );
}
