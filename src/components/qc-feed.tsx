"use client";

import { Camera, Images } from "lucide-react";
import { qcFeed } from "@/lib/qc-feed";
import { site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";
import { Carousel } from "./carousel";
import { ProductImage } from "./product-image";
import { SectionTitle } from "./ui";

const qcHref = (url: string) => `${site.routes.qcFinder}?url=${encodeURIComponent(url)}`;

export function QcFeed() {
  const f = useFormat();
  const { t } = f;
  const heading: [string, string] = [t("qc.title1"), t("qc.title2")];

  return (
    <section id="qc" aria-labelledby="qc-title" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <SectionTitle id="qc-title" title={heading} count={qcFeed.length} href={site.routes.qcFinder} linkLabel={t("qc.open")} />
      <Carousel label={heading.join(" ")}>
        {qcFeed.map((entry) => (
          <li key={entry.url} className="w-[70%] shrink-0 snap-start min-[480px]:w-[44%] md:w-[31%] lg:w-[calc((100%-3rem)/4.25)]">
            <a
              href={qcHref(entry.url)}
              className="group flex h-full flex-col rounded-2xl border border-line bg-card p-1.5 transition-colors hover:border-line-strong"
            >
              <span className="relative block aspect-square overflow-hidden rounded-xl bg-bg">
                {entry.image ? (
                  <ProductImage
                    src={entry.image}
                    sizes="(min-width: 1024px) 15rem, 70vw"
                    className="transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:scale-[1.04]"
                  />
                ) : (
                  <span className="absolute inset-0 grid place-items-center text-dim">
                    <Camera aria-hidden size={28} strokeWidth={1.5} />
                  </span>
                )}
                <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-[0.6875rem] font-medium backdrop-blur tabular">
                  <Images aria-hidden size={12} />
                  {t("photos", { n: entry.photos })}
                </span>
              </span>
              <span className="flex flex-1 flex-col px-2.5 pb-2 pt-3">
                <span className="line-clamp-2 text-sm font-semibold leading-snug">{entry.title}</span>
                <span className="mt-auto flex items-center justify-between pt-3 text-[0.8125rem] text-muted">
                  <span>{entry.source}</span>
                  {entry.priceCny && <span className="font-mono text-xs tabular">{f.moneyCny(entry.priceCny)}</span>}
                </span>
              </span>
            </a>
          </li>
        ))}
      </Carousel>
    </section>
  );
}
