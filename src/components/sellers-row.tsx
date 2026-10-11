"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";
import { Carousel } from "./carousel";
import { ProductImage } from "./product-image";
import { SectionTitle } from "./ui";

type SellerCard = { slug: string; name: string; itemCount: number; image: string };

/** Najlepsi sprzedawcy: karta z miniaturą sklepu, nazwą, liczbą produktów i „Więcej” */
export function SellersRow({ sellers }: { sellers: SellerCard[] }) {
  const { t } = useFormat();
  if (sellers.length === 0) return null;

  return (
    <section id="sprzedawcy" aria-labelledby="sprzedawcy-title" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <SectionTitle id="sprzedawcy-title" title={[t("rows.sellers"), ""]} href={site.routes.sellers} linkLabel={t("rows.seeAll")} />
      <Carousel label={t("rows.sellers")}>
        {sellers.map((s) => (
          <li key={s.slug} className="w-[17rem] shrink-0 snap-start sm:w-[19rem]">
            <Link
              href={site.routes.seller(s.slug)}
              className="group flex items-center gap-3 rounded-xl border border-line bg-card p-3.5 transition-colors hover:border-line-strong"
            >
              <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-[#1c1c1f]">{s.image && <ProductImage src={s.image} sizes="3rem" />}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{s.name}</span>
                <span className="block text-[13px] text-muted">{t("sellers.items", { n: s.itemCount })}</span>
              </span>
              <span className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-fg px-3.5 text-[13px] font-medium text-bg">
                {t("rows.more")}
                <ArrowRight aria-hidden size={14} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </li>
        ))}
      </Carousel>
    </section>
  );
}
