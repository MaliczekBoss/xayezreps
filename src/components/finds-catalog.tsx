"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Camera, LayoutGrid, Search, Table2, X } from "lucide-react";
import type { CatalogFacets, CatalogPage } from "@/lib/catalog";
import type { DictKey } from "@/lib/dict";
import { batches, type Find } from "@/lib/finds";
import { useLivePricePln } from "@/lib/price-sync";
import { site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";
import { FavoriteButton } from "./favorite-button";
import { PageHeader } from "./page";
import { ProductCard } from "./product-card";
import { ProductImage } from "./product-image";
import { Select } from "./select";
import { btnPrimary } from "./ui";

type Sort = "random" | "popular" | "newest" | "priceAsc" | "priceDesc" | "qc";
const SORTS: Sort[] = ["random", "popular", "newest", "priceAsc", "priceDesc", "qc"];

const field =
  "h-11 rounded-xl border border-line bg-card px-4 text-sm text-fg transition-colors hover:border-line-strong focus:border-line-strong focus:outline-none";

/** seed – ziarno kolejności „Losowo” (puste przy innym sortowaniu) */
type Filters = { q: string; category: string; batch: string; sort: string; qcOnly: boolean; seed: string };

/** Klucz zestawu filtrów: te same filtry = ta sama porcja katalogu */
const keyOf = ({ q, category, batch, sort, qcOnly, seed }: Filters) => JSON.stringify([q, category, batch, sort, qcOnly, seed]);

const urlOf = ({ q, category, batch, sort, qcOnly, seed }: Filters, offset = 0) => {
  const next = new URLSearchParams();
  if (q) next.set("q", q);
  if (category) next.set("category", category);
  if (batch) next.set("batch", batch);
  if (sort) next.set("sort", sort);
  if (qcOnly) next.set("qc", "1");
  if (seed) next.set("seed", seed);
  if (offset) next.set("offset", String(offset));
  return `/api/finds?${next}`;
};

// Ile pierwszych zdjęć z kategorii pobieramy zawczasu, gdy ktoś najedzie na jej zakładkę
const PRELOAD_IMAGES = 10;

/**
 * Katalog: pierwszą porcję renderuje serwer dla filtrów z adresu, a każdą zmianę (wpisywanie, kategoria,
 * batch, sortowanie, „Pokaż więcej”) dociąga z /api/finds. Filtry zmieniają adres bez przeładowania strony.
 */
export function FindsCatalog({ facets, initial, seed }: { facets: CatalogFacets; initial: CatalogPage; seed: string }) {
  const f = useFormat();
  const { t } = f;
  const pathname = usePathname();
  const params = useSearchParams();

  const [query, setQuery] = useState(params.get("q") ?? "");
  const deferredQuery = useDeferredValue(query.trim());
  const category = params.get("category") ?? "";
  const batch = params.get("batch") ?? "";
  const sortParam = params.get("sort") as Sort | null;
  const validSort = sortParam && SORTS.includes(sortParam) ? sortParam : null;
  const sort: Sort = validSort ?? "random";
  const qcOnly = params.get("qc") === "1";
  const sheet = params.get("view") === "sheet";
  // Bez wybranego sortowania jest losowo, chyba że ktoś coś wpisał – wtedy liczy się trafność
  const randomOrder = validSort === "random" || (!validSort && !deferredQuery);

  const filters: Filters = { q: deferredQuery, category, batch, sort: validSort ?? "", qcOnly, seed: randomOrder ? seed : "" };
  const filterKey = keyOf(filters);
  const [data, setData] = useState(() => ({ key: filterKey, page: initial }));
  const [loading, setLoading] = useState(false);
  const loadedKey = useRef(data.key);

  // Porcje pobrane w tej wizycie (także zawczasu): powrót do kategorii albo kliknięcie w nią jest natychmiastowe
  const pending = useRef(new Map<string, Promise<CatalogPage>>());
  const ready = useRef(new Map<string, CatalogPage>([[data.key, initial]]));

  const getPage = (wanted: Filters) => {
    const key = keyOf(wanted);
    let promise = pending.current.get(key);
    if (!promise) {
      promise = fetch(urlOf(wanted)).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))));
      pending.current.set(key, promise);
      promise.then(
        (page) => ready.current.set(key, page),
        () => pending.current.delete(key),
      );
    }
    return promise;
  };

  /** Pobiera kategorię zawczasu; z images – także jej pierwsze zdjęcia (po najechaniu myszką) */
  const prefetchCategory = (c: string, images = false) => {
    const promise = getPage({ ...filters, category: c });
    if (images)
      promise
        .then((page) => page.items.slice(0, PRELOAD_IMAGES).forEach((item) => item.image && (new Image().src = item.image)))
        .catch(() => {});
  };

  // Nowe filtry: pokazujemy porcję od razu, jeśli już ją mamy, a jeśli nie – dociągamy (przy wpisywaniu z małym opóźnieniem)
  useEffect(() => {
    if (loadedKey.current === filterKey) return;
    const cached = ready.current.get(filterKey);
    if (cached) {
      loadedKey.current = filterKey;
      setData({ key: filterKey, page: cached });
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(
      () => {
        setLoading(true);
        getPage(filters)
          .then((page) => {
            if (cancelled) return;
            loadedKey.current = filterKey;
            setData({ key: filterKey, page });
          })
          .catch(() => {})
          .finally(() => !cancelled && setLoading(false));
      },
      deferredQuery ? 180 : 0,
    );
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // getPage i filters wynikają z tych samych wartości co filterKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  // Gdy strona już stoi, po cichu pobieramy wszystkie kategorie z obecnymi filtrami, żeby przełączanie było natychmiastowe
  useEffect(() => {
    if (deferredQuery) return;
    const queue = ["", ...facets.counts.map(([c]) => c)];
    let i = 0;
    let timer = window.setTimeout(function step() {
      if (i >= queue.length) return;
      prefetchCategory(queue[i++]);
      timer = window.setTimeout(step, 120);
    }, 1500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch, validSort, qcOnly, deferredQuery]);

  const loadMore = () => {
    setLoading(true);
    const key = data.key;
    fetch(urlOf(filters, data.page.items.length))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((page: CatalogPage) => setData((d) => (d.key === key ? { key, page: { ...page, items: [...d.page.items, ...page.items] } } : d)))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  // Filtry trafiają do adresu bez przeładowania (strona nie renderuje się od nowa na serwerze)
  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    window.history.replaceState(null, "", `${pathname}${next.size ? `?${next}` : ""}`);
  };

  const page = data.page;
  const items = page.items;
  const stale = data.key !== filterKey;
  const countOf = new Map(facets.counts);
  const filtered = Boolean(category || batch || qcOnly || query.trim());

  const reset = () => {
    setQuery("");
    window.history.replaceState(null, "", pathname);
  };

  return (
    <>
      <PageHeader crumbs={[{ label: t("footer.finds") }]} title={[t("finds.title1"), t("finds.title2")]} lead={t("finds.lead", { n: facets.all })} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <label htmlFor="finds-search" className="sr-only">
            {t("finds.search")}
          </label>
          <Search aria-hidden size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-dim" />
          <input
            id="finds-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onBlur={() => setParam("q", query.trim())}
            placeholder={t("finds.search")}
            autoComplete="off"
            className={`${field} w-full pl-11 pr-10 [&::-webkit-search-cancel-button]:hidden`}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setParam("q", "");
              }}
              className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-bg hover:text-fg"
            >
              <X aria-hidden size={14} />
              <span className="sr-only">{t("finds.reset")}</span>
            </button>
          )}
          {!query && (
            <Link
              href={site.routes.photoSearch}
              title={t("header.photoSearch")}
              className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-dim hover:bg-bg hover:text-fg"
            >
              <Camera aria-hidden size={16} />
              <span className="sr-only">{t("header.photoSearch")}</span>
            </Link>
          )}
        </div>
        <div className="flex gap-2">
          <Select
            label="Batch"
            value={batch}
            onChange={(v) => setParam("batch", v)}
            options={[{ value: "", label: t("finds.batchAll") }, ...batches.map((b) => ({ value: b, label: b }))]}
            className="flex-1 lg:w-44 lg:flex-none"
          />
          <Select
            label={t("finds.sort")}
            value={sort}
            onChange={(v) => setParam("sort", v === "random" ? "" : v)}
            options={SORTS.map((s) => ({ value: s, label: t(`sort.${s}` as DictKey) }))}
            className="flex-1 lg:w-52 lg:flex-none"
          />
        </div>
      </div>

      <div role="group" aria-label={t("product.category")} className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        {["", ...facets.counts.map(([c]) => c)].map((c) => {
          const active = category === c;
          return (
            <button
              key={c || "all"}
              type="button"
              aria-pressed={active}
              onPointerEnter={() => prefetchCategory(c, true)}
              onFocus={() => prefetchCategory(c, true)}
              onClick={() => setParam("category", c)}
              className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-[0.8125rem] font-medium transition-colors ${
                active ? "border-fg bg-fg text-bg" : "border-line bg-card text-muted hover:border-line-strong hover:text-fg"
              }`}
            >
              {c ? f.category(c) : t("finds.all")}
              <span className="font-mono text-[0.6875rem] text-dim tabular">{c ? countOf.get(c) : facets.all}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {facets.hasQc && (
            <button
              type="button"
              aria-pressed={qcOnly}
              onClick={() => setParam("qc", qcOnly ? "" : "1")}
              className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3.5 text-[0.8125rem] font-medium transition-colors ${
                qcOnly ? "border-fg bg-fg text-bg" : "border-line bg-card text-muted hover:border-line-strong hover:text-fg"
              }`}
            >
              <Camera aria-hidden size={14} />
              {t("finds.qcOnly")}
            </button>
          )}
          <p className="text-sm text-muted" aria-live="polite">
            {t("finds.count", { shown: items.length, total: page.total })}
          </p>
        </div>
        <div role="group" aria-label={t("finds.viewGrid")} className="flex rounded-xl border border-line bg-card p-1">
          {[
            { id: "", label: t("finds.viewGrid"), Icon: LayoutGrid },
            { id: "sheet", label: t("finds.viewTable"), Icon: Table2 },
          ].map(({ id, label, Icon }) => {
            const active = id === "sheet" ? sheet : !sheet;
            return (
              <button
                key={label}
                type="button"
                aria-pressed={active}
                onClick={() => setParam("view", id)}
                className={`inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors ${active ? "bg-fg text-bg" : "text-muted hover:text-fg"}`}
              >
                <Icon aria-hidden size={14} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {(page.corrected || page.relaxed) && page.total > 0 && (
        <p className="mt-4 text-sm text-muted">
          {page.corrected && t("finds.corrected", { q: page.corrected })}
          {page.corrected && page.relaxed && " "}
          {page.relaxed && t("finds.relaxed")}
        </p>
      )}

      {page.total === 0 && !stale ? (
        <div className="mt-4 rounded-2xl border border-dashed border-line px-6 py-16 text-center">
          <p className="font-semibold">{t("finds.empty")}</p>
          <p className="mt-1.5 text-sm text-muted">{t("finds.emptyText")}</p>
          {filtered && (
            <button type="button" onClick={reset} className={`${btnPrimary} mt-6 h-10 px-5 text-sm`}>
              {t("finds.reset")}
            </button>
          )}
        </div>
      ) : (
        <div className={`transition-opacity duration-200 ${stale || loading ? "opacity-60" : ""}`} aria-busy={stale || loading}>
          {sheet ? (
            <FindsSheet items={items} />
          ) : (
            <ul className="mt-4 grid grid-cols-2 gap-x-2.5 gap-y-6 sm:grid-cols-3 sm:gap-x-3 md:grid-cols-4 lg:grid-cols-5">
              {items.map((item) => (
                <li key={item.id}>
                  <ProductCard find={item} />
                </li>
              ))}
            </ul>
          )}
          {items.length < page.total && !stale && (
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                disabled={loading}
                onClick={loadMore}
                className="inline-flex h-11 items-center rounded-xl border border-line bg-card px-6 text-sm font-semibold hover:border-line-strong disabled:opacity-60"
              >
                {t("finds.more")}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/** Widok arkusza: zwarta tabela findów z ceną i linkiem do agenta, jak w spreadsheetach */
function FindsSheet({ items }: { items: Find[] }) {
  const f = useFormat();
  const { t } = f;
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            <th scope="col" className="px-3 py-2.5 font-medium sm:px-4">
              {t("table.product")}
            </th>
            <th scope="col" className="hidden px-3 py-2.5 font-medium md:table-cell">
              {t("table.batch")}
            </th>
            <th scope="col" className="hidden px-3 py-2.5 font-medium sm:table-cell">
              {t("table.qc")}
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">
              {t("table.price")}
            </th>
            <th scope="col" className="px-3 py-2.5 sm:pr-4">
              <span className="sr-only">{t("table.buy")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-line/70 transition-colors last:border-0 hover:bg-white/[0.03]">
              <td className="px-3 py-2 sm:px-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="relative size-11 shrink-0">
                    <ProductImage src={item.image} sizes="2.75rem" />
                  </span>
                  <span className="min-w-0">
                    <Link href={site.routes.product(item.id)} className="line-clamp-1 font-medium hover:underline">
                      {item.name}
                    </Link>
                    <span className="block text-xs text-muted">{f.category(item.category)}</span>
                  </span>
                </div>
              </td>
              <td className="hidden whitespace-nowrap px-3 py-2 text-muted md:table-cell">{item.batch}</td>
              <td className="hidden px-3 py-2 sm:table-cell">
                {item.qc ? (
                  <span className="inline-flex items-center gap-1 text-[13px] tabular">
                    <Camera aria-hidden size={13} className="text-muted" />
                    {item.qc}
                  </span>
                ) : (
                  <span className="text-dim">–</span>
                )}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right font-mono tabular">
                <LivePrice find={item} />
              </td>
              <td className="px-3 py-2 sm:pr-4">
                <div className="flex items-center justify-end gap-1.5">
                  <FavoriteButton find={item} className="!border-line !bg-bg" />
                  <a
                    href={f.buyUrl(item.source)}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="inline-flex h-8 items-center rounded-lg bg-fg px-3 text-[13px] font-medium text-bg transition-colors hover:bg-white"
                  >
                    {t("table.buy")}
                    <span className="sr-only">
                      : {item.name}, {t("newTab")}
                    </span>
                  </a>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Cena w tabeli – synchronizowana z agentem jak na kartach */
function LivePrice({ find }: { find: Find }) {
  const f = useFormat();
  const pricePln = useLivePricePln(find);
  return <>{pricePln > 0 ? f.money(pricePln) : "–"}</>;
}
