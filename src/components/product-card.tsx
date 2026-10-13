"use client";

import Link from "next/link";
import { Camera } from "lucide-react";
import type { Find } from "@/lib/finds";
import { site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";
import { FavoriteButton } from "./favorite-button";
import { HaulToggle } from "./haul-toggle";
import { ProductImage } from "./product-image";

const SIZES = "(min-width: 768px) 14rem, (min-width: 640px) 12.5rem, 11rem";

// Kolor kropki przy batchu: od razu widać, czy to najlepsza wersja, czy budżetowa.
// Zwykły batch („Random”) nic nie mówi, więc zamiast niego karta pokazuje kategorię.
const BATCH_DOT: Record<string, string> = {
  "Best batch": "bg-gl",
  "Budget batch": "bg-amber-400",
};

// Szkło na zdjęciu: liczba QC, kapsuła z serduszkiem i paczką
const glass = "bg-black/50 ring-1 ring-white/10 backdrop-blur-md";

/**
 * Karta findu bez ramki: zdjęcie na kafelku, pod nim nazwa, cena i batch. Po najechaniu produkt
 * podnosi się (klasa .lift w globals.css).
 */
export function ProductCard({ find, isNew = false }: { find: Find; isNew?: boolean }) {
  const f = useFormat();
  const { t } = f;
  const qc = find.qc ?? 0;

  return (
    <article className="group relative flex h-full flex-col">
      <div className="relative aspect-square rounded-[14px]">
        <span className="lift absolute inset-0">
          <ProductImage src={find.image} sizes={SIZES} />
        </span>

        {isNew && <span className="absolute left-2 top-2 rounded-full bg-gl px-2 py-1 text-[10.5px] font-semibold leading-none text-white">{t("card.new")}</span>}

        <div className={`absolute right-2 top-2 z-10 flex flex-col items-center overflow-hidden rounded-full ${glass}`}>
          <FavoriteButton find={find} bare />
          <span aria-hidden="true" className="h-px w-3.5 bg-white/15" />
          <HaulToggle find={find} bare />
        </div>

        {qc > 0 && (
          <span className={`absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium leading-none text-white tabular ${glass}`}>
            <Camera aria-hidden size={11} />
            <span aria-hidden="true">{qc}</span>
            <span className="sr-only">{t("card.qcSr", { n: qc })}</span>
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col px-0.5 pt-2.5">
        <h3 className="line-clamp-2 text-[14px] font-medium leading-[1.3] tracking-[-0.01em] transition-colors group-hover:text-white">
          <Link href={site.routes.product(find.id)} className="after:absolute after:inset-0 after:rounded-[14px]">
            {find.name}
          </Link>
        </h3>
        <div className="mt-auto flex items-baseline justify-between gap-2 pt-1.5">
          <span className="font-mono text-[15px] font-semibold tabular">{find.pricePln > 0 ? f.money(find.pricePln) : "–"}</span>
          <span className="inline-flex min-w-0 items-center gap-1.5 text-[12px] text-muted">
            {BATCH_DOT[find.batch] ? (
              <>
                <span aria-hidden="true" className={`size-1.5 shrink-0 self-center rounded-full ${BATCH_DOT[find.batch]}`} />
                <span className="truncate">{find.batch.replace(/ batch$/i, "")}</span>
              </>
            ) : (
              <span className="truncate">{f.category(find.category)}</span>
            )}
          </span>
        </div>
      </div>
    </article>
  );
}
