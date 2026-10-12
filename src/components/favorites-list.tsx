"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Heart, ShoppingBag } from "lucide-react";
import { favoriteActions, useFavorites } from "@/lib/favorites";
import type { Find } from "@/lib/finds";
import { haulActions } from "@/lib/haul";
import { site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";
import { PageHeader } from "./page";
import { ProductCard } from "./product-card";

/** Lista ulubionych z tej przeglądarki; dane produktów bierzemy z katalogu */
export function FavoritesList({ finds }: { finds: Find[] }) {
  const { t } = useFormat();
  const favorites = useFavorites();

  const items = useMemo(() => {
    const byId = new Map(finds.map((f) => [f.id, f]));
    return Object.entries(favorites)
      .sort((a, b) => b[1] - a[1])
      .flatMap(([id]) => (byId.has(id) ? [byId.get(id)!] : []));
  }, [finds, favorites]);

  return (
    <>
      <PageHeader crumbs={[{ label: t("nav.favorites") }]} title={[t("fav.title1"), t("fav.title2")]} lead={t("fav.lead")}>
        {items.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => haulActions.addMany(items, t("fav.addedAll"))}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-fg px-4 text-sm font-medium text-bg transition-colors hover:bg-white"
            >
              <ShoppingBag aria-hidden size={16} />
              {t("fav.addAll")}
            </button>
            <button
              type="button"
              onClick={() => favoriteActions.clear()}
              className="inline-flex h-10 items-center rounded-xl border border-line bg-card px-4 text-sm font-medium text-muted transition-colors hover:border-line-strong hover:text-fg"
            >
              {t("fav.clear")}
            </button>
          </div>
        )}
      </PageHeader>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong px-6 py-16 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-xl border border-line bg-card">
            <Heart aria-hidden size={20} />
          </span>
          <p className="mt-4 font-semibold">{t("fav.empty")}</p>
          <p className="mt-1 text-sm text-muted">{t("fav.emptyText")}</p>
          <Link href={site.routes.finds} className="mt-5 inline-flex h-10 items-center rounded-xl bg-fg px-4 text-sm font-medium text-bg hover:bg-white">
            {t("fav.browse")}
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-x-2.5 gap-y-6 sm:grid-cols-3 sm:gap-x-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((item) => (
            <li key={item.id}>
              <ProductCard find={item} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
