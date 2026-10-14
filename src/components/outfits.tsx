"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Camera, Check, Maximize2, ShoppingBag } from "lucide-react";
import { sourceUrl } from "@/lib/agents";
import { haulActions } from "@/lib/haul";
import { hasPoint, type OutfitGender, type OutfitSummary, type ResolvedOutfit } from "@/lib/outfits";
import { site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";
import { Carousel } from "./carousel";
import { FavoriteButton } from "./favorite-button";
import { HaulToggle } from "./haul-toggle";
import { Lightbox } from "./lightbox";
import { PageHeader } from "./page";
import { ProductImage } from "./product-image";
import { SectionTitle } from "./ui";

type Slot = "head" | "outer" | "top" | "bottom" | "feet" | "acc";

const slotOf = (category: string): Slot =>
  category === "Czapki"
    ? "head"
    : ["Kurtki", "Bluzy", "Komplety"].includes(category)
      ? "outer"
      : ["Koszulki", "Bielizna"].includes(category)
        ? "top"
        : ["Spodnie", "Spodenki", "Spódnice"].includes(category)
          ? "bottom"
          : category === "Buty"
            ? "feet"
            : "acc";

type Place = { x: number; y: number; w: number };

const SIDE: Place[] = [
  { x: 15, y: 36, w: 25 },
  { x: 85, y: 50, w: 25 },
  { x: 15, y: 62, w: 23 },
  { x: 85, y: 76, w: 22 },
  { x: 15, y: 84, w: 20 },
];

function layout(categories: string[]): Place[] {
  const taken = new Set<Slot>();
  const has = (slot: Slot) => categories.some((c) => slotOf(c) === slot);
  const both = has("outer") && has("top");
  let side = 0;
  return categories.map((c) => {
    const slot = slotOf(c);
    if (slot === "acc" || taken.has(slot)) return SIDE[side++ % SIDE.length];
    taken.add(slot);
    if (slot === "head") return { x: 50, y: 2, w: 22 };
    if (slot === "outer") return both ? { x: 42, y: 13, w: 46 } : { x: 50, y: 13, w: 48 };
    if (slot === "top") return both ? { x: 76, y: 22, w: 30 } : { x: 50, y: 13, w: 46 };
    if (slot === "bottom") return { x: 50, y: 43, w: 42 };
    return { x: 50, y: 75, w: 40 };
  });
}

function FlatLay({ items, numbered = false, active = null, onActive }: { items: { image: string; category: string }[]; numbered?: boolean; active?: number | null; onActive?: (i: number | null) => void }) {
  const places = layout(items.map((i) => i.category));
  return (
    <div className="absolute inset-0">
      {items.map((item, i) => (
        <span
          key={i}
          onMouseEnter={() => onActive?.(i)}
          onMouseLeave={() => onActive?.(null)}
          style={{ left: `${places[i].x}%`, top: `${places[i].y}%`, width: `${places[i].w}%` }}
          className={`absolute block aspect-square -translate-x-1/2 transition-transform duration-300 ${active === i ? "z-10 scale-[1.06]" : ""}`}
        >
          <ProductImage src={item.image} sizes="14rem" className="!object-contain" />
          {numbered && <Marker n={i + 1} active={active === i} className="absolute left-0 top-0" />}
        </span>
      ))}
    </div>
  );
}

const Marker = ({ n, active, className = "" }: { n: number; active: boolean; className?: string }) => (
  <span
    className={`grid size-7 place-items-center rounded-full border-2 text-xs font-bold shadow-[0_4px_14px_rgb(0_0_0/0.6)] transition-transform ${
      active ? "scale-125 border-fg bg-fg text-bg" : "border-white bg-black/70 text-white"
    } ${className}`}
  >
    {n}
  </span>
);

function OutfitCard({ outfit, index = 0 }: { outfit: OutfitSummary; index?: number }) {
  const f = useFormat();
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index, 12) * 0.04, ease: [0.2, 0.9, 0.25, 1] }}
    >
      <Link href={site.routes.outfit(outfit.id)} className="group block">
        <span className="relative block aspect-[4/5] overflow-hidden rounded-[10px] border border-line bg-black transition-colors group-hover:border-line-strong">
          {outfit.image ? (
            <ProductImage src={outfit.image} sizes="(min-width: 1024px) 18rem, (min-width: 768px) 30vw, 50vw" className="transition-transform duration-500 group-hover:scale-[1.04]" />
          ) : (
            <FlatLay items={outfit.items} />
          )}
          <span className="absolute left-2.5 top-2.5 rounded-[5px] bg-[#18181b]/85 px-[7px] py-[3px] text-[10px] uppercase leading-[15px] tracking-[1px] text-muted backdrop-blur">
            {f.t("outfits.parts", { n: outfit.items.length })}
          </span>
          <span className="absolute inset-x-0 bottom-0 flex translate-y-full gap-1.5 bg-gradient-to-t from-black/90 to-black/0 p-2.5 pt-8 transition-transform duration-300 group-hover:translate-y-0">
            {outfit.items.slice(0, 5).map((item, i) => (
              <span key={i} className="relative size-11 shrink-0">
                <ProductImage src={item.image} sizes="2.75rem" />
              </span>
            ))}
          </span>
        </span>
        <span className="mt-2.5 flex items-baseline justify-between gap-3">
          <span className="truncate text-[14.5px] font-medium first-letter:uppercase">{outfit.title}</span>
          <span className="shrink-0 font-mono text-[13px] tabular">{f.money(outfit.total)}</span>
        </span>
        <span className="mt-0.5 block text-[12.5px] text-muted">{f.t(outfit.gender === "girl" ? "outfits.girl" : "outfits.boy")}</span>
      </Link>
    </motion.div>
  );
}

export function OutfitsRow({ outfits }: { outfits: OutfitSummary[] }) {
  const { t } = useFormat();
  if (outfits.length === 0) return null;
  return (
    <section id="outfity" aria-labelledby="outfity-title" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <SectionTitle id="outfity-title" title={[t("rows.outfits"), ""]} href={site.routes.outfits} linkLabel={t("rows.seeAll")} />
      <Carousel label={t("rows.outfits")}>
        {outfits.map((o) => (
          <li key={o.id} className="w-[200px] shrink-0 snap-start sm:w-[230px] md:w-[250px]">
            <OutfitCard outfit={o} />
          </li>
        ))}
      </Carousel>
    </section>
  );
}

const PAGE = 24;

export function OutfitsIndex({ outfits }: { outfits: OutfitSummary[] }) {
  const { t } = useFormat();
  const [gender, setGender] = useState<OutfitGender | "">("");
  const [limit, setLimit] = useState(PAGE);
  const visible = useMemo(() => outfits.filter((o) => !gender || o.gender === gender), [outfits, gender]);
  const count = (g: OutfitGender | "") => (g ? outfits.filter((o) => o.gender === g).length : outfits.length);

  return (
    <>
      <PageHeader crumbs={[{ label: t("nav.outfits") }]} title={[t("outfits.title1"), t("outfits.title2")]} lead={t("outfits.lead")} />
      {outfits.length === 0 ? (
        <p className="border-y border-line py-8 text-muted">{t("outfits.empty")}</p>
      ) : (
        <>
          <div role="group" aria-label={t("outfits.filter")} className="mb-5 flex flex-wrap gap-2">
            {(["", "girl", "boy"] as const).map((g) => (
              <button
                key={g || "all"}
                type="button"
                aria-pressed={gender === g}
                onClick={() => {
                  setGender(g);
                  setLimit(PAGE);
                }}
                className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3.5 text-[0.8125rem] font-medium transition-colors ${
                  gender === g ? "border-fg bg-fg text-bg" : "border-line bg-card text-muted hover:border-line-strong hover:text-fg"
                }`}
              >
                {t(g === "girl" ? "outfits.girl" : g === "boy" ? "outfits.boy" : "outfits.all")}
                <span className="font-mono text-[0.6875rem] opacity-60 tabular">{count(g)}</span>
              </button>
            ))}
          </div>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 lg:grid-cols-4">
            {visible.slice(0, limit).map((o, i) => (
              <li key={o.id}>
                <OutfitCard outfit={o} index={i % PAGE} />
              </li>
            ))}
          </ul>
          {limit < visible.length && (
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={() => setLimit((l) => l + PAGE)}
                className="inline-flex h-11 items-center rounded-xl border border-line bg-card px-6 text-sm font-semibold hover:border-line-strong"
              >
                {t("outfits.loadMore")} ({visible.length - limit})
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

export function OutfitDetail({ outfit, more }: { outfit: ResolvedOutfit; more: OutfitSummary[] }) {
  const f = useFormat();
  const { t } = f;
  const reduce = useReducedMotion();
  const [active, setActive] = useState<number | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);
  const [added, setAdded] = useState(false);
  const total = outfit.parts.reduce((sum, p) => sum + p.find.pricePln, 0);
  const dateFmt = new Intl.DateTimeFormat(f.locale, { day: "numeric", month: "long", year: "numeric" });

  useEffect(() => {
    if (!added) return;
    const timer = window.setTimeout(() => setAdded(false), 2200);
    return () => window.clearTimeout(timer);
  }, [added]);

  const focusPart = (i: number) => {
    setActive(i);
    document.getElementById(`part-${i}`)?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <>
      <Link href={site.routes.outfits} className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg">
        <ArrowLeft aria-hidden size={15} />
        {t("outfit.back")}
      </Link>
      <motion.div initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="mt-4 text-[clamp(1.625rem,3vw,2.25rem)] font-semibold leading-tight tracking-[-0.025em] first-letter:uppercase">{outfit.title}</h1>
        <p className="mt-2 flex flex-wrap gap-2 text-[12px]">
          {[t(outfit.gender === "girl" ? "outfits.girl" : "outfits.boy"), t("outfits.parts", { n: outfit.parts.length }), dateFmt.format(new Date(outfit.createdAt))].map((chip) => (
            <span key={chip} className="rounded-md border border-line bg-card px-2 py-1 text-muted">
              {chip}
            </span>
          ))}
        </p>
      </motion.div>

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:gap-10">
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.2, 0.9, 0.25, 1] }}
          className="lg:sticky lg:top-24"
        >
          <div className="group relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-line bg-black">
            {outfit.image ? (
              <>
                <button type="button" onClick={() => setZoom(0)} className="absolute inset-0 cursor-zoom-in">
                  <ProductImage src={outfit.image} alt={outfit.title} sizes="(min-width: 1024px) 30rem, 100vw" preload className="transition-transform duration-700 group-hover:scale-[1.03]" />
                  <span className="sr-only">{t("outfit.zoom")}</span>
                </button>
                <span aria-hidden="true" className="pointer-events-none absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                  <Maximize2 size={15} />
                </span>
                {outfit.parts.map((p, i) =>
                  hasPoint(p) ? (
                    <button
                      key={i}
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onMouseLeave={() => setActive(null)}
                      onClick={() => focusPart(i)}
                      style={{ left: `${p.x}%`, top: `${p.y}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                    >
                      <Marker n={i + 1} active={active === i} />
                      <span className="sr-only">{p.label || p.find.name}</span>
                    </button>
                  ) : null,
                )}
              </>
            ) : (
              <FlatLay items={outfit.parts.map((p) => ({ image: p.find.image, category: p.find.category }))} numbered active={active} onActive={setActive} />
            )}
          </div>
        </motion.div>

        <section aria-labelledby="parts-title">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="parts-title" className="text-lg font-semibold">
              {t("outfit.partsTitle")}
            </h2>
            <span className="font-mono text-sm text-muted tabular">
              {t("outfit.total")}: <span className="text-fg">{f.money(total)}</span>
            </span>
          </div>
          <ol className="mt-3 space-y-3">
            {outfit.parts.map((p, i) => (
              <motion.li
                key={i}
                id={`part-${i}`}
                initial={reduce ? false : { opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.07, ease: [0.2, 0.9, 0.25, 1] }}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                className={`scroll-mt-28 rounded-xl border bg-card p-3 transition-colors ${active === i ? "border-fg" : "border-line"}`}
              >
                <div className="flex items-center gap-3">
                  <span aria-hidden="true" className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold transition-colors ${active === i ? "bg-fg text-bg" : "bg-white/10"}`}>
                    {i + 1}
                  </span>
                  <Link href={site.routes.product(p.find.id)} className="relative size-16 shrink-0">
                    <ProductImage src={p.find.image} sizes="4rem" className="transition-transform duration-300 hover:scale-105" />
                  </Link>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[10px] uppercase tracking-[1px] text-muted">
                      {p.label || f.category(p.find.category)}
                      <span className="ml-2 normal-case tracking-normal text-dim">{p.find.batch}</span>
                    </span>
                    <Link href={site.routes.product(p.find.id)} className="line-clamp-2 text-sm font-medium leading-snug hover:underline">
                      {p.find.name}
                    </Link>
                    <span className="mt-0.5 block font-mono text-[13px] tabular">{f.money(p.find.pricePln)}</span>
                  </span>
                  <span className="flex shrink-0 flex-col gap-1.5">
                    <FavoriteButton find={p.find} className="!border-line !bg-bg" />
                    <HaulToggle find={p.find} />
                  </span>
                </div>
                <div className="mt-3 flex items-end justify-between gap-3 border-t border-line pt-3">
                  <PartQc url={sourceUrl(p.find.source)} expected={p.find.qc} />
                  <a
                    href={f.buyUrl(p.find.source)}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="inline-flex h-9 shrink-0 items-center rounded-lg bg-fg px-3.5 text-[13px] font-medium text-bg transition-colors hover:bg-white"
                  >
                    {t("card.buy", { agent: f.agent.name })}
                    <span className="sr-only">
                      : {p.find.name}, {t("newTab")}
                    </span>
                  </a>
                </div>
              </motion.li>
            ))}
          </ol>

          <button
            type="button"
            onClick={() => {
              haulActions.addMany(outfit.parts.map((p) => p.find), t("outfit.added"));
              setAdded(true);
            }}
            className={`mt-4 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl text-sm font-medium transition-colors ${added ? "bg-gl text-white" : "bg-fg text-bg hover:bg-white"}`}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={added ? "done" : "add"}
                initial={reduce ? false : { y: 14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={reduce ? undefined : { y: -14, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="inline-flex items-center gap-2"
              >
                {added ? <Check aria-hidden size={17} strokeWidth={2.5} /> : <ShoppingBag aria-hidden size={16} />}
                {added ? t("outfit.addedShort") : `${t("outfit.addAll")} (${f.money(total)})`}
              </motion.span>
            </AnimatePresence>
          </button>
        </section>
      </div>

      {more.length > 0 && (
        <section aria-labelledby="more-outfits" className="mt-16">
          <SectionTitle id="more-outfits" title={[t("outfit.more"), ""]} href={site.routes.outfits} linkLabel={t("rows.seeAll")} />
          <Carousel label={t("outfit.more")}>
            {more.map((o) => (
              <li key={o.id} className="w-[200px] shrink-0 snap-start sm:w-[230px]">
                <OutfitCard outfit={o} />
              </li>
            ))}
          </Carousel>
        </section>
      )}

      {outfit.image && <Lightbox id="outfit-lightbox" photos={[outfit.image]} index={zoom} onIndex={setZoom} onClose={() => setZoom(null)} />}
    </>
  );
}

type QcState = { status: "loading" } | { status: "done"; photos: string[] } | { status: "error" };

function PartQc({ url, expected }: { url: string; expected?: number }) {
  const { t } = useFormat();
  const reduce = useReducedMotion();
  const [state, setState] = useState<QcState>({ status: "loading" });
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/qc?url=${encodeURIComponent(url)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => setState({ status: "done", photos: Array.isArray(d.photos) ? d.photos : [] }))
      .catch((e: unknown) => {
        if ((e as Error).name !== "AbortError") setState({ status: "error" });
      });
    return () => ctrl.abort();
  }, [url]);

  const photos = state.status === "done" ? state.photos : [];
  const shown = photos.slice(0, 6);

  return (
    <div className="min-w-0 flex-1">
      <p className="flex items-center gap-1.5 text-[12px] text-muted">
        <Camera aria-hidden size={13} />
        {state.status === "done"
          ? photos.length
            ? `${t("outfit.qc")} (${photos.length})`
            : t("outfit.qcNone")
          : state.status === "error"
            ? t("outfit.qcNone")
            : `${t("outfit.qc")}${expected ? ` (${expected})` : ""}…`}
      </p>
      {state.status === "loading" && Boolean(expected) && (
        <div aria-hidden="true" className="mt-2 flex animate-pulse gap-1.5">
          {Array.from({ length: Math.min(expected ?? 0, 6) }, (_, i) => (
            <span key={i} className="size-12 shrink-0 rounded-md bg-bg" />
          ))}
        </div>
      )}
      {shown.length > 0 && (
        <ul className="mt-2 flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
          {shown.map((src, i) => (
            <motion.li
              key={src}
              initial={reduce ? false : { opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, delay: i * 0.05 }}
              className="shrink-0"
            >
              <button type="button" onClick={() => setOpen(i)} className="relative block size-12 cursor-zoom-in overflow-hidden rounded-md border border-line bg-bg">
                <ProductImage src={src} sizes="3rem" />
                {i === shown.length - 1 && photos.length > shown.length && (
                  <span className="absolute inset-0 grid place-items-center bg-black/60 text-[11px] font-semibold text-white">+{photos.length - shown.length}</span>
                )}
                <span className="sr-only">{t("qcf.photoOf", { i: i + 1, n: photos.length })}</span>
              </button>
            </motion.li>
          ))}
        </ul>
      )}
      <Lightbox id={`qc-${url.slice(-12)}`} photos={photos} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />
    </div>
  );
}
