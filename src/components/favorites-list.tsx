"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Heart, ShoppingBag } from "lucide-react";
import { favoriteActions, useFavorites } from "@/lib/favorites";
import type { Find } from "@/lib/finds";
import { haulActions } from "@/lib/haul";
import { site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";
import { PageHeader } from "./page";
import { ProductCard } from "./product-card";

export function FavoritesList() {
  const { t } = useFormat();
  const favorites = useFavorites();
  const ids = useMemo(
    () =>
      Object.entries(favorites)
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => id),
    [favorites],
  );
  const [known, setKnown] = useState<Record<string, Find | null>>({});
  const missing = ids.filter((id) => !(id in known)).join(",");

  useEffect(() => {
    if (!missing) return;
    const ctrl = new AbortController();
    fetch(`/api/finds?ids=${encodeURIComponent(missing)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { items: Find[] }) =>
        setKnown((k) => {
          const next = { ...k };
          for (const id of missing.split(",")) next[id] = null;
          for (const f of d.items) next[f.id] = f;
          return next;
        }),
      )
      .catch(() => {});
    return () => ctrl.abort();
  }, [missing]);

  const loading = Boolean(missing);
  const items = ids.flatMap((id) => (known[id] ? [known[id]!] : []));

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

      {loading && items.length === 0 ? (
        <div aria-hidden="true" className="grid animate-pulse grid-cols-2 gap-x-2.5 gap-y-6 sm:grid-cols-3 sm:gap-x-3 md:grid-cols-4 lg:grid-cols-5">
          {ids.slice(0, 10).map((id) => (
            <div key={id} className="aspect-square rounded-[14px] bg-card" />
          ))}
        </div>
      ) : items.length === 0 ? (
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
