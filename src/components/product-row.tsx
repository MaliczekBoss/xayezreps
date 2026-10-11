"use client";

import type { DictKey } from "@/lib/dict";
import type { Find } from "@/lib/finds";
import { useFormat } from "@/lib/use-format";
import { Carousel } from "./carousel";
import { ProductCard } from "./product-card";
import { SectionTitle } from "./ui";

type ProductRowProps = {
  id: string;
  title: [DictKey, DictKey];
  href: string;
  items: Find[];
  /** Produkty z plakietką „Nowy” */
  newIds?: string[];
};

export function ProductRow({ id, title, href, items, newIds = [] }: ProductRowProps) {
  const f = useFormat();
  const heading: [string, string] = [f.t(title[0]), f.t(title[1])];

  return (
    <section id={id} aria-labelledby={`${id}-title`} className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <SectionTitle id={`${id}-title`} title={heading} count={items.length} href={href} linkLabel={f.t("rows.seeAll")} />
      <Carousel label={heading.join(" ")}>
        {items.map((item) => (
          <li key={item.id} className="w-[70%] shrink-0 snap-start min-[480px]:w-[44%] md:w-[31%] lg:w-[calc((100%-3rem)/4.25)]">
            <ProductCard find={item} isNew={newIds.includes(item.id)} />
          </li>
        ))}
      </Carousel>
    </section>
  );
}

