"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { parseSource } from "@/lib/agents";
import type { SellerItem } from "@/lib/remote";
import { site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";
import { PageHeader } from "../page";
import { ProductImage } from "../product-image";

export type SellerSummary = {
  slug: string;
  name: string;
  description: string;
  tags: string[];
  itemCount: number;
  thumbs: string[];
};

export function SellersList({ sellers }: { sellers: SellerSummary[] }) {
  const { t } = useFormat();

  return (
    <>
      <PageHeader crumbs={[{ label: t("nav.sellers") }]} title={[t("sellers.title1"), t("sellers.title2")]} lead={t("sellers.lead")} />

      {sellers.length === 0 ? (
        <p className="border-y border-line py-8 text-muted">{t("sellers.empty")}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sellers.map((s) => (
            <li key={s.slug}>
              <Link href={site.routes.seller(s.slug)} className="group block rounded-xl border border-line bg-card p-3 transition-colors hover:border-line-strong">
                <div className="grid grid-cols-4 gap-1.5">
                  {Array.from({ length: 4 }, (_, i) => (
                    <span key={i} className="relative aspect-square overflow-hidden rounded-lg bg-bg">
                      {s.thumbs[i] && <ProductImage src={s.thumbs[i]} sizes="6rem" />}
                    </span>
                  ))}
                </div>
                <div className="px-1 pb-1 pt-3.5">
                  <p className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-semibold">{s.name}</span>
                    <span className="shrink-0 text-sm text-muted tabular">{t("sellers.items", { n: s.itemCount })}</span>
                  </p>
                  {s.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{s.description}</p>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

type SellerShopProps = {
  seller: Omit<SellerSummary, "thumbs">;
  initial: SellerItem[];
};

/** Produkty sklepu: pierwsza porcja przychodzi z serwera, kolejne i wyszukiwanie z /api/sellers/{slug} */
export function SellerShop({ seller, initial }: SellerShopProps) {
  const f = useFormat();
  const { t } = f;
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query.trim());
  const [items, setItems] = useState(initial);
  const [total, setTotal] = useState(seller.itemCount);
  const [loading, setLoading] = useState(false);
  const first = useRef(true);

  const load = (q: string, offset: number, signal?: AbortSignal) => {
    setLoading(true);
    return fetch(`/api/sellers/${seller.slug}?q=${encodeURIComponent(q)}&offset=${offset}`, { signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { total: number; items: SellerItem[] }) => {
        setTotal(d.total);
        setItems((prev) => (offset === 0 ? d.items : [...prev, ...d.items]));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => load(deferred, 0, ctrl.signal), 250);
    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
    // load zależy tylko od sluga, który się nie zmienia
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferred]);

  const buyLink = (item: SellerItem) => {
    const source = parseSource(item.link);
    return source ? f.buyUrl(source) : item.link;
  };

  return (
    <>
      <PageHeader crumbs={[{ label: t("nav.sellers"), href: site.routes.sellers }, { label: seller.name }]} title={[seller.name, ""]} lead={seller.description || undefined} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-80">
          <label htmlFor="seller-search" className="sr-only">
            {t("seller.search")}
          </label>
          <Search aria-hidden size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-dim" />
          <input
            id="seller-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("seller.search")}
            autoComplete="off"
            className="h-11 w-full rounded-xl border border-line bg-card pl-11 pr-4 text-sm text-fg placeholder:text-dim hover:border-line-strong focus:border-line-strong focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
        </div>
        <p className="text-sm text-muted" aria-live="polite">
          {t("finds.count", { shown: Math.min(items.length, total), total })}
        </p>
      </div>

      {items.length === 0 && !loading ? (
        <p className="mt-6 border-y border-line py-8 text-muted">{t("finds.empty")}</p>
      ) : (
        <ul className={`mt-5 grid grid-cols-2 gap-2.5 transition-opacity sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 ${loading && items.length ? "opacity-60" : ""}`}>
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={buyLink(item)}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="group block overflow-hidden rounded-[10px] border border-line bg-card transition-colors hover:border-line-strong"
              >
                <span className="relative block aspect-square bg-bg">
                  <ProductImage src={item.image} sizes="(min-width: 1024px) 16rem, 50vw" />
                </span>
                <span className="block p-3">
                  <span className="line-clamp-2 min-h-[2.5em] text-sm font-medium leading-snug">{item.title}</span>
                  <span className="mt-2 flex items-center justify-between gap-2">
                    <span className="font-mono text-sm tabular">{f.money(item.price)}</span>
                    <span className="text-xs text-muted group-hover:text-fg">{t("card.buy", { agent: f.agent.name })}</span>
                  </span>
                </span>
                <span className="sr-only">{t("newTab")}</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {items.length < total && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            disabled={loading}
            onClick={() => load(deferred, items.length)}
            className="inline-flex h-11 items-center rounded-xl border border-line bg-card px-6 text-sm font-semibold hover:border-line-strong disabled:opacity-60"
          >
            {t("finds.more")}
          </button>
        </div>
      )}
    </>
  );
}
