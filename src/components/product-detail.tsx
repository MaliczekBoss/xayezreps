"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, BadgeCheck, Check, Eye, ShieldCheck, ShoppingBag, Store } from "lucide-react";
import { agents, platformLabel, sourceUrl } from "@/lib/agents";
import type { Find } from "@/lib/finds";
import { haulActions, useHaul } from "@/lib/haul";
import { useFormat } from "@/lib/use-format";
import { Carousel } from "./carousel";
import { Breadcrumbs } from "./page";
import { ProductCard } from "./product-card";
import { ProductImage } from "./product-image";
import { QcGallery } from "./qc-gallery";
import { SectionTitle } from "./ui";

type ItemDetails = {
  title: string;
  priceCny: number;
  domesticShipCny: number;
  images: string[];
  descriptionImages: string[];
  available: boolean;
  seller: string | null;
  colors: { name: string; image?: string }[];
  sizes: string[];
  priceRangeCny: [number, number];
  qcCount: number;
};

const chip = (active: boolean) =>
  `inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-sm transition-colors ${
    active ? "border-brand bg-brand/15 text-fg" : "border-line bg-card text-muted hover:border-line-strong hover:text-fg"
  }`;

export function ProductDetail({ find, related }: { find: Find; related: Find[] }) {
  const f = useFormat();
  const { t } = f;
  const haul = useHaul();
  const inHaul = Boolean(haul.items[find.id]);
  const link = sourceUrl(find.source);

  const [details, setDetails] = useState<ItemDetails | null>(null);
  const [active, setActive] = useState(find.image);
  const [color, setColor] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/item?url=${encodeURIComponent(link)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.item && setDetails(d.item))
      .catch(() => {});
    return () => ctrl.abort();
  }, [link]);

  const gallery = useMemo(() => {
    const all = [find.image, ...(details?.images ?? []), ...(details?.descriptionImages ?? []).slice(0, 4)];
    return [...new Set(all)].slice(0, 9);
  }, [find.image, details]);

  // Druga waluta obok głównej ceny, jak na xayezreps.com
  const secondary =
    f.settings.currency === "PLN"
      ? new Intl.NumberFormat(f.locale, { style: "currency", currency: "EUR" }).format(find.pricePln * f.rates.EUR)
      : new Intl.NumberFormat(f.locale, { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(find.pricePln);

  const otherAgents = agents.filter((a) => a.id !== f.agent.id);
  const dateFmt = new Intl.DateTimeFormat(f.locale, { day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <Breadcrumbs items={[{ label: t("footer.finds"), href: "/finds" }, { label: find.name }]} />

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
        {/* Galeria */}
        <div className="lg:sticky lg:top-28">
          <div className="relative aspect-square overflow-hidden rounded-[1.75rem] border border-line bg-card">
            <ProductImage src={active} alt={find.name} sizes="(min-width: 1024px) 34rem, 100vw" preload />
            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-gl/40 bg-black/70 px-2.5 py-1 text-xs font-semibold text-gl backdrop-blur">
              <BadgeCheck aria-hidden size={14} />
              {t("product.qcVerified")}
            </span>
          </div>
          {gallery.length > 1 && (
            <ul className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
              {gallery.map((src, i) => (
                <li key={src}>
                  <button
                    type="button"
                    onClick={() => setActive(src)}
                    aria-pressed={active === src}
                    className={`relative block aspect-square w-full overflow-hidden rounded-xl border-2 bg-card transition-colors ${
                      active === src ? "border-brand" : "border-transparent hover:border-line-strong"
                    }`}
                  >
                    <ProductImage src={src} sizes="6rem" />
                    <span className="sr-only">{t("qcf.photoOf", { i: i + 1, n: gallery.length })}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Informacje */}
        <div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-brand/40 bg-brand/15 px-3 py-1 text-xs font-semibold text-brand-bright">{find.batch}</span>
            <span className="rounded-full border border-line bg-card px-3 py-1 text-xs text-muted">{f.category(find.category)}</span>
          </div>
          <h1 className="mt-4 text-[clamp(2rem,4vw,2.75rem)] font-semibold leading-[1.08] tracking-[-0.03em]">{find.name}</h1>

          <p className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-[2.25rem] font-bold tracking-[-0.03em] tabular">{f.money(find.pricePln)}</span>
            <span className="font-mono text-sm text-muted tabular">≈ {secondary}</span>
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Eye aria-hidden size={15} />
              {find.views} {t("card.views")}
            </span>
            <span>
              {t("product.added")}: {dateFmt.format(new Date(find.createdAt))}
            </span>
          </p>

          {/* Sprzedawca */}
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-line bg-card p-3.5">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand-bright">
              <Store aria-hidden size={19} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{details?.seller ?? t("product.store", { platform: platformLabel[find.source.platform] })}</p>
              <p className="text-xs text-muted">
                {details
                  ? `${t("product.sourcePrice")}: ${
                      details.priceRangeCny[0] === details.priceRangeCny[1]
                        ? `¥${details.priceRangeCny[0]}`
                        : `¥${details.priceRangeCny[0]}–${details.priceRangeCny[1]}`
                    }`
                  : t("product.detailsLoading")}
              </p>
            </div>
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full border border-line px-3 text-xs font-medium text-muted hover:text-fg"
            >
              {t("product.openSource")}
              <ArrowUpRight aria-hidden size={13} />
            </a>
          </div>

          {/* Warianty */}
          {details && details.colors.length > 0 && (
            <fieldset className="mt-6">
              <legend className="text-sm font-semibold">{t("product.colors")}</legend>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {details.colors.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    aria-pressed={color === c.name}
                    onClick={() => {
                      setColor(c.name);
                      if (c.image) setActive(c.image);
                    }}
                    className={chip(color === c.name)}
                  >
                    {c.image && (
                      <span className="relative size-6 overflow-hidden rounded-md bg-bg">
                        <Image src={c.image} alt="" fill sizes="1.5rem" unoptimized className="object-cover" />
                      </span>
                    )}
                    {c.name}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          {details && details.sizes.length > 0 && (
            <fieldset className="mt-5">
              <legend className="text-sm font-semibold">{t("product.sizes")}</legend>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {details.sizes.map((s) => (
                  <button key={s} type="button" aria-pressed={size === s} onClick={() => setSize(s)} className={`${chip(size === s)} min-w-12 justify-center`}>
                    {s}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          {details && (
            <p className={`mt-5 inline-flex items-center gap-2 text-sm font-medium ${details.available ? "text-gl" : "text-amber-300"}`}>
              <span aria-hidden="true" className={`size-2 rounded-full ${details.available ? "bg-gl" : "bg-amber-300"}`} />
              {details.available ? t("product.available") : t("product.unavailable")}
            </p>
          )}

          {/* Zakup */}
          <div className="mt-5 flex gap-2.5">
            <a
              href={f.buyUrl(find.source)}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="inline-flex h-14 flex-1 items-center justify-center gap-2.5 rounded-full bg-[linear-gradient(180deg,#60a5fa,#3b82f6_55%,#2563eb)] font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_14px_40px_-12px_rgb(59_130_246/0.8)] transition-[filter] hover:brightness-110"
            >
              <span className="relative size-6 overflow-hidden rounded-md bg-black/30">
                <Image src={f.agent.logo} alt="" fill sizes="1.5rem" className="object-contain p-0.5" />
              </span>
              {t("card.buy", { agent: f.agent.name })}
              <ArrowUpRight aria-hidden size={17} />
              <span className="sr-only">{t("newTab")}</span>
            </a>
            <button
              type="button"
              onClick={() => haulActions.toggle(find)}
              aria-pressed={inHaul}
              title={inHaul ? t("toggle.remove") : t("toggle.add")}
              className={`grid size-14 shrink-0 place-items-center rounded-full border transition-colors ${
                inHaul ? "border-brand bg-brand text-white" : "border-line bg-card text-fg hover:border-brand/60"
              }`}
            >
              {inHaul ? <Check aria-hidden size={20} strokeWidth={2.5} /> : <ShoppingBag aria-hidden size={20} />}
              <span className="sr-only">{inHaul ? t("toggle.removeSr", { name: find.name }) : t("toggle.addSr", { name: find.name })}</span>
            </button>
          </div>

          <p className="mt-4 text-xs text-muted">{t("product.agentsText")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {otherAgents.map((a) => (
              <a
                key={a.id}
                href={a.productUrl(find.source)}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-card pl-1.5 pr-3 text-[0.8125rem] text-muted transition-colors hover:border-line-strong hover:text-fg"
              >
                <span className="relative size-6 overflow-hidden rounded-full bg-black/40">
                  <Image src={a.logo} alt="" fill sizes="1.5rem" className="object-contain p-0.5" />
                </span>
                {a.name}
                <ArrowUpRight aria-hidden size={12} />
              </a>
            ))}
          </div>

          <div className="mt-6 flex gap-3 rounded-2xl border border-gl/25 bg-gl/[0.06] p-4">
            <ShieldCheck aria-hidden size={19} className="mt-0.5 shrink-0 text-gl" />
            <div>
              <p className="text-sm font-semibold">{t("product.qcVerified")}</p>
              <p className="mt-1 text-sm text-muted">{t("product.qcVerifiedText")}</p>
            </div>
          </div>

          {/* Szczegóły */}
          <dl className="mt-6 divide-y divide-line rounded-2xl border border-line bg-card text-sm">
            {[
              [t("product.category"), f.category(find.category)],
              [t("product.batch"), find.batch],
              [t("product.weight"), `≈ ${f.weight(find.weightGrams, "g")}`],
              [t("product.source"), `${platformLabel[find.source.platform]} #${find.source.id}`],
              ...(details?.domesticShipCny ? [[t("qcf.domestic"), `¥${details.domesticShipCny}`]] : []),
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 px-4 py-3">
                <dt className="text-muted">{label}</dt>
                <dd className="text-right font-medium tabular">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Zdjęcia QC */}
      <section aria-labelledby="qc-photos" className="mt-16">
        <QcGallery productUrl={link} titleId="qc-photos" />
      </section>

      {/* Podobne */}
      {related.length > 0 && (
        <section aria-labelledby="related-title" className="mt-16">
          <SectionTitle id="related-title" title={[t("product.related1"), t("product.related2")]} count={related.length} />
          <Carousel label={`${t("product.related1")} ${t("product.related2")}`}>
            {related.map((item) => (
              <li key={item.id} className="w-[70%] shrink-0 snap-start min-[480px]:w-[44%] md:w-[31%] lg:w-[calc((100%-3rem)/4.25)]">
                <ProductCard find={item} />
              </li>
            ))}
          </Carousel>
        </section>
      )}
    </>
  );
}
