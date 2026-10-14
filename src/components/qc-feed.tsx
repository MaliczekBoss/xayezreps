"use client";

import Link from "next/link";
import { Images } from "lucide-react";
import type { QcEntry } from "@/lib/qc-feed";
import { site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";
import { ProductImage } from "./product-image";
import { SectionTitle } from "./ui";

const qcHref = (url: string) => `${site.routes.qcFinder}?url=${encodeURIComponent(url)}`;

export function QcFeed({ entries }: { entries: QcEntry[] }) {
  const f = useFormat();
  const { t } = f;
  if (entries.length === 0) return null;
  const heading = `${t("qc.title1")} ${t("qc.title2")}`;

  const tile = (entry: QcEntry, copy: boolean) => (
    <li key={`${entry.id}-${copy ? "b" : "a"}`} aria-hidden={copy || undefined} className={`mr-3 w-[11.5rem] shrink-0 sm:w-[13.5rem] ${copy ? "motion-reduce:hidden" : ""}`}>
      <Link
        href={qcHref(entry.url)}
        tabIndex={copy ? -1 : undefined}
        className="group relative block aspect-[4/5] overflow-hidden rounded-[10px] border border-line bg-card transition-colors hover:border-fg/60"
      >
        <ProductImage src={entry.cover} sizes="14rem" className="transition-transform duration-500 group-hover:scale-[1.05]" />
        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-[#18181b]/85 px-1.5 py-1 text-[11px] font-medium backdrop-blur tabular">
          <Images aria-hidden size={12} />
          {entry.photos}
          <span className="sr-only">{t("photos", { n: entry.photos })}</span>
        </span>
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-3 pb-3 pt-10">
          <span className="line-clamp-2 text-[13px] font-semibold leading-snug text-white">{entry.name}</span>
          <span className="mt-1 block font-mono text-[13px] text-white/90 tabular">{f.money(entry.pricePln)}</span>
        </span>
      </Link>
    </li>
  );

  return (
    <section id="qc" aria-labelledby="qc-title" className="py-8 sm:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionTitle id="qc-title" title={[t("qc.title1"), t("qc.title2")]} href={site.routes.qcFinder} linkLabel={t("rows.seeAll")} />
      </div>
      <div className="mt-5 overflow-x-auto [mask-image:linear-gradient(to_right,transparent,#000_4%,#000_96%,transparent)] [scrollbar-width:none] motion-safe:overflow-hidden [&::-webkit-scrollbar]:hidden">
        <ul aria-label={heading} className="marquee flex w-max">
          {entries.map((e) => tile(e, false))}
          {entries.map((e) => tile(e, true))}
        </ul>
      </div>
    </section>
  );
}
