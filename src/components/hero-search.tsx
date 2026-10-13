"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "motion/react";
import { ArrowRight, ArrowUpRight, Camera, Copy, Search } from "lucide-react";
import { parseSource, platformLabel } from "@/lib/agents";
import { copyWithNotice } from "@/lib/clipboard";
import { notify } from "@/lib/notify";
import { site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";

// Przykłady, które podpowiedź wpisuje i kasuje po kolei, kursywą jak w nagłówku
const EXAMPLES = ["Jordan 4", "Chrome Hearts", "Nike Tech Fleece", "Stone Island", "Moncler"];

type Typing = { i: number; n: number; dir: 1 | -1 | 0 };

/**
 * Szukajka z hero: tekst szuka findów, a link z Weidiana, Taobao, 1688 albo od innego agenta
 * od razu zamienia na link do wybranego agenta. Zamiast skrzynki – duży tekst na linii, która
 * po kliknięciu wypełnia się od lewej, a podpowiedź sama wpisuje kolejne przykłady.
 */
export function HeroSearch({ typeIn = false }: { typeIn?: boolean }) {
  const f = useFormat();
  const { t } = f;
  const router = useRouter();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const still = Boolean(useReducedMotion());
  // Przy wejściu na stronę pierwszy przykład wpisuje się od zera, przy powrocie stoi gotowy
  const [typing, setTyping] = useState<Typing>(() => (typeIn ? { i: 0, n: 0, dir: 1 } : { i: 0, n: EXAMPLES[0].length, dir: 0 }));

  // Pisanie, chwila przerwy, kasowanie, następny przykład; stoi, gdy ktoś pisze albo ma kursor w polu
  useEffect(() => {
    if (still || focused || value) return;
    const word = EXAMPLES[typing.i];
    let delay: number;
    let next: Typing;
    if (typing.dir === 1 && typing.n < word.length) {
      delay = typing.n === 0 ? (typing.i === 0 && typeIn ? 900 : 260) : 55 + Math.random() * 45;
      next = { ...typing, n: typing.n + 1 };
    } else if (typing.dir === -1 && typing.n > 0) {
      delay = 24;
      next = { ...typing, n: typing.n - 1 };
    } else if (typing.dir === -1) {
      delay = 0;
      next = { i: (typing.i + 1) % EXAMPLES.length, n: 0, dir: 1 };
    } else {
      delay = 2200;
      next = { ...typing, dir: -1 };
    }
    const timer = window.setTimeout(() => setTyping(next), delay);
    return () => window.clearTimeout(timer);
  }, [typing, still, focused, value, typeIn]);

  const example = EXAMPLES[typing.i];
  const shown = still || focused ? example : example.slice(0, typing.n);
  const source = parseSource(value);
  const converted = source ? f.buyUrl(source) : null;

  // Po kliknięciu strzałka wystrzeliwuje w prawo; strona zmienia się, gdy już wylatuje
  const [zip, setZip] = useState(0);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = value.trim();
    setZip((n) => n + 1);
    if (converted) {
      window.open(converted, "_blank", "noopener");
      notify({ tone: "brand", image: f.agent.logo, title: t("n.converted", { agent: f.agent.name }), text: t("n.convertedText") });
      return;
    }
    const href = /^https?:\/\//i.test(q) ? `${site.routes.qcFinder}?url=${encodeURIComponent(q)}` : q ? `${site.routes.finds}?q=${encodeURIComponent(q)}` : site.routes.finds;
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 180;
    window.setTimeout(() => router.push(href), delay);
  };

  const action = converted ? t("search.open") : t("search.browse");

  return (
    <div className="mt-9 max-w-[34rem]">
      <form role="search" onSubmit={onSubmit} className="group/s relative flex items-center gap-2 pb-2.5 sm:gap-2.5">
        <label htmlFor="szukaj" className="sr-only">
          {t("search.label")}
        </label>
        <Search aria-hidden size={20} className="shrink-0 text-dim transition-colors group-focus-within/s:text-fg" />
        <div className="relative h-12 min-w-0 flex-1">
          <input
            id="szukaj"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoComplete="off"
            spellCheck={false}
            className="size-full bg-transparent pl-1 text-[1.1875rem] tracking-[-0.01em] text-fg focus:outline-none sm:text-[1.3125rem]"
          />
          {/* Podpowiedź zamiast placeholdera, żeby przykłady mogły mieć własną czcionkę i kursor */}
          {!value && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex items-center gap-[0.35em] overflow-hidden whitespace-nowrap pl-1 text-[1.1875rem] tracking-[-0.01em] text-dim sm:text-[1.3125rem]"
            >
              <span className="shrink-0">{t("search.hintName")}</span>
              <span className="fancy min-w-0 truncate text-[1.12em] text-muted">{shown}</span>
              {!still && !focused && <span className="caret -ml-[0.2em] h-[1.1em] w-px shrink-0 bg-fg/70" />}
            </span>
          )}
        </div>
        <a
          href={site.routes.photoSearch}
          title={t("header.photoSearch")}
          className="grid size-11 shrink-0 place-items-center rounded-full text-muted ring-1 ring-line transition-colors hover:text-fg hover:ring-line-strong"
        >
          <Camera aria-hidden size={18} />
          <span className="sr-only">{t("header.photoSearch")}</span>
        </a>
        <button
          type="submit"
          title={action}
          className="group/go grid size-11 shrink-0 place-items-center rounded-full bg-fg text-bg transition-[background-color,transform] duration-150 hover:bg-white active:scale-[0.94]"
        >
          <span className="sr-only">{action}</span>
          {/* Po najechaniu strzałka przejeżdża na wylot, po kliknięciu wystrzeliwuje (klucz zip restartuje animację) */}
          <span aria-hidden="true" className="relative block size-[18px] overflow-hidden">
            <span key={zip} className={`absolute inset-0 ${zip ? "arrow-zip" : ""}`}>
              {converted ? (
                <ArrowUpRight size={18} className="absolute inset-0" />
              ) : (
                <>
                  <ArrowRight size={18} className="absolute inset-0 transition-transform duration-300 ease-out group-hover/go:translate-x-[140%]" />
                  <ArrowRight size={18} className="absolute inset-0 -translate-x-[140%] transition-transform duration-300 ease-out group-hover/go:translate-x-0" />
                </>
              )}
            </span>
          </span>
        </button>
        {/* Linia pod polem: szara, a po kliknięciu wypełnia się na biało od lewej */}
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-line-strong" />
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-fg transition-transform duration-500 ease-[var(--ease-out-soft)] group-focus-within/s:scale-x-100 motion-reduce:transition-none"
        />
      </form>

      {converted && source && (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-line-strong bg-card py-2.5 pl-3 pr-2.5">
          <span className="relative size-9 shrink-0 overflow-hidden rounded-lg bg-black/40">
            <Image src={f.agent.logo} alt="" fill sizes="2.25rem" className="object-contain p-1" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted">
              {platformLabel[source.platform]} → {t("search.result", { agent: f.agent.name })}
            </p>
            <p className="truncate font-mono text-[0.8125rem] text-fg">{converted}</p>
          </div>
          <button
            type="button"
            onClick={() => copyWithNotice(converted, { title: t("n.copiedLink"), text: converted, image: f.agent.logo })}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-bg px-3 text-[0.8125rem] font-medium hover:border-line-strong"
          >
            <Copy aria-hidden size={14} />
            {t("search.copy")}
          </button>
          <a
            href={converted}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="grid size-9 shrink-0 place-items-center rounded-lg bg-fg text-bg hover:bg-white"
          >
            <ArrowUpRight aria-hidden size={16} />
            <span className="sr-only">{t("search.openNew")}</span>
          </a>
        </div>
      )}
    </div>
  );
}
