"use client";

import Link from "next/link";
import { Camera } from "lucide-react";
import type { Find } from "@/lib/finds";
import { site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";
import { FavoriteButton } from "./favorite-button";
import { HaulToggle } from "./haul-toggle";
import { ProductImage } from "./product-image";

/** Karta produktu jak na cadenreps: zdjęcie z kategorią, nazwa, batch, cena i „Zobacz →” */
export function ProductCard({ find, isNew = false }: { find: Find; isNew?: boolean }) {
  const f = useFormat();
  const { t } = f;
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[10px] border border-line bg-card transition-colors duration-150 hover:border-line-strong">
      <div className="relative aspect-square overflow-hidden bg-[#1c1c1f]">
        <ProductImage
          src={find.image}
          sizes="(min-width: 768px) 14rem, (min-width: 640px) 12.5rem, 11rem"
          className="transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {isNew && <span className="absolute left-2.5 top-2.5 rounded-[5px] bg-gl px-[7px] py-[3px] text-[10px] font-bold leading-none text-white">{t("card.new")}</span>}
        <div className="absolute right-2 top-2 z-10 flex flex-col gap-1.5">
          <FavoriteButton find={find} />
          <HaulToggle find={find} />
        </div>
        <span className="absolute bottom-2.5 left-2.5 rounded-[5px] bg-[#18181b]/80 px-[7px] py-[3px] text-[10px] uppercase leading-[15px] tracking-[1px] text-muted backdrop-blur">
          {f.category(find.category)}
        </span>
        {Boolean(find.qc) && (
          <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-[5px] bg-[#18181b]/80 px-[7px] py-[3px] text-[10px] font-semibold leading-[15px] text-fg backdrop-blur tabular">
            <Camera aria-hidden size={11} />
            <span aria-hidden="true">{t("card.qc", { n: find.qc ?? 0 })}</span>
            <span className="sr-only">{t("card.qcSr", { n: find.qc ?? 0 })}</span>
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 px-[15px] pb-3 pt-[13px]">
        <h3 className="line-clamp-2 min-h-[2.6em] text-[14.5px] font-medium leading-[1.3] tracking-[-0.01em]">
          <Link href={site.routes.product(find.id)} className="after:absolute after:inset-0">
            {find.name}
          </Link>
        </h3>
        <p className="text-[12.5px] text-muted">{find.batch}</p>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-2.5">
          <span className="font-mono text-sm tabular">{f.money(find.pricePln)}</span>
          <span aria-hidden="true" className="text-[12.5px] font-medium text-muted/80 transition-colors group-hover:text-fg">
            {t("card.view")} →
          </span>
        </div>
      </div>
    </article>
  );
}
