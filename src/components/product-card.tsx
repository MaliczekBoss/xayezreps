"use client";

import { ArrowUpRight, Eye } from "lucide-react";
import type { Find } from "@/lib/finds";
import { site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";
import { HaulToggle } from "./haul-toggle";
import { ProductImage } from "./product-image";

const batchDot: Record<string, string> = {
  "Best batch": "bg-brand-bright",
  "Budget batch": "bg-gl",
};

/** Karta produktu: zdjęcie z ceną, kategoria, batch, wyświetlenia i link do agenta */
export function ProductCard({ find, isNew = false }: { find: Find; isNew?: boolean }) {
  const f = useFormat();
  const { t } = f;
  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-line bg-card p-1.5 transition-colors hover:border-line-strong">
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-bg">
        <ProductImage
          src={find.image}
          sizes="(min-width: 1024px) 15rem, (min-width: 768px) 31vw, (min-width: 480px) 44vw, 70vw"
          className="transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:scale-[1.04]"
        />
        <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-black/65 px-2.5 py-1 text-[0.6875rem] font-medium backdrop-blur">{f.category(find.category)}</span>
          {isNew && <span className="rounded-full bg-brand px-2.5 py-1 text-[0.6875rem] font-semibold text-white">{t("card.new")}</span>}
        </div>
        <HaulToggle find={find} className="absolute right-2.5 top-2.5 z-10" />
        <span className="absolute bottom-2.5 left-2.5 rounded-full bg-fg px-2.5 py-1 text-[0.8125rem] font-semibold text-bg tabular">
          {f.money(find.pricePln)}
        </span>
      </div>

      <div className="flex flex-1 flex-col px-2.5 pb-2 pt-3">
        <h3 className="line-clamp-2 text-[0.9375rem] font-semibold leading-snug">
          <a href={site.routes.product(find.id)} className="after:absolute after:inset-0 after:rounded-2xl">
            {find.name}
          </a>
        </h3>
        <div aria-hidden="true" className="min-h-3 flex-1" />
        <div className="flex items-center justify-between gap-2 text-[0.8125rem] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className={`size-1.5 rounded-full ${batchDot[find.batch] ?? "bg-dim"}`} />
            {find.batch}
          </span>
          <span className="inline-flex items-center gap-1 text-dim tabular">
            <Eye aria-hidden size={13} />
            {find.views}
            <span className="sr-only">{t("card.views")}</span>
          </span>
        </div>
        <a
          href={f.buyUrl(find.source)}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="relative z-10 mt-3 inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-line bg-bg text-[0.8125rem] font-medium transition-colors hover:border-brand hover:bg-brand hover:text-white"
        >
          {t("card.buy", { agent: f.agent.name })}
          <ArrowUpRight aria-hidden size={14} />
          <span className="sr-only">
            : {find.name} {t("newTab")}
          </span>
        </a>
      </div>
    </article>
  );
}
