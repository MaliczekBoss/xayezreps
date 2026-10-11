"use client";

import { useState, type FormEvent } from "react";
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
export function HeroSearch() {
  const f = useFormat();
  const { t } = f;
  const router = useRouter();
  const [value, setValue] = useState("");
  const source = parseSource(value);
  const converted = source ? f.buyUrl(source) : null;

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = value.trim();
    if (converted) {
      window.open(converted, "_blank", "noopener");
      notify({ tone: "brand", image: f.agent.logo, title: t("n.converted", { agent: f.agent.name }), text: t("n.convertedText") });
    } else if (/^https?:\/\//i.test(q)) {
      router.push(`${site.routes.qcFinder}?url=${encodeURIComponent(q)}`);
    } else {
      router.push(q ? `${site.routes.finds}?q=${encodeURIComponent(q)}` : site.routes.finds);
    }
  };

  return (
    <div className="mt-8 max-w-[34rem]">
      <form role="search" onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="szukaj" className="sr-only">
          {t("search.label")}
        </label>
        <div className="flex h-11 items-center gap-2.5 rounded-xl border border-line bg-card px-3.5 focus-within:border-line-strong sm:flex-1">
          <Search aria-hidden size={16} className="shrink-0 text-dim" />
          <input
            id="szukaj"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t("search.placeholder")}
            autoComplete="off"
            spellCheck={false}
            className="h-full w-full min-w-0 bg-transparent text-[0.9375rem] text-fg placeholder:text-dim focus:outline-none"
          />
          <a href={site.routes.photoSearch} className="text-dim transition-colors hover:text-fg" title={t("header.photoSearch")}>
            <Camera aria-hidden size={16} />
            <span className="sr-only">{t("header.photoSearch")}</span>
          </a>
        </div>
        <button type="submit" className={`${btnPrimary} h-11 px-4 text-sm`}>
          {converted ? t("search.open") : t("search.browse")}
          <ArrowRight aria-hidden size={15} />
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
