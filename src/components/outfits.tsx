"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { haulActions } from "@/lib/haul";
import type { ResolvedOutfit } from "@/lib/outfits";
import { site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";
import { Carousel } from "./carousel";
import { FavoriteButton } from "./favorite-button";
import { HaulToggle } from "./haul-toggle";
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

// Miejsca po bokach sylwetki na dodatki i nadmiarowe rzeczy
const SIDE: Place[] = [
  { x: 15, y: 36, w: 25 },
  { x: 85, y: 50, w: 25 },
  { x: 15, y: 62, w: 23 },
  { x: 85, y: 76, w: 22 },
  { x: 15, y: 84, w: 20 },
];

/** Rozkład flat lay: czapka u góry, kurtka/bluza, spodnie, buty na dole, dodatki po bokach (x, y, szerokość w % planszy) */
function layout(parts: ResolvedOutfit["parts"]): Place[] {
  const taken = new Set<Slot>();
  const has = (slot: Slot) => parts.some((p) => slotOf(p.find.category) === slot);
  const both = has("outer") && has("top");
  let side = 0;
  return parts.map((p) => {
    const slot = slotOf(p.find.category);
    if (slot === "acc" || taken.has(slot)) return SIDE[side++ % SIDE.length];
    taken.add(slot);
    if (slot === "head") return { x: 50, y: 2, w: 22 };
    if (slot === "outer") return both ? { x: 42, y: 13, w: 46 } : { x: 50, y: 13, w: 48 };
    if (slot === "top") return both ? { x: 76, y: 22, w: 30 } : { x: 50, y: 13, w: 46 };
    if (slot === "bottom") return { x: 50, y: 43, w: 42 };
    return { x: 50, y: 75, w: 40 };
  });
}

type BoardProps = {
  outfit: ResolvedOutfit;
  sizes: string;
  /** Numery części na planszy (strona outfitu) */
  numbered?: boolean;
  active?: number | null;
  onActive?: (i: number | null) => void;
  onPick?: (i: number) => void;
};

/** Okładka outfitu: zdjęcie stylizacji z punktami albo flat lay z rzeczy na czarnej planszy */
function OutfitBoard({ outfit, sizes, numbered = false, active = null, onActive, onPick }: BoardProps) {
  const marker = (i: number) =>
    `grid size-7 place-items-center rounded-full border-2 text-xs font-bold shadow-[0_4px_14px_rgb(0_0_0/0.6)] transition-transform ${
      active === i ? "scale-125 border-fg bg-fg text-bg" : "border-white bg-black/70 text-white"
    }`;

  if (outfit.image) {
    return (
      <>
        <ProductImage src={outfit.image} alt="" sizes={sizes} />
        {numbered &&
          outfit.parts.map((p, i) => (
            <button
              key={i}
              type="button"
              onMouseEnter={() => onActive?.(i)}
              onMouseLeave={() => onActive?.(null)}
              onFocus={() => onActive?.(i)}
              onClick={() => onPick?.(i)}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 ${marker(i)}`}
            >
              {i + 1}
              <span className="sr-only">{p.label || p.find.name}</span>
            </button>
          ))}
      </>
    );
  }

  const places = layout(outfit.parts);
  return (
    <div className="absolute inset-0 bg-black">
      {outfit.parts.map((p, i) => {
        const place = places[i];
        const Item = numbered ? "button" : "span";
        return (
          <Item
            key={i}
            {...(numbered
              ? { type: "button" as const, onMouseEnter: () => onActive?.(i), onMouseLeave: () => onActive?.(null), onFocus: () => onActive?.(i), onClick: () => onPick?.(i) }
              : {})}
            style={{ left: `${place.x}%`, top: `${place.y}%`, width: `${place.w}%` }}
            className={`absolute block aspect-square -translate-x-1/2 transition-transform duration-300 ${active === i ? "z-10 scale-[1.06]" : ""}`}
          >
            <ProductImage src={p.find.image} sizes="14rem" className="!object-contain" />
            {numbered && <span className={`absolute left-0 top-0 ${marker(i)}`}>{i + 1}</span>}
            {numbered && <span className="sr-only">{p.label || p.find.name}</span>}
          </Item>
        );
      })}
    </div>
  );
}

function OutfitCard({ outfit }: { outfit: ResolvedOutfit }) {
  const f = useFormat();
  const total = outfit.parts.reduce((sum, p) => sum + p.find.pricePln, 0);
  return (
    <Link href={site.routes.outfit(outfit.id)} className="group block">
      <span className="relative block aspect-[4/5] overflow-hidden rounded-[10px] border border-line bg-black transition-colors group-hover:border-line-strong">
        <OutfitBoard outfit={outfit} sizes="(min-width: 768px) 16rem, 60vw" />
        <span className="absolute bottom-2.5 left-2.5 rounded-[5px] bg-[#18181b]/85 px-[7px] py-[3px] text-[10px] uppercase leading-[15px] tracking-[1px] text-muted backdrop-blur">
          {f.t("outfits.parts", { n: outfit.parts.length })}
        </span>
      </span>
      <span className="mt-2.5 flex items-baseline justify-between gap-3">
        <span className="truncate text-[14.5px] font-medium">{outfit.title}</span>
        <span className="shrink-0 font-mono text-[13px] tabular">{f.money(total)}</span>
      </span>
      <span className="mt-0.5 block truncate text-[12.5px] text-muted">{outfit.author}</span>
    </Link>
  );
}

export function OutfitsRow({ outfits }: { outfits: ResolvedOutfit[] }) {
  const { t } = useFormat();
  if (outfits.length === 0) return null;
  return (
    <section id="outfity" aria-labelledby="outfity-title" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <SectionTitle id="outfity-title" title={[t("rows.outfits"), ""]} href={site.routes.outfits} linkLabel={t("rows.seeAll")} />
      <Carousel label={t("rows.outfits")}>
        {outfits.map((o) => (
          <li key={o.id} className="w-[200px] shrink-0 snap-start sm:w-[240px] md:w-[260px]">
            <OutfitCard outfit={o} />
          </li>
        ))}
      </Carousel>
    </section>
  );
}

export function OutfitsIndex({ outfits }: { outfits: ResolvedOutfit[] }) {
  const { t } = useFormat();
  return (
    <>
      <PageHeader crumbs={[{ label: t("nav.outfits") }]} title={[t("outfits.title1"), t("outfits.title2")]} lead={t("outfits.lead")} />
      {outfits.length === 0 ? (
        <p className="border-y border-line py-8 text-muted">{t("outfits.empty")}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 lg:grid-cols-4">
          {outfits.map((o) => (
            <li key={o.id}>
              <OutfitCard outfit={o} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function OutfitDetail({ outfit, more }: { outfit: ResolvedOutfit; more: ResolvedOutfit[] }) {
  const f = useFormat();
  const { t } = f;
  const [active, setActive] = useState<number | null>(null);
  const total = outfit.parts.reduce((sum, p) => sum + p.find.pricePln, 0);

  const focusPart = (i: number) => {
    setActive(i);
    document.getElementById(`part-${i}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  return (
    <>
      <Link href={site.routes.outfits} className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg">
        <ArrowLeft aria-hidden size={15} />
        {t("outfit.back")}
      </Link>
      <h1 className="mt-4 text-[clamp(1.625rem,3vw,2.25rem)] font-semibold leading-tight tracking-[-0.025em]">{outfit.title}</h1>
      <p className="mt-1 text-muted">{outfit.author}</p>

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,34rem)_minmax(0,26rem)] lg:gap-12">
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-line bg-black">
          <OutfitBoard outfit={outfit} sizes="(min-width: 1024px) 34rem, 100vw" numbered active={active} onActive={setActive} onPick={focusPart} />
        </div>

        <section aria-labelledby="parts-title" className="lg:sticky lg:top-28">
          <h2 id="parts-title" className="text-lg font-semibold">
            {t("outfit.partsTitle")}
          </h2>
          <ol className="mt-3 space-y-2">
            {outfit.parts.map((p, i) => (
              <li
                key={i}
                id={`part-${i}`}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                className={`relative flex items-center gap-3 rounded-xl border p-2.5 transition-colors ${active === i ? "border-fg bg-card-hover" : "border-line bg-card"}`}
              >
                <span aria-hidden="true" className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${active === i ? "bg-fg text-bg" : "bg-white/10"}`}>
                  {i + 1}
                </span>
                <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-[#1c1c1f]">
                  <ProductImage src={p.find.image} sizes="3.5rem" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[10px] uppercase tracking-[1px] text-muted">{p.label || f.category(p.find.category)}</span>
                  <Link href={site.routes.product(p.find.id)} className="line-clamp-2 text-sm font-medium leading-snug after:absolute after:inset-0">
                    {p.find.name}
                  </Link>
                  <span className="mt-0.5 block font-mono text-[13px] tabular">{f.money(p.find.pricePln)}</span>
                </span>
                <span className="relative z-10 flex shrink-0 flex-col gap-1.5">
                  <FavoriteButton find={p.find} className="!border-line !bg-bg" />
                  <HaulToggle find={p.find} />
                </span>
              </li>
            ))}
          </ol>

          <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
            <span className="text-muted">{t("outfit.total")}</span>
            <span className="font-mono text-lg font-medium tabular">{f.money(total)}</span>
          </div>
          <button
            type="button"
            onClick={() => haulActions.addMany(outfit.parts.map((p) => p.find), t("outfit.added"))}
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-fg text-sm font-medium text-bg transition-colors hover:bg-white"
          >
            <ShoppingBag aria-hidden size={16} />
            {t("outfit.addAll")}
          </button>
        </section>
      </div>

      {more.length > 0 && (
        <section aria-labelledby="more-outfits" className="mt-16">
          <SectionTitle id="more-outfits" title={[t("outfit.more"), ""]} href={site.routes.outfits} linkLabel={t("rows.seeAll")} />
          <Carousel label={t("outfit.more")}>
            {more.map((o) => (
              <li key={o.id} className="w-[200px] shrink-0 snap-start sm:w-[240px]">
                <OutfitCard outfit={o} />
              </li>
            ))}
          </Carousel>
        </section>
      )}
    </>
  );
}
