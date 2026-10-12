"use client";

import { site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";
import { Carousel } from "./carousel";
import { SellerTile, type SellerSummary } from "./tools/sellers";
import { SectionTitle } from "./ui";

/** Najlepsi sprzedawcy: te same karty co na podstronie sprzedawców, w karuzeli */
export function SellersRow({ sellers }: { sellers: SellerSummary[] }) {
  const { t } = useFormat();
  if (sellers.length === 0) return null;

  return (
    <section id="sprzedawcy" aria-labelledby="sprzedawcy-title" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <SectionTitle id="sprzedawcy-title" title={[t("rows.sellers"), ""]} href={site.routes.sellers} linkLabel={t("rows.seeAll")} />
      <Carousel label={t("rows.sellers")}>
        {sellers.map((s) => (
          <li key={s.slug} className="w-[17.5rem] shrink-0 snap-start sm:w-[20rem]">
            <SellerTile seller={s} description={false} />
          </li>
        ))}
      </Carousel>
    </section>
  );
}
