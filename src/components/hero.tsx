"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

export type HeroCategory = { category: string; image: string };

/** Liczby pod wyszukiwarką i miniatury produktów bez tła do nich */
export type HeroProof = { finds: number; qc: number; findThumbs: string[]; qcThumbs: string[] };

/** Trzy zachodzące na siebie miniatury; po najechaniu na link lekko się rozsuwają */
function Stack({ images }: { images: string[] }) {
  return (
    <span aria-hidden="true" className="flex">
      {images.map((src, i) => (
        <span
          key={i}
          className={`relative size-6 overflow-hidden rounded-full bg-card-hover ring-2 ring-bg transition-[margin] duration-300 ease-[var(--ease-out-soft)] ${
            i ? "-ml-2 group-hover/p:-ml-0.5" : ""
          }`}
        >
          <ProductImage src={src} sizes="1.5rem" className="p-0.5" />
        </span>
      ))}
    </span>
  );
}

/**
 * Pasek kategorii pod wyszukiwarką: duże zdjęcia produktów bez tła z podpisem, przewijany w bok.
 * Na komputerze strzałki po bokach przesuwają o prawie cały ekran, a brzegi paska gasną tam, gdzie coś jeszcze jest.
 */
function CategoryRail({ items, intro }: { items: HeroCategory[]; intro: boolean }) {
  const f = useFormat();
  const { t } = f;
  const list = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const el = list.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft < 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    const el = list.current;
    if (!el) return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  const go = (dir: 1 | -1) => list.current?.scrollBy({ left: dir * list.current.clientWidth * 0.8, behavior: "smooth" });
  const fade = `linear-gradient(to right, ${edge.start ? "#000" : "transparent"}, #000 3rem, #000 calc(100% - 3rem), ${edge.end ? "#000" : "transparent"})`;
  const arrow =
    "absolute top-[2.75rem] z-10 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-card/90 text-fg ring-1 ring-line-strong backdrop-blur transition-colors hover:bg-card-hover sm:grid";

  return (
    <nav aria-label={t("hero.all")} className="relative -mx-4 sm:mx-0">
      <ul
        ref={list}
        onScroll={measure}
        style={{ maskImage: fade, WebkitMaskImage: fade }}
        className="flex snap-x gap-1 overflow-x-auto px-4 pb-2 pt-5 [scrollbar-width:none] sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {items.map(({ category, image }, i) => (
          <li key={category} className="intro-fade shrink-0 snap-start" style={at(intro ? 760 + Math.min(i, 11) * 40 : 0)}>
            <Link href={`${site.routes.finds}?category=${encodeURIComponent(category)}`} className="group flex w-[5.75rem] flex-col items-center gap-2 rounded-xl pb-1 sm:w-[6.75rem]">
              <span className="lift relative size-[4.5rem] sm:size-[5.25rem]">
                <ProductImage src={image} sizes="5.25rem" />
              </span>
              <span className="text-[13px] font-medium text-muted transition-colors group-hover:text-fg">{f.category(category)}</span>
            </Link>
          </li>
        ))}
      </ul>
      {!edge.start && (
        <button type="button" onClick={() => go(-1)} className={`${arrow} left-1`}>
          <ChevronLeft aria-hidden size={18} />
          <span className="sr-only">{t("carousel.prev")}</span>
        </button>
      )}
      {!edge.end && (
        <button type="button" onClick={() => go(1)} className={`${arrow} right-1`}>
          <ChevronRight aria-hidden size={18} />
          <span className="sr-only">{t("carousel.next")}</span>
        </button>
      )}
    </nav>
  );
}

export function Hero({ categories, proof, previews }: { categories: HeroCategory[]; proof: HeroProof; previews: ToolPreviews }) {
  const f = useFormat();
  const { t } = f;
  const [intro] = useState(() => !introPlayed);
  useEffect(() => {
    introPlayed = true;
  }, []);

  return (
    // Wylatująca karta wachlarza nie może przesuwać strony w bok
    <div className="overflow-x-clip">
      <section
        id="top"
        aria-labelledby="hero-title"
        className={`${intro ? "intro" : ""} mx-auto grid max-w-7xl items-center gap-x-12 gap-y-14 px-4 pb-14 pt-32 sm:px-6 sm:pb-16 sm:pt-40 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:px-8`}
      >
        <div className="min-w-0 max-w-[40rem]">
          <h1 id="hero-title" className="text-[clamp(2.75rem,6vw,4.25rem)] font-semibold leading-[1.02] tracking-[-0.035em] lg:text-[clamp(2.75rem,4.9vw,4.25rem)]">
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

          {/* Trzy prawdziwe liczby kręcące się jak licznik: kupujący, findy w katalogu i findy ze zdjęciami QC */}
          <ul className="intro-fade mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted" style={at(1000)}>
            <li className="flex items-center gap-2.5">
              <span aria-hidden="true" className="relative grid size-2 place-items-center">
                <span className="absolute size-2 rounded-full bg-gl/60 [animation-duration:2.2s] motion-safe:animate-ping" />
                <span className="relative size-2 rounded-full bg-gl" />
              </span>
              <span>
                <RollingNumber value={site.buyers} roll={intro} start={1150} /> {t("hero.proofBuyers")}
              </span>
            </li>
            <li>
              <Link href={site.routes.finds} className="group/p flex items-center gap-2.5 transition-colors hover:text-fg">
                <Stack images={proof.findThumbs} />
                <span>
                  <RollingNumber value={proof.finds.toLocaleString(f.locale)} roll={intro} start={1250} /> {t("hero.proofFinds", { n: proof.finds })}
                </span>
              </Link>
            </li>
            {proof.qc > 0 && (
              <li>
                <Link href={`${site.routes.finds}?qc=1`} className="group/p flex items-center gap-2.5 transition-colors hover:text-fg">
                  <Stack images={proof.qcThumbs} />
                  <span>
                    <RollingNumber value={proof.qc.toLocaleString(f.locale)} roll={intro} start={1350} /> {t("hero.proofQc")}
                  </span>
                </Link>
              </li>
            )}
          </ul>
        </div>

        {/* Na telefonie kategorie idą zaraz pod wyszukiwarką, a wachlarz banerów pod nimi */}
        <div className="intro-fade order-3 min-w-0 lg:order-none" style={at(240)}>
          <HeroBanners data={previews} />
        </div>

        <div className="order-2 min-w-0 lg:order-none lg:col-span-2">
          <CategoryRail items={categories} intro={intro} />
        </div>
      </section>
    </div>
  );
}
