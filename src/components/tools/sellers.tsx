"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useRef, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import type { SellerItem } from "@/lib/remote";
import { toSellerFind } from "@/lib/seller-find";
import { site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";
import { PageHeader } from "../page";
import { ProductCard } from "../product-card";
import { ProductImage } from "../product-image";
import { Select } from "../select";

export type SellerStats = {
  itemCount: number;
  minPrice: number;
  maxPrice: number;
  cheapest: { title: string; price: number } | null;
};

export type SellerSummary = SellerStats & {
  slug: string;
  name: string;
  description: string;
  thumbs: string[];
};

/** Mozaika zdjęć dopasowana do liczby produktów: jedno duże, a obok mniejsze, gdy jest z czego */
function Mosaic({ thumbs }: { thumbs: string[] }) {
  if (thumbs.length < 3) {
    return (
      <span className="relative block aspect-[16/10] overflow-hidden rounded-lg bg-[#1c1c1f]">
        <ProductImage src={thumbs[0]} sizes="(min-width: 1024px) 24rem, 90vw" className="transition-transform duration-500 group-hover:scale-[1.03]" />
      </span>
    );
  }
  return (
    <span className="grid aspect-[16/10] grid-cols-3 grid-rows-2 gap-1.5">
      <span className="relative col-span-2 row-span-2 overflow-hidden rounded-lg bg-[#1c1c1f]">
        <ProductImage src={thumbs[0]} sizes="(min-width: 1024px) 16rem, 60vw" className="transition-transform duration-500 group-hover:scale-[1.03]" />
      </span>
      {thumbs.slice(1, 3).map((src) => (
        <span key={src} className="relative overflow-hidden rounded-lg bg-[#1c1c1f]">
          <ProductImage src={src} sizes="8rem" />
        </span>
      ))}
    </span>
  );
}

/** Karta sklepu: mozaika produktów, nazwa, liczba produktów i zakres cen (lista sprzedawców i rząd na stronie głównej) */
export function SellerTile({ seller: s, description = true }: { seller: SellerSummary; description?: boolean }) {
  const f = useFormat();
  const { t } = f;
  return (
    <Link href={site.routes.seller(s.slug)} className="group block">
      <Mosaic thumbs={s.thumbs} />
      <span className="mt-3 flex items-baseline justify-between gap-3">
        <span className="truncate text-[15px] font-semibold group-hover:underline">{s.name}</span>
        <span className="shrink-0 text-sm text-muted tabular">{t("sellers.items", { n: s.itemCount })}</span>
      </span>
      <span className="mt-1 block text-sm text-muted">
        {s.minPrice === s.maxPrice ? (
          <span className="font-mono text-fg tabular">{f.money(s.minPrice)}</span>
        ) : (
          <>
            {t("sellers.from")} <span className="font-mono text-fg tabular">{f.money(s.minPrice)}</span> {t("sellers.to")}{" "}
            <span className="font-mono text-fg tabular">{f.money(s.maxPrice)}</span>
          </>
        )}
      </span>
      {description && s.description && <span className="mt-1 line-clamp-2 block text-sm text-dim">{s.description}</span>}
    </Link>
  );
}

export function SellersList({ sellers }: { sellers: SellerSummary[] }) {
  const f = useFormat();
  const { t } = f;
  const total = sellers.reduce((sum, s) => sum + s.itemCount, 0);

  return (
    <>
      <PageHeader
        crumbs={[{ label: t("nav.sellers") }]}
        title={[t("sellers.title1"), t("sellers.title2")]}
        lead={sellers.length ? t("sellers.leadStats", { shops: sellers.length, items: total.toLocaleString(f.locale) }) : t("sellers.lead")}
      />

      {sellers.length === 0 ? (
        <p className="border-y border-line py-8 text-muted">{t("sellers.empty")}</p>
      ) : (
        <ul className="grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {sellers.map((s) => (
            <li key={s.slug}>
              <SellerTile seller={s} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

type Sort = "" | "price_asc" | "price_desc";

type SellerShopProps = {
  seller: { slug: string; name: string; description: string } & SellerStats;
  initial: SellerItem[];
};

/** Produkty sklepu: pierwsza porcja przychodzi z serwera, kolejne, wyszukiwanie i sortowanie z /api/sellers/{slug} */
export function SellerShop({ seller, initial }: SellerShopProps) {
  const f = useFormat();
  const { t } = f;
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("");
  const deferred = useDeferredValue(query.trim());
  const [items, setItems] = useState(initial);
  const [total, setTotal] = useState(seller.itemCount);
  const [loading, setLoading] = useState(false);
  const first = useRef(true);

  const load = (q: string, s: Sort, offset: number, signal?: AbortSignal) => {
    setLoading(true);
    return fetch(`/api/sellers/${seller.slug}?q=${encodeURIComponent(q)}&sort=${s}&offset=${offset}`, { signal })
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
    const timer = window.setTimeout(() => load(deferred, sort, 0, ctrl.signal), 250);
    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
    // load zależy tylko od sluga, który się nie zmienia
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferred, sort]);

  const stats: [string, ReactNode][] = [
    [t("seller.statItems"), t("sellers.items", { n: seller.itemCount })],
    [
      t("seller.statPrices"),
      seller.minPrice === seller.maxPrice ? (
        <span className="font-mono tabular">{f.money(seller.minPrice)}</span>
      ) : (
        <span className="font-mono tabular">
          {f.money(seller.minPrice)} – {f.money(seller.maxPrice)}
        </span>
      ),
    ],
    ...(seller.cheapest
      ? [
          [
            t("seller.statCheapest"),
            <span key="c" className="flex min-w-0 items-baseline gap-2">
              <span className="truncate">{seller.cheapest.title}</span>
              <span className="shrink-0 font-mono font-normal text-muted tabular">{f.money(seller.cheapest.price)}</span>
            </span>,
          ] as [string, ReactNode],
        ]
      : []),
  ];

  return (
    <>
      <PageHeader crumbs={[{ label: t("nav.sellers"), href: site.routes.sellers }, { label: seller.name }]} title={[seller.name, ""]} lead={seller.description || undefined}>
        <dl className="mt-6 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
          {stats.map(([label, value], i) => (
            <div key={label} className={`min-w-0 bg-card px-4 py-3 ${i === 2 ? "col-span-2 sm:col-span-1" : ""}`}>
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="mt-1 text-sm font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
        <Select
          label={t("finds.sort")}
          value={sort}
          onChange={(v) => setSort(v as Sort)}
          options={[
            { value: "", label: t("seller.sortDefault") },
            { value: "price_asc", label: t("sort.priceAsc") },
            { value: "price_desc", label: t("sort.priceDesc") },
          ]}
          className="sm:w-52"
        />
        <p className="text-sm text-muted sm:ml-auto" aria-live="polite">
          {t("finds.count", { shown: Math.min(items.length, total), total })}
        </p>
      </div>

      {items.length === 0 && !loading ? (
        <p className="mt-6 border-y border-line py-8 text-muted">{t("finds.empty")}</p>
      ) : (
        <ul className={`mt-5 grid grid-cols-2 gap-x-2.5 gap-y-6 transition-opacity sm:grid-cols-3 sm:gap-x-3 md:grid-cols-4 lg:grid-cols-5 ${loading && items.length ? "opacity-60" : ""}`}>
          {items.map((item) => {
            const find = toSellerFind(seller.slug, item);
            return find ? (
              <li key={item.id}>
                <ProductCard find={find} />
              </li>
            ) : null;
          })}
        </ul>
      )}

      {items.length < total && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            disabled={loading}
            onClick={() => load(deferred, sort, items.length)}
            className="inline-flex h-11 items-center rounded-xl border border-line bg-card px-6 text-sm font-semibold hover:border-line-strong disabled:opacity-60"
          >
            {t("finds.more")}
          </button>
        </div>
      )}
    </>
  );
}
