"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { ArrowUpRight, ChevronsLeftRight, Copy } from "lucide-react";
import { agentsById } from "@/lib/agents";
import { copyWithNotice } from "@/lib/clipboard";
import { sortPopular, type Find } from "@/lib/finds";
import { site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";
import { HeroSearch } from "./hero-search";
import { ProductImage } from "./product-image";

// Sekwencja wejścia gra tylko przy otwarciu strony, a nie po każdym powrocie na stronę główną
let introPlayed = false;

/** Opóźnienie kroku sekwencji wejścia (zmienna --d w globals.css) */
const at = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

// Najczęściej wpisywane frazy – prowadzą prosto do wyników wyszukiwarki
const POPULAR_SEARCHES = ["Jordan 4", "Chrome Hearts", "Corteiz", "Moncler", "Nike Tech", "Balenciaga"];

const COMPARE_COUNT = 5;

/** Słowa nagłówka wjeżdżające po kolei spod krawędzi */
function RisingWords({ text, start }: { text: string; start: number }) {
  return text.split(" ").map((word, i) => (
    <span key={i}>
      {i > 0 && " "}
      <span className="-mb-[0.12em] inline-block overflow-hidden pb-[0.12em] align-top">
        <span className="intro-rise inline-block" style={at(start + i * 80)}>
          {word}
        </span>
      </span>
    </span>
  ));
}

/** Findy do porównania: popularne, ze zdjęciem QC, każdy z innej kategorii */
function pickCompare(finds: Find[]) {
  const seen = new Set<string>();
  const picked: Find[] = [];
  for (const f of sortPopular(finds)) {
    if (!f.qcCover || seen.has(f.category)) continue;
    seen.add(f.category);
    picked.push(f);
    if (picked.length === COMPARE_COUNT) break;
  }
  return picked;
}

export function Hero({ finds }: { finds: Find[] }) {
  const f = useFormat();
  const { t } = f;
  const [intro] = useState(() => !introPlayed);
  useEffect(() => {
    introPlayed = true;
  }, []);

  const withQc = finds.filter((x) => x.qc).length;
  const compare = pickCompare(finds);
  const partner = agentsById.get("usfans");
  const code = site.promo.code;

  return (
    <section
      id="top"
      aria-labelledby="hero-title"
      className={`${intro ? "intro" : ""} mx-auto grid max-w-7xl items-center gap-x-14 gap-y-10 px-4 pb-14 pt-32 sm:px-6 sm:pb-16 sm:pt-40 lg:grid-cols-2 lg:px-8`}
    >
      <div className="min-w-0 max-w-[36rem]">
        <h1 id="hero-title" className="text-[clamp(2.5rem,4.6vw,3.75rem)] font-semibold leading-[1.04] tracking-[-0.04em]">
          <RisingWords text={t("hero.title")} start={60} />
        </h1>
        <p className="intro-fade mt-5 max-w-[31rem] text-[1.0625rem] leading-relaxed text-muted" style={at(420)}>
          {t("hero.leadStats", { n: finds.length, qc: withQc })}
        </p>

        <div className="intro-fade" style={at(520)}>
          <HeroSearch typeIn={intro} />
        </div>

        <p className="intro-fade mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1.5 text-sm" style={at(620)}>
          <span className="text-dim">{t("hero.popular")}</span>
          {POPULAR_SEARCHES.map((q) => (
            <Link key={q} href={`${site.routes.finds}?q=${encodeURIComponent(q)}`} className="text-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-fg">
              {q}
            </Link>
          ))}
        </p>

        {/* Kupon jak wycięty z gazetki: kod kopiuje się jednym kliknięciem */}
        <button
          type="button"
          onClick={() => copyWithNotice(code, { title: t("n.copiedCode", { code }), text: t("n.copiedCodeText", { agent: site.partner.name }) })}
          className="intro-fade group mt-8 flex w-full max-w-[31rem] items-center gap-3 rounded-xl border border-dashed border-line-strong px-3 py-2.5 text-left transition-colors hover:border-fg"
          style={at(720)}
        >
          {partner && (
            <span className="relative size-8 shrink-0 overflow-hidden rounded-lg bg-black">
              <Image src={partner.logo} alt="" fill sizes="2rem" className="object-contain p-0.5" />
            </span>
          )}
          <span className="min-w-0 flex-1 text-sm leading-snug text-muted">
            {t("hero.coupon", { agent: site.partner.name, coupon: site.promo.coupon })}{" "}
            <span className="whitespace-nowrap font-mono font-semibold text-fg">{code}</span>
          </span>
          <span className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-card px-3 text-xs font-medium text-fg transition-colors group-hover:bg-card-hover">
            <Copy aria-hidden size={13} />
            {t("copy.copy")}
          </span>
        </button>
      </div>

      {compare.length > 0 && (
        <div className="intro-fade min-w-0" style={at(160)}>
          <QcCompare items={compare} intro={intro} />
        </div>
      )}
    </section>
  );
}

/**
 * Ten sam find przecięty pionową linią: z lewej zdjęcie ze sklepu, z prawej prawdziwe zdjęcie QC
 * z magazynu. Linię przesuwa się palcem, myszką albo strzałkami; przy wejściu na stronę sama odsłania QC.
 */
function QcCompare({ items, intro }: { items: Find[]; intro: boolean }) {
  const f = useFormat();
  const { t } = f;
  const [index, setIndex] = useState(0);
  const [pos, setPos] = useState(intro ? 100 : 50);
  // Płynne przejście linii tylko przy pokazie na start i zmianie findu, nie przy przeciąganiu
  const [glide, setGlide] = useState(intro);

  useEffect(() => {
    if (!intro) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setPos(50), reduce ? 0 : 1100);
    return () => window.clearTimeout(timer);
  }, [intro]);

  const item = items[index];
  const transition = glide ? "1.1s cubic-bezier(0.65, 0, 0.35, 1)" : "0s";

  return (
    <figure>
      <div className="relative aspect-[5/4] select-none overflow-hidden rounded-[20px] bg-[#1c1c1f]">
        <ProductImage src={item.image} sizes="(min-width: 1024px) 36rem, 92vw" preload />
        <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${pos}%)`, transition: `clip-path ${transition}` }}>
          {item.qcCover && <ProductImage src={item.qcCover} sizes="(min-width: 1024px) 36rem, 92vw" preload />}
        </div>
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/[0.07]" />

        {/* Podpisy połówek */}
        <span aria-hidden="true" className="fancy pointer-events-none absolute left-4 top-3 text-[1.75rem] leading-none text-white [text-shadow:0_2px_12px_rgb(0_0_0/0.6)]">
          {t("hero.store")}
        </span>
        <span aria-hidden="true" className="fancy pointer-events-none absolute right-4 top-3 text-[1.75rem] leading-none text-white [text-shadow:0_2px_12px_rgb(0_0_0/0.6)]">
          {t("hero.warehouse")}
        </span>

        {/* Linia z uchwytem */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_12px_rgb(0_0_0/0.5)]"
          style={{ left: `${pos}%`, transition: `left ${transition}` }}
        >
          <span className="absolute left-1/2 top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-black shadow-[0_6px_20px_rgb(0_0_0/0.45)]">
            <ChevronsLeftRight size={18} strokeWidth={2.25} />
          </span>
        </span>

        {/* Suwak na całym zdjęciu: obsługuje mysz, dotyk i klawiaturę */}
        <input
          type="range"
          min={0}
          max={100}
          step={0.5}
          value={pos}
          onChange={(e) => {
            setGlide(false);
            setPos(Number(e.target.value));
          }}
          aria-label={t("hero.compare", { name: item.name })}
          className="absolute inset-0 size-full cursor-ew-resize appearance-none bg-transparent opacity-0"
        />
      </div>

      <figcaption className="mt-3 flex items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{item.name}</span>
          <span className="block font-mono text-sm text-muted tabular">{f.money(item.pricePln)}</span>
        </span>
        <Link
          href={site.routes.product(item.id)}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-card px-3 text-[13px] font-medium transition-colors hover:border-line-strong"
        >
          {t("hero.seeQc", { n: item.qc ?? 0 })}
          <ArrowUpRight aria-hidden size={14} />
        </Link>
      </figcaption>

      {items.length > 1 && (
        <div role="group" aria-label={t("hero.pick")} className="mt-3 flex gap-2">
          {items.map((x, i) => (
            <button
              key={x.id}
              type="button"
              aria-pressed={i === index}
              onClick={() => {
                setGlide(true);
                setIndex(i);
                setPos(50);
              }}
              className={`relative size-12 overflow-hidden rounded-lg bg-[#1c1c1f] transition-[opacity,box-shadow] ${
                i === index ? "shadow-[0_0_0_2px_var(--color-fg)]" : "opacity-55 hover:opacity-100"
              }`}
            >
              <ProductImage src={x.image} sizes="3rem" />
              <span className="sr-only">{x.name}</span>
            </button>
          ))}
        </div>
      )}
    </figure>
  );
}
