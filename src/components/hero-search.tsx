"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, Camera, Copy, Search } from "lucide-react";
import { parseSource, platformLabel } from "@/lib/agents";
import { copyWithNotice } from "@/lib/clipboard";
import { notify } from "@/lib/notify";
import { site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";
import { btnPrimary } from "./ui";

/**
 * Szukajka z hero: tekst szuka findów, a link z Weidiana, Taobao, 1688
 * albo od innego agenta od razu zamienia na link do wybranego agenta.
 */
export function HeroSearch({ typeIn = false }: { typeIn?: boolean }) {
  const f = useFormat();
  const { t } = f;
  const router = useRouter();
  const [value, setValue] = useState("");
  const placeholder = t("search.placeholder");
  // Przy wejściu na stronę podpowiedź wpisuje się litera po literze (null = cała)
  const [typed, setTyped] = useState<number | null>(null);

  useEffect(() => {
    if (!typeIn || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let n = 0;
    let timer = window.setTimeout(() => {
      setTyped(0);
      const tick = () => {
        n += 1;
        setTyped(n >= placeholder.length ? null : n);
        if (n < placeholder.length) timer = window.setTimeout(tick, 26);
      };
      timer = window.setTimeout(tick, 900);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [typeIn, placeholder]);
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

  return (
    <div className="mt-8 max-w-[34rem]">
      {/* Jeden pasek: pole, aparat i przycisk w środku (na telefonie sama strzałka) */}
      <form
        role="search"
        onSubmit={onSubmit}
        className="flex h-14 items-center gap-2.5 rounded-2xl border border-line-strong bg-card pl-4 pr-1.5 transition-colors focus-within:border-fg/50"
      >
        <label htmlFor="szukaj" className="sr-only">
          {t("search.label")}
        </label>
        <Search aria-hidden size={18} className="shrink-0 text-dim" />
        <input
          id="szukaj"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={typed === null ? placeholder : placeholder.slice(0, typed)}
          autoComplete="off"
          spellCheck={false}
          className="h-full w-full min-w-0 bg-transparent text-[0.9375rem] text-fg placeholder:text-dim focus:outline-none"
        />
        <a href={site.routes.photoSearch} className="shrink-0 text-dim transition-colors hover:text-fg" title={t("header.photoSearch")}>
          <Camera aria-hidden size={17} />
          <span className="sr-only">{t("header.photoSearch")}</span>
        </a>
        <button type="submit" className={`${btnPrimary} group/go h-11 shrink-0 px-3.5 text-sm transition-transform duration-150 active:scale-[0.96] sm:px-4`}>
          <span className="sr-only sm:not-sr-only">{converted ? t("search.open") : t("search.browse")}</span>
          {/* Po najechaniu strzałka przejeżdża na wylot, po kliknięciu wystrzeliwuje (klucz zip restartuje animację) */}
          <span aria-hidden="true" className="relative block size-4 overflow-hidden">
            <span key={zip} className={`absolute inset-0 ${zip ? "arrow-zip" : ""}`}>
              <ArrowRight size={16} className="absolute inset-0 transition-transform duration-300 ease-out group-hover/go:translate-x-[140%]" />
              <ArrowRight size={16} className="absolute inset-0 -translate-x-[140%] transition-transform duration-300 ease-out group-hover/go:translate-x-0" />
            </span>
          </span>
        </button>
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
