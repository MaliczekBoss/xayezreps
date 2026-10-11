"use client";

import { ArrowRight, ArrowUpRight, Eye } from "lucide-react";
import { categories, sortPopular, type Find } from "@/lib/finds";
import { site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";
import { HaulToggle } from "./haul-toggle";
import { HeroSearch } from "./hero-search";
import { ProductImage } from "./product-image";

const chips = categories.filter((c) => ["Bluzy", "Spodnie", "Spodenki", "Buty", "Paski", "Biżuteria", "Koszulki"].includes(c));

export function Hero({ finds }: { finds: Find[] }) {
  const f = useFormat();
  const { t } = f;
  const [top, second, third] = sortPopular(finds);

  return (
    <div className="overflow-x-clip">
      <section id="top" aria-labelledby="hero-title" className="relative mx-auto max-w-6xl px-4 pb-14 pt-32 sm:px-6 sm:pb-20 sm:pt-40">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 -z-10 h-[30rem] w-[40rem] max-w-full bg-[radial-gradient(closest-side,rgb(59_130_246/0.16),transparent)]"
        />

        <div className="grid items-center gap-x-12 gap-y-14 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <a
              href={site.partner.signupUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="group inline-flex max-w-full items-center gap-2.5 rounded-full border border-brand/30 bg-brand/[0.08] py-1 pl-1 pr-3.5 text-[0.8125rem] text-fg transition-colors hover:border-brand/60"
            >
              <span className="shrink-0 rounded-full bg-brand px-2.5 py-0.5 font-mono text-xs font-semibold text-white">{site.promo.code}</span>
              <span className="truncate">
                {t("hero.promo", { agent: site.partner.name })}
                <span className="hidden text-muted sm:inline"> – {t("hero.promoMore")}</span>
              </span>
              <ArrowRight aria-hidden size={14} className="shrink-0 transition-transform group-hover:translate-x-0.5" />
              <span className="sr-only">{t("newTab")}</span>
            </a>
            <h1 id="hero-title" className="mt-6 text-[clamp(2.9rem,7vw,4.5rem)] font-semibold leading-[1.02] tracking-[-0.04em]">
              <span className="block">{t("hero.title1")}</span>
              <span className="fancy block text-[1.14em] leading-[0.95] text-brand-bright">{t("hero.title2")}</span>
            </h1>
            <p className="mt-5 max-w-[30rem] text-lg leading-relaxed text-muted">{t("hero.lead")}</p>

            <HeroSearch />

            <ul aria-label={t("hero.all")} className="mt-5 flex flex-wrap gap-2">
              {chips.map((c) => (
                <li key={c}>
                  <a
                    href={`${site.routes.finds}?category=${encodeURIComponent(c)}`}
                    className="inline-flex h-8 items-center rounded-full border border-line px-3.5 text-[0.8125rem] text-muted transition-colors hover:border-brand/60 hover:text-fg"
                  >
                    {f.category(c)}
                  </a>
                </li>
              ))}
              <li>
                <a href={site.routes.finds} className="inline-flex h-8 items-center rounded-full px-2 text-[0.8125rem] font-medium text-brand-bright hover:underline">
                  {t("hero.all")}
                </a>
              </li>
            </ul>

            <p className="mt-8 text-sm text-dim">{t("hero.trust", { n: site.buyers })}</p>
          </div>

          {/* Stos kart: najczęściej oglądany find na wierzchu */}
          {top && (
            <div className="relative mx-auto w-full max-w-[22rem] lg:mr-0">
              {third && (
                <div aria-hidden="true" className="absolute left-[14%] right-[-10%] top-6 aspect-[4/5] rotate-[8deg] overflow-hidden rounded-2xl border border-line bg-card opacity-50">
                  <ProductImage src={third.image} sizes="20rem" />
                </div>
              )}
              {second && (
                <div aria-hidden="true" className="absolute left-[-10%] right-[14%] top-4 aspect-[4/5] -rotate-[7deg] overflow-hidden rounded-2xl border border-line bg-card opacity-70">
                  <ProductImage src={second.image} sizes="20rem" />
                </div>
              )}

              <article className="relative rounded-2xl border border-line-strong bg-card p-2 shadow-[0_30px_60px_-25px_rgb(0_0_0/0.9)]">
                <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-bg">
                  <ProductImage src={top.image} alt={top.name} sizes="(min-width: 1024px) 21rem, 90vw" preload />
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium backdrop-blur">
                    <Eye aria-hidden size={13} />
                    {t("hero.mostViewed")}
                  </span>
                  <HaulToggle find={top} className="absolute right-3 top-3" />
                  <span className="absolute bottom-3 left-3 rounded-full bg-fg px-3 py-1 text-sm font-semibold text-bg tabular">{f.money(top.pricePln)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 px-2 pb-1.5 pt-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{top.name}</p>
                    <p className="text-[0.8125rem] text-muted">
                      {f.category(top.category)}, {top.batch.toLowerCase()}
                    </p>
                  </div>
                  <a
                    href={f.buyUrl(top.source)}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="grid size-10 shrink-0 place-items-center rounded-full bg-brand text-white transition-colors hover:bg-brand-bright"
                  >
                    <ArrowUpRight aria-hidden size={17} />
                    <span className="sr-only">
                      {t("card.buy", { agent: f.agent.name })}: {top.name} {t("newTab")}
                    </span>
                  </a>
                </div>
              </article>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
