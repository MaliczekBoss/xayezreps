"use client";

import type { DictKey } from "@/lib/dict";
import type { Category, Find } from "@/lib/finds";
import { useFormat } from "@/lib/use-format";
import { Carousel, cardSlot } from "./carousel";
import { ProductCard } from "./product-card";
import { SectionTitle } from "./ui";

type ProductRowProps = {
  id: string;
  href: string;
  items: Find[];
  title?: DictKey;
  category?: Category;
  newIds?: string[];
};

export function ProductRow({ id, title, category, href, items, newIds = [] }: ProductRowProps) {
  const f = useFormat();
  const heading = title ? f.t(title) : category ? f.category(category) : "";

  return (
    <section id={id} aria-labelledby={`${id}-title`} className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <SectionTitle id={`${id}-title`} title={[heading, ""]} href={href} linkLabel={f.t("rows.seeAll")} />
      <Carousel label={heading}>
        {items.map((item) => (
          <li key={item.id} className={cardSlot}>
            <ProductCard find={item} isNew={newIds.includes(item.id)} />
          </li>
        ))}
      </Carousel>
    </section>
  );
}
