"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useFormat } from "@/lib/use-format";

type CarouselProps = {
  label: string;
  children: ReactNode;
};

/** Poziomy rząd kart. Na telefonie przewija się palcem, na komputerze strzałkami na krawędziach. */
export function Carousel({ label, children }: CarouselProps) {
  const { t } = useFormat();
  const track = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, [measure]);

  const go = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: reduce ? "auto" : "smooth" });
  };

  const arrow =
    "absolute top-[38%] z-10 hidden size-10 -translate-y-1/2 place-items-center rounded-full border border-white/40 bg-black/60 text-white backdrop-blur transition-opacity hover:bg-black/80 md:grid";

  return (
    <div className="relative mt-6">
      <ul
        ref={track}
        aria-label={label}
        className="relative -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:gap-4 sm:px-6 [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </ul>
      {!edges.start && (
        <button type="button" className={`${arrow} -left-3`} onClick={() => go(-1)}>
          <ChevronLeft aria-hidden size={18} />
          <span className="sr-only">{t("carousel.prev")}</span>
        </button>
      )}
      {!edges.end && (
        <button type="button" className={`${arrow} -right-3`} onClick={() => go(1)}>
          <ChevronRight aria-hidden size={18} />
          <span className="sr-only">{t("carousel.next")}</span>
        </button>
      )}
    </div>
  );
}
