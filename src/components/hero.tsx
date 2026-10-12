"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { categories, sortPopular, type Find } from "@/lib/finds";
import { site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";
import { HeroBanners } from "./hero-banners";
import { HeroSearch } from "./hero-search";
import { ProductImage } from "./product-image";
import type { ToolPreviews } from "./tools";

// Sekwencja wejścia gra tylko przy otwarciu strony, a nie po każdym powrocie na stronę główną
let introPlayed = false;

/** Opóźnienie kroku sekwencji wejścia (zmienna --d w globals.css) */
const at = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

const chips = categories.filter((c) => ["Bluzy", "Spodnie", "Spodenki", "Buty", "Torby", "Paski", "Zegarki"].includes(c));

// Miejsce na liczbę w tłumaczeniu „Zaufało nam {n} kupujących”
const NUMBER_SLOT = "\u0000";

/**
 * Liczba jak licznik w samochodzie: każda cyfra robi pełny obrót i staje na swojej wartości, kolejne z małym
 * opóźnieniem (zera też się kręcą). Spacje i „+” stoją w miejscu. Bez sekwencji wejścia liczba stoi od razu.
 */
function RollingNumber({ value, roll, start }: { value: string; roll: boolean; start: number }) {
  const [go, setGo] = useState(!roll);
  useEffect(() => {
    if (!roll) return;
    const timer = window.setTimeout(() => setGo(true), start);
    return () => window.clearTimeout(timer);
  }, [roll, start]);

  return (
    <span className="inline-flex align-bottom font-semibold text-fg tabular">
      <span className="sr-only">{value}</span>
      {[...value].map((ch, i) =>
        /\d/.test(ch) ? (
          <span key={i} aria-hidden="true" className="inline-block h-[1.25em] overflow-hidden">
            <span
              className="flex flex-col transition-transform duration-[1400ms] ease-[cubic-bezier(0.2,0.9,0.25,1)] motion-reduce:transition-none"
              style={{ transform: `translateY(-${go ? (Number(ch) + 10) * 5 : 0}%)`, transitionDelay: `${i * 90}ms` }}
            >
              {DIGITS.map((d, k) => (
                <span key={k} className="h-[1.25em] leading-[1.25em]">
                  {d}
                </span>
              ))}
            </span>
          </span>
        ) : (
          <span key={i} aria-hidden="true" className="whitespace-pre leading-[1.25em]">
            {ch}
          </span>
        ),
      )}
    </span>
  );
}

// Dwa razy 0–9: cyfra przewija się przez pełne koło i staje w drugiej dziesiątce
const DIGITS = Array.from({ length: 20 }, (_, i) => String(i % 10));

/** Słowa nagłówka wjeżdżające po kolei spod krawędzi */
function RisingWords({ text, start }: { text: string; start: number }) {
  return text.split(" ").map((word, i) => (
    <span key={i}>
      {i > 0 && " "}
      <span className="-mb-[0.12em] inline-block overflow-hidden pb-[0.12em] align-top">
        <span className="intro-rise inline-block" style={at(start + i * 90)}>
          {word}
        </span>
      </span>
    </span>
  ));
}

export function Hero({ finds, previews }: { finds: Find[]; previews: ToolPreviews }) {
  const f = useFormat();
  const { t } = f;
  const [intro] = useState(() => !introPlayed);
  useEffect(() => {
    introPlayed = true;
  }, []);

  const popular = sortPopular(finds);
  // Zdjęcie kategorii: najpopularniejszy find z niej; „+ Więcej” dostaje kolaż czterech najpopularniejszych
  const cover = (c: string) => popular.find((p) => p.category === c && p.image)?.image ?? "";
  const collage = popular.slice(0, 4).map((p) => p.image);

  return (
    // Wylatująca karta wachlarza nie może przesuwać strony w bok
    <div className="overflow-x-clip">
      <section
        id="top"
        aria-labelledby="hero-title"
        className={`${intro ? "intro" : ""} mx-auto grid max-w-7xl items-center gap-x-12 gap-y-14 px-4 pb-14 pt-32 sm:px-6 sm:pb-16 sm:pt-40 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:px-8`}
      >
        <div className="min-w-0 max-w-[40rem]">
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

          {/* Kategorie jako okrągłe zdjęcia z podpisem; na telefonie przewijane w bok */}
          <ul aria-label={t("hero.all")} className="-mx-4 mt-6 flex gap-3.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
            {chips.map((c, i) => (
              <li key={c} className="intro-fade shrink-0" style={at(760 + i * 35)}>
                <Link href={`${site.routes.finds}?category=${encodeURIComponent(c)}`} className="group flex w-14 flex-col items-center gap-1.5">
                  <span className="relative size-14 overflow-hidden rounded-full bg-[#1c1c1f] ring-1 ring-line transition-shadow group-hover:ring-2 group-hover:ring-fg/70">
                    {cover(c) && <ProductImage src={cover(c)} sizes="3.5rem" />}
                  </span>
                  <span className="text-[12px] text-muted transition-colors group-hover:text-fg">{f.category(c)}</span>
                </Link>
              </li>
            ))}
            <li className="intro-fade shrink-0" style={at(760 + chips.length * 35)}>
              <Link href={site.routes.finds} className="group flex w-14 flex-col items-center gap-1.5">
                <span className="grid size-14 grid-cols-2 gap-px overflow-hidden rounded-full bg-line ring-1 ring-line transition-shadow group-hover:ring-2 group-hover:ring-fg/70">
                  {collage.map((src, i) => (
                    <span key={i} className="relative bg-[#1c1c1f]">
                      {src && <ProductImage src={src} sizes="1.75rem" />}
                    </span>
                  ))}
                </span>
                <span className="whitespace-nowrap text-[12px] text-muted transition-colors group-hover:text-fg">{t("hero.more")}</span>
              </Link>
            </li>
          </ul>

          {/* Zielona kropka „na żywo” i liczba kupujących przewijana jak licznik */}
          <p className="intro-fade mt-7 flex items-center gap-2.5 text-sm text-muted" style={at(1000)}>
            <span aria-hidden="true" className="relative grid size-2 place-items-center">
              <span className="absolute size-2 rounded-full bg-gl/60 [animation-duration:2.2s] motion-safe:animate-ping" />
              <span className="relative size-2 rounded-full bg-gl" />
            </span>
            <span>
              {t("footer.trust", { n: NUMBER_SLOT })
                .split(NUMBER_SLOT)
                .map((part, i) => (i === 0 ? part : [<RollingNumber key="n" value={site.buyers} roll={intro} start={1150} />, part]))}
            </span>
          </p>
        </div>

        <div className="intro-fade min-w-0" style={at(240)}>
          <HeroBanners data={previews} />
        </div>
      </section>
    </div>
  );
}
