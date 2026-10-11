"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Check, ChevronDown, Eye, Link2, Package, Scale, ShoppingBag, Store, Truck } from "lucide-react";
import { agents, platformLabel, sourceUrl } from "@/lib/agents";
import { copyWithNotice } from "@/lib/clipboard";
import type { Find } from "@/lib/finds";
import { haulActions, shippingCost, useHaul, withPackaging } from "@/lib/haul";
import { site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";
import { Carousel, cardSlot } from "./carousel";
import { Lightbox } from "./lightbox";
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

const chip = (active: boolean) =>
  `inline-flex h-8 min-w-10 items-center justify-center rounded-md border px-2.5 text-[13px] font-medium transition-colors ${
    active ? "border-fg bg-fg text-bg" : "border-line bg-card text-muted hover:border-line-strong hover:text-fg"
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

  const secondary =
    f.settings.currency === "PLN"
      ? new Intl.NumberFormat(f.locale, { style: "currency", currency: "EUR" }).format(find.pricePln * f.rates.EUR)
      : new Intl.NumberFormat(f.locale, { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(find.pricePln);

  const colors = details?.colors ?? [];
  const shownColors = allColors || colors.length <= COLOR_LIMIT + 1 ? colors : colors.slice(0, COLOR_LIMIT);
  const range = details?.priceRangeCny;
  const dateFmt = new Intl.DateTimeFormat(f.locale, { day: "numeric", month: "long", year: "numeric" });

  const stats: { icon: ReactNode; label: string; value: string }[] = [
    { icon: <Scale aria-hidden size={14} />, label: t("product.weight"), value: `≈ ${f.weight(find.weightGrams, "g")}` },
    { icon: <Truck aria-hidden size={14} />, label: t("product.delivery"), value: `≈ ${f.money(shippingCost(withPackaging(find.weightGrams), "standard"))}` },
    { icon: <Package aria-hidden size={14} />, label: t("qcf.domestic"), value: details ? (details.domesticShipCny ? `¥${details.domesticShipCny}` : "–") : "…" },
    { icon: <Eye aria-hidden size={14} />, label: t("product.views"), value: String(find.views) },
  ];

  const description: [string, ReactNode][] = [
    [t("product.category"), f.category(find.category)],
    [t("product.batch"), find.batch],
    ...(details?.seller ? [[t("product.seller"), details.seller] as [string, string]] : []),
    ...(range ? [[t("product.sourcePrice"), range[0] === range[1] ? `¥${range[0]}` : `¥${range[0]}–${range[1]}`] as [string, string]] : []),
    [
      t("product.source"),
      <a key="src" href={link} target="_blank" rel="noopener noreferrer" className="underline decoration-line-strong underline-offset-4 hover:decoration-fg">
        {platformLabel[find.source.platform]} #{find.source.id}
      </a>,
    ],
    [t("product.added"), dateFmt.format(new Date(find.createdAt))],
  ];

  return (
    <>
      <Link href={site.routes.finds} className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg">
        <ArrowLeft aria-hidden size={15} />
        {t("product.back")}
      </Link>

      <div className="mt-5 grid items-start gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10">
        {/* Galeria */}
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => setZoom(Math.max(0, gallery.indexOf(active)))}
            className="relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-xl border border-line bg-[#1c1c1f]"
          >
            <ProductImage src={active} alt={find.name} sizes="(min-width: 768px) 30rem, 100vw" preload onError={() => markFailed(active)} />
            <span className="sr-only">{t("product.zoom")}</span>
          </button>
          {gallery.length > 1 && (
            <ul className="-mx-4 mt-2.5 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
              {gallery.map((src, i) => (
                <li key={src} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setActive(src)}
                    aria-pressed={active === src}
                    className={`relative block size-14 overflow-hidden rounded-lg border bg-[#1c1c1f] transition-colors ${
                      active === src ? "border-fg" : "border-line opacity-60 hover:opacity-100"
                    }`}
                  >
                    <ProductImage src={src} sizes="3.5rem" onError={() => markFailed(src)} />
                    <span className="sr-only">{t("qcf.photoOf", { i: i + 1, n: gallery.length })}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Informacje */}
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[13px] text-muted">
            <Store aria-hidden size={14} />
            {details?.seller ?? t("product.store", { platform: platformLabel[find.source.platform] })}
          </p>
          <h1 className="mt-2 text-[clamp(1.375rem,2.4vw,1.75rem)] font-semibold leading-tight tracking-[-0.02em] [overflow-wrap:anywhere]">{find.name}</h1>

          {details && details.sizes.length > 0 && (
            <fieldset className="mt-4">
              <legend className="sr-only">{t("product.size")}</legend>
              <div className="flex flex-wrap gap-1.5">
                {details.sizes.map((s) => (
                  <button key={s} type="button" aria-pressed={size === s} onClick={() => setSize(s)} className={chip(size === s)}>
                    {s}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {colors.length > 0 && (
            <fieldset className="mt-4">
              <legend className="text-[13px] text-muted">
                {t("product.color")}
                {color && <span className="ml-2 text-fg">{color}</span>}
              </legend>
              <div className="mt-2 flex flex-wrap gap-1.5">
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
                      className={`relative size-11 overflow-hidden rounded-md border transition-colors ${color === c.name ? "border-fg" : "border-line hover:border-line-strong"}`}
                    >
                      <Image src={c.image} alt="" fill sizes="2.75rem" unoptimized className="object-cover" />
                      <span className="sr-only">{c.name}</span>
                    </button>
                  ) : (
                    <button key={c.name} type="button" aria-pressed={color === c.name} onClick={() => setColor(c.name)} className={chip(color === c.name)}>
                      {c.name}
                    </button>
                  ),
                )}
                {shownColors.length < colors.length && (
                  <button
                    type="button"
                    onClick={() => setAllColors(true)}
                    className="grid size-11 place-items-center rounded-md border border-dashed border-line-strong text-[13px] font-semibold text-muted hover:border-fg hover:text-fg"
                  >
                    +{colors.length - shownColors.length}
                    <span className="sr-only">{t("product.allColors")}</span>
                  </button>
                )}
              </div>
            </fieldset>
          )}

          <p className="mt-5 flex flex-wrap items-baseline gap-x-3">
            <span className="font-mono text-[1.625rem] font-medium tabular">{f.money(find.pricePln)}</span>
            <span className="text-sm text-muted tabular">≈ {secondary}</span>
          </p>
          {details && !details.available && <p className="mt-1 text-sm font-medium text-amber-300">{t("product.unavailable")}</p>}

          <div className="mt-4 flex flex-wrap gap-2">
            <AgentButton find={find} />
            <button
              type="button"
              onClick={() => haulActions.toggle(find)}
              aria-pressed={inHaul}
              className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3.5 text-sm font-medium transition-colors ${
                inHaul ? "border-fg text-fg" : "border-line bg-card text-muted hover:border-line-strong hover:text-fg"
              }`}
            >
              {inHaul ? <Check aria-hidden size={16} strokeWidth={2.5} /> : <ShoppingBag aria-hidden size={16} />}
              {inHaul ? t("toggle.remove") : t("toggle.add")}
            </button>
            <button
              type="button"
              onClick={() => copyWithNotice(`${site.url}${site.routes.product(find.id)}`, { title: t("product.linkCopied"), text: find.name, image: find.image })}
              title={t("product.copyLink")}
              className="grid size-10 place-items-center rounded-lg border border-line bg-card text-muted transition-colors hover:border-line-strong hover:text-fg"
            >
              <Link2 aria-hidden size={16} />
              <span className="sr-only">{t("product.copyLink")}</span>
            </button>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="bg-card px-4 py-3">
                <dt className="flex items-center gap-1.5 text-xs text-muted">
                  {s.icon}
                  {s.label}
                </dt>
                <dd className="mt-1 font-semibold tabular">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <details className="group mt-10 border-y border-line" open>
        <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-lg font-semibold [&::-webkit-details-marker]:hidden">
          {t("product.description")}
          <ChevronDown aria-hidden size={18} className="text-muted transition-transform group-open:rotate-180" />
        </summary>
        <dl className="grid gap-x-10 pb-5 text-sm sm:grid-cols-2">
          {description.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-6 border-t border-line/60 py-2.5">
              <dt className="text-muted">{label}</dt>
              <dd className="min-w-0 truncate text-right">{value}</dd>
            </div>
          ))}
        </dl>
      </details>

      <section aria-labelledby="qc-photos" className="mt-10">
        <QcGallery productUrl={link} titleId="qc-photos" />
      </section>

      {related.length > 0 && (
        <section aria-labelledby="related-title" className="mt-14">
          <SectionTitle id="related-title" title={[t("product.similar"), ""]} />
          <Carousel label={t("product.similar")}>
            {related.map((item) => (
              <li key={item.id} className={cardSlot}>
                <ProductCard find={item} />
              </li>
            ))}
          </Carousel>
          <Link
            href={`${site.routes.finds}?category=${encodeURIComponent(find.category)}`}
            className="mt-4 flex h-11 items-center justify-center rounded-xl border border-line bg-card text-sm font-medium text-muted transition-colors hover:border-line-strong hover:text-fg"
          >
            {t("product.moreLikeThis")}
          </Link>
        </section>
      )}

      <Lightbox id="product-lightbox" photos={gallery} index={zoom} onIndex={setZoom} onClose={() => setZoom(null)} />
    </>
  );
}

/** Biały przycisk „Zobacz produkt” u wybranego agenta, ze strzałką do wyboru innego agenta */
function AgentButton({ find }: { find: Find }) {
  const f = useFormat();
  const { t } = f;
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative flex">
      <a
        href={f.buyUrl(find.source)}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="inline-flex h-10 items-center gap-2 rounded-l-lg bg-fg pl-3 pr-3.5 text-sm font-medium text-bg transition-colors hover:bg-white"
      >
        <span className="relative size-5 overflow-hidden rounded bg-black/80">
          <Image src={f.agent.logo} alt="" fill sizes="1.25rem" className="object-contain p-px" />
        </span>
        {t("product.seeProduct")}
        <span className="sr-only">
          : {f.agent.name}, {t("newTab")}
        </span>
      </a>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="grid h-10 w-9 place-items-center rounded-r-lg border-l border-bg/15 bg-fg text-bg transition-colors hover:bg-white"
      >
        <ChevronDown aria-hidden size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        <span className="sr-only">{t("product.chooseAgent")}</span>
      </button>
      {open && (
        <ul role="menu" className="absolute left-0 top-[calc(100%+0.375rem)] z-30 min-w-full rounded-xl border border-line-strong bg-[#18181b] p-1.5 shadow-[0_24px_48px_-16px_rgb(0_0_0/0.9)]">
          {agents.map((a) => (
            <li key={a.id} role="none">
              <a
                role="menuitem"
                href={a.productUrl(find.source)}
                target="_blank"
                rel="noopener noreferrer sponsored"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-sm text-muted hover:bg-white/[0.06] hover:text-fg"
              >
                <span className="relative size-6 overflow-hidden rounded-md bg-black/60">
                  <Image src={a.logo} alt="" fill sizes="1.5rem" className="object-contain p-0.5" />
                </span>
                {a.name}
                {a.id === f.agent.id && <Check aria-hidden size={14} className="ml-auto text-fg" />}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
