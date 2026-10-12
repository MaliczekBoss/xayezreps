"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { ArrowUpRight, Check, ChevronsLeftRight, Copy } from "lucide-react";
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

/** Find do porównania: wybrany w site.ts, a gdy nie ma zdjęcia QC – najpopularniejszy, który je ma */
const pickShowcase = (finds: Find[]) => finds.find((f) => f.id === site.heroFindId && f.qcCover) ?? sortPopular(finds).find((f) => f.qcCover);

export function Hero({ finds }: { finds: Find[] }) {
  const f = useFormat();
  const { t } = f;
  const [intro] = useState(() => !introPlayed);
  useEffect(() => {
    introPlayed = true;
  }, []);

  const showcase = pickShowcase(finds);

  return (
    <section
      id="top"
      aria-labelledby="hero-title"
      className={`${intro ? "intro" : ""} mx-auto grid max-w-7xl items-center gap-x-14 gap-y-10 px-4 pb-14 pt-32 sm:px-6 sm:pb-16 sm:pt-40 lg:grid-cols-2 lg:px-8`}
    >
      <div className="min-w-0 max-w-[36rem]">
        <h1 id="hero-title" className="text-[clamp(2.75rem,6vw,4.25rem)] font-semibold leading-[1.02] tracking-[-0.035em]">
          <span className="block">
            <RisingWords text={t("hero.title1")} start={60} />
          </span>
          {/* Kursywa pojawia się od lewej, jakby ktoś ją dopisywał */}
          <span className="fancy intro-write block text-[1.1em] leading-[1] text-muted" style={at(300)}>
            {t("hero.title2")}
          </span>
        </h1>
        <p className="intro-fade mt-5 max-w-[30rem] text-pretty text-[1.0625rem] leading-relaxed text-muted" style={at(560)}>
          {t("hero.lead")}
        </p>

        <div className="intro-fade" style={at(660)}>
          <HeroSearch typeIn={intro} />
        </div>

        <p className="intro-fade mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1.5 text-sm" style={at(760)}>
          <span className="text-dim">{t("hero.popular")}</span>
          {POPULAR_SEARCHES.map((q) => (
            <Link key={q} href={`${site.routes.finds}?q=${encodeURIComponent(q)}`} className="text-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-fg">
              {q}
            </Link>
          ))}
        </p>

        <div className="intro-fade mt-8" style={at(860)}>
          <HeroCoupon />
        </div>
      </div>

      {showcase && (
        <div className="intro-fade min-w-0" style={at(160)}>
          <QcCompare item={showcase} intro={intro} />
        </div>
      )}
    </section>
  );
}

/**
 * Kupon USFans w materiale strony: rabat dużą kursywą jak druga linia nagłówka, warunki obok,
 * a za linią „do oderwania” kod, który kopiuje się po kliknięciu w dowolne miejsce kuponu.
 */
function HeroCoupon() {
  const { t } = useFormat();
  const [copied, setCopied] = useState(false);
  const code = site.promo.code;

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2200);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={() => {
        copyWithNotice(code, { title: t("n.copiedCode", { code }), text: t("n.copiedCodeText", { agent: site.partner.name }) });
        setCopied(true);
      }}
      className="coupon-cut group flex w-full max-w-[34rem] items-stretch rounded-2xl border border-line bg-card text-left transition-colors [--stub:7.5rem] hover:border-line-strong focus-visible:border-fg focus-visible:outline-none sm:[--stub:9rem]"
    >
      <span className="flex min-w-0 flex-1 items-center gap-3.5 py-3.5 pl-4 pr-3 sm:gap-4 sm:pl-5 sm:pr-4">
        <span className="fancy shrink-0 text-[2.5rem] leading-none tracking-[-0.02em] text-fg sm:text-[3rem]">{site.promo.coupon}</span>
        <span className="min-w-0">
          <span className="block text-[0.9375rem] font-medium leading-snug text-fg">{t("hero.couponTitle")}</span>
          <span className="mt-0.5 block text-[13px] text-muted">{t("hero.couponText", { agent: site.partner.name })}</span>
        </span>
      </span>
      <span className="flex w-(--stub) shrink-0 flex-col items-center justify-center gap-1 rounded-r-2xl border-l border-dashed border-line-strong transition-colors group-hover:bg-card-hover">
        <span className="font-mono text-[0.9375rem] font-semibold tracking-[0.04em] text-fg">{code}</span>
        <span aria-live="polite" className={`inline-flex items-center gap-1 text-[12px] transition-colors ${copied ? "text-gl" : "text-muted group-hover:text-fg"}`}>
          {copied ? <Check aria-hidden size={12} strokeWidth={3} /> : <Copy aria-hidden size={12} />}
          {copied ? t("hero.couponCopied") : t("hero.couponCopy")}
        </span>
      </span>
    </button>
  );
}

/**
 * Ten sam find przecięty pionową linią: z lewej zdjęcie ze sklepu, z prawej prawdziwe zdjęcie QC
 * z magazynu. Linię przesuwa się palcem, myszką albo strzałkami; przy wejściu na stronę sama odsłania QC.
 */
function QcCompare({ item, intro }: { item: Find; intro: boolean }) {
  const f = useFormat();
  const { t } = f;
  const [pos, setPos] = useState(intro ? 100 : 50);
  // Płynne przejście linii tylko przy pokazie na start, nie przy przeciąganiu
  const [glide, setGlide] = useState(intro);
  // Podpowiedź „przesuń” pod uchwytem znika po pierwszym przesunięciu
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!intro) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setPos(50), reduce ? 0 : 1100);
    return () => window.clearTimeout(timer);
  }, [intro]);

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
          <span
            className={`absolute left-1/2 top-[calc(50%+1.75rem)] -translate-x-1/2 whitespace-nowrap rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur transition-opacity duration-300 ${
              touched ? "opacity-0" : "opacity-100"
            }`}
          >
            {t("hero.drag")}
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
            setTouched(true);
            setPos(Number(e.target.value));
          }}
          aria-label={t("hero.compare", { name: item.name })}
          className="absolute inset-0 size-full cursor-ew-resize appearance-none bg-transparent opacity-0"
        />
      </div>

      <figcaption className="mt-3 flex items-center gap-3">
        <span className="flex min-w-0 flex-1 items-baseline gap-2.5">
          <span className="truncate font-medium">{item.name}</span>
          <span className="shrink-0 font-mono text-sm text-muted tabular">{f.money(item.pricePln)}</span>
        </span>
        <Link
          href={site.routes.product(item.id)}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-card px-3 text-[13px] font-medium transition-colors hover:border-line-strong"
        >
          {t("hero.seeQc", { n: item.qc ?? 0 })}
          <ArrowUpRight aria-hidden size={14} />
        </Link>
      </figcaption>

    </figure>
  );
}
