"use client";

import Link from "next/link";
import { Images } from "lucide-react";
import type { QcEntry } from "@/lib/qc-feed";
import { site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";
import { Carousel, cardSlot } from "./carousel";
import { ProductImage } from "./product-image";
import { SectionTitle } from "./ui";

const qcHref = (url: string) => `${site.routes.qcFinder}?url=${encodeURIComponent(url)}`;

/** Ostatnie zdjęcia QC: okładka ze zdjęcia z magazynu, liczba zdjęć, nazwa i cena na zdjęciu */
export function QcFeed({ entries }: { entries: QcEntry[] }) {
  const f = useFormat();
  const { t } = f;
  if (entries.length === 0) return null;
  const heading: [string, string] = [t("qc.title1"), t("qc.title2")];

  return (
    <section id="qc" aria-labelledby="qc-title" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <SectionTitle id="qc-title" title={heading} href={site.routes.qcFinder} linkLabel={t("rows.seeAll")} />
      <Carousel label={heading.join(" ")}>
        {entries.map((entry) => (
          <li key={entry.id} className={cardSlot}>
            <Link
              href={qcHref(entry.url)}
              className="group relative block aspect-[4/5] overflow-hidden rounded-[10px] border border-line bg-card transition-colors hover:border-line-strong"
            >
              <ProductImage src={entry.cover} sizes="(min-width: 768px) 14rem, 12rem" className="transition-transform duration-300 group-hover:scale-[1.03]" />
              <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-md bg-[#18181b]/85 px-2 py-1 text-[11px] font-medium backdrop-blur tabular">
                <Images aria-hidden size={12} />
                {entry.photos}
                <span className="sr-only">{t("photos", { n: entry.photos })}</span>
              </span>
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-3 pb-3 pt-10">
                <span className="line-clamp-2 text-[13px] font-semibold leading-snug text-white">{entry.name}</span>
                <span className="mt-1 block font-mono text-[13px] text-white tabular">{f.money(entry.pricePln)}</span>
              </span>
            </Link>
          </li>
        ))}
      </Carousel>
    </section>
  );
}
