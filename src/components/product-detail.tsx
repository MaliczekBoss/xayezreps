"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, ShoppingBag } from "lucide-react";
import { agents, platformLabel, sourceUrl } from "@/lib/agents";
import type { Find } from "@/lib/finds";
import { haulActions, shippingCost, useHaul, withPackaging } from "@/lib/haul";
import { useFormat } from "@/lib/use-format";
import { Carousel } from "./carousel";
import { Lightbox } from "./lightbox";
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

const COLOR_LIMIT = 13;

const option = (active: boolean) =>
  `inline-flex h-10 min-w-11 items-center justify-center rounded-lg border px-3 text-sm transition-colors ${
    active ? "border-fg text-fg" : "border-line text-muted hover:border-line-strong hover:text-fg"
  }`;

export function ProductDetail({ find, related }: { find: Find; related: Find[] }) {
  const f = useFormat();
  const { t } = f;
  const haul = useHaul();
  const inHaul = Boolean(haul.items[find.id]);
  const link = sourceUrl(find.source);

  const [details, setDetails] = useState<ItemDetails | null>(null);
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const [active, setActive] = useState(find.image);
  const [zoom, setZoom] = useState<number | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [allColors, setAllColors] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/item?url=${encodeURIComponent(link)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.item && setDetails(d.item))
      .catch(() => {});
    return () => ctrl.abort();
  }, [link]);

  // Zdjęcie z findu, zdjęcia sklepu i kilka z opisu (tabele rozmiarów); bez tych, które się nie wczytały
  const gallery = useMemo(() => {
    const all = [find.image, ...(details?.images ?? []), ...(details?.descriptionImages ?? []).slice(0, 4)];
    return [...new Set(all)].filter((src) => !failed.has(src)).slice(0, 12);
  }, [find.image, details, failed]);

  const markFailed = (src: string) => {
    setFailed((prev) => new Set(prev).add(src));
    if (src === active) setActive(find.image);
  };

  // Druga waluta obok głównej ceny: euro przy złotówkach, złotówki przy innych walutach
  const secondary =
    f.settings.currency === "PLN"
      ? new Intl.NumberFormat(f.locale, { style: "currency", currency: "EUR" }).format(find.pricePln * f.rates.EUR)
      : new Intl.NumberFormat(f.locale, { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(find.pricePln);

  const dateFmt = new Intl.DateTimeFormat(f.locale, { day: "numeric", month: "long", year: "numeric" });
  const shipping = shippingCost(withPackaging(find.weightGrams), "standard");
  const range = details?.priceRangeCny;
  const colors = details?.colors ?? [];
  const shownColors = allColors || colors.length <= COLOR_LIMIT + 1 ? colors : colors.slice(0, COLOR_LIMIT);

  const facts: [string, ReactNode][] = [
    ...(details?.seller ? [[t("product.seller"), details.seller] as [string, string]] : []),
    ...(range ? [[t("product.sourcePrice"), range[0] === range[1] ? `¥${range[0]}` : `¥${range[0]}–${range[1]}`] as [string, string]] : []),
    ...(details?.domesticShipCny ? [[t("qcf.domestic"), `¥${details.domesticShipCny}`] as [string, string]] : []),
    [t("product.weight"), `≈ ${f.weight(find.weightGrams, "g")}`],
    [
      t("product.shipping"),
      <Link key="ship" href="/tools/ship" className="underline decoration-line-strong underline-offset-4 hover:decoration-fg">
        ≈ {f.money(shipping)}
      </Link>,
    ],
    [
      t("product.source"),
      <a key="src" href={link} target="_blank" rel="noopener noreferrer" className="underline decoration-line-strong underline-offset-4 hover:decoration-fg">
        {platformLabel[find.source.platform]}
      </a>,
    ],
    [t("product.added"), dateFmt.format(new Date(find.createdAt))],
    [t("product.views"), String(find.views)],
  ];

  return (
    <>
      <Breadcrumbs
        items={[
          { label: t("footer.finds"), href: "/finds" },
          { label: f.category(find.category), href: `/finds?category=${encodeURIComponent(find.category)}` },
          { label: find.name },
        ]}
      />

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14">
        {/* Galeria: miniatury z boku na komputerze, pod spodem na telefonie */}
        <div className="flex flex-col gap-3 lg:sticky lg:top-24 lg:flex-row-reverse">
          <button
            type="button"
            onClick={() => setZoom(Math.max(0, gallery.indexOf(active)))}
            className="relative aspect-square w-full cursor-zoom-in overflow-hidden rounded-2xl bg-card"
          >
            <ProductImage src={active} alt={find.name} sizes="(min-width: 1024px) 34rem, 100vw" preload onError={() => markFailed(active)} />
            <span className="sr-only">{t("product.zoom")}</span>
          </button>
          {gallery.length > 1 && (
            <ul className="-mx-4 flex shrink-0 gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 lg:max-h-[34rem] lg:w-[4.5rem] lg:flex-col lg:overflow-y-auto">
              {gallery.map((src, i) => (
                <li key={src} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setActive(src)}
                    aria-pressed={active === src}
                    className={`relative block size-16 overflow-hidden rounded-lg bg-card transition-opacity lg:size-[4.5rem] ${
                      active === src ? "opacity-100 ring-1 ring-fg ring-offset-2 ring-offset-bg" : "opacity-55 hover:opacity-100"
                    }`}
                  >
                    <ProductImage src={src} sizes="4.5rem" onError={() => markFailed(src)} />
                    <span className="sr-only">{t("qcf.photoOf", { i: i + 1, n: gallery.length })}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Informacje */}
        <div className="min-w-0">
          <p className="text-sm text-muted">
            <Link href={`/finds?category=${encodeURIComponent(find.category)}`} className="hover:text-fg">
              {f.category(find.category)}
            </Link>
            <span aria-hidden="true" className="mx-2 text-dim">
              /
            </span>
            <Link href={`/finds?batch=${encodeURIComponent(find.batch)}`} className="hover:text-fg">
              {find.batch}
            </Link>
          </p>
          <h1 className="mt-2 text-[clamp(1.875rem,4vw,2.75rem)] font-semibold leading-[1.08] tracking-[-0.03em] [overflow-wrap:anywhere]">{find.name}</h1>

          <p className="mt-4 flex flex-wrap items-baseline gap-x-3">
            <span className="text-[2rem] font-semibold tracking-[-0.03em] tabular">{f.money(find.pricePln)}</span>
            <span className="text-muted tabular">≈ {secondary}</span>
          </p>
          {details && !details.available && <p className="mt-2 text-sm font-medium text-amber-300">{t("product.unavailable")}</p>}

          {colors.length > 0 && (
            <fieldset className="mt-7">
              <legend className="text-sm text-muted">
                {t("product.color")}
                {color && <span className="ml-2 text-fg">{color}</span>}
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {shownColors.map((c) =>
                  c.image ? (
                    <button
                      key={c.name}
                      type="button"
                      aria-pressed={color === c.name}
                      title={c.name}
                      onClick={() => {
                        setColor(c.name);
                        setActive(c.image!);
                      }}
                      className={`relative size-14 overflow-hidden rounded-lg border transition-colors ${
                        color === c.name ? "border-fg" : "border-line hover:border-line-strong"
                      }`}
                    >
                      <Image src={c.image} alt="" fill sizes="3.5rem" unoptimized className="object-cover" />
                      <span className="sr-only">{c.name}</span>
                    </button>
                  ) : (
                    <button key={c.name} type="button" aria-pressed={color === c.name} onClick={() => setColor(c.name)} className={option(color === c.name)}>
                      {c.name}
                    </button>
                  ),
                )}
                {shownColors.length < colors.length && (
                  <button
                    type="button"
                    onClick={() => setAllColors(true)}
                    className="grid size-14 place-items-center rounded-lg border border-dashed border-line-strong text-sm font-semibold text-muted hover:border-fg hover:text-fg"
                  >
                    +{colors.length - shownColors.length}
                    <span className="sr-only">{t("product.allColors")}</span>
                  </button>
                )}
              </div>
            </fieldset>
          )}

          {details && details.sizes.length > 0 && (
            <fieldset className="mt-6">
              <legend className="text-sm text-muted">{t("product.size")}</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {details.sizes.map((s) => (
                  <button key={s} type="button" aria-pressed={size === s} onClick={() => setSize(s)} className={option(size === s)}>
                    {s}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <div className="mt-8 grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_auto]">
            <a
              href={f.buyUrl(find.source)}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="inline-flex h-13 items-center justify-center gap-2.5 rounded-full bg-brand px-6 font-semibold text-white transition-colors hover:bg-brand-bright"
            >
              <span className="relative size-5 overflow-hidden rounded bg-white/15">
                <Image src={f.agent.logo} alt="" fill sizes="1.25rem" className="object-contain p-px" />
              </span>
              {t("card.buy", { agent: f.agent.name })}
              <span className="sr-only">{t("newTab")}</span>
            </a>
            <button
              type="button"
              onClick={() => haulActions.toggle(find)}
              aria-pressed={inHaul}
              className={`inline-flex h-13 items-center justify-center gap-2 rounded-full border px-5 text-sm font-semibold transition-colors ${
                inHaul ? "border-brand text-brand-bright" : "border-line-strong text-fg hover:border-fg"
              }`}
            >
              {inHaul ? <Check aria-hidden size={17} strokeWidth={2.5} /> : <ShoppingBag aria-hidden size={17} />}
              {inHaul ? t("toggle.remove") : t("toggle.add")}
            </button>
          </div>

          <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="text-muted">{t("product.otherAgents")}</span>
            {agents
              .filter((a) => a.id !== f.agent.id)
              .map((a) => (
                <a
                  key={a.id}
                  href={a.productUrl(find.source)}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="inline-flex items-center gap-1.5 text-fg underline decoration-line-strong underline-offset-4 hover:decoration-fg"
                >
                  <span className="relative size-4 overflow-hidden rounded-sm">
                    <Image src={a.logo} alt="" fill sizes="1rem" className="object-contain" />
                  </span>
                  {a.name}
                </a>
              ))}
          </p>

          <dl className="mt-8 border-t border-line text-sm">
            {facts.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-6 border-b border-line py-3">
                <dt className="shrink-0 text-muted">{label}</dt>
                <dd className="min-w-0 truncate text-right tabular">{value}</dd>
              </div>
            ))}
          </dl>
          {!details && (
            <p className="mt-3 text-xs text-dim" aria-live="polite">
              {t("product.detailsLoading")}
            </p>
          )}
        </div>
      </div>

      <section aria-labelledby="qc-photos" className="mt-20">
        <QcGallery productUrl={link} titleId="qc-photos" />
      </section>

      {related.length > 0 && (
        <section aria-labelledby="related-title" className="mt-20">
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

      <Lightbox id="product-lightbox" photos={gallery} index={zoom} onIndex={setZoom} onClose={() => setZoom(null)} />
    </>
  );
}
