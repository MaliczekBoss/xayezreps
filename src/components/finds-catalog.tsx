"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Camera, Search, X } from "lucide-react";
import type { DictKey } from "@/lib/dict";
import { batches, categories, sortNewest, sortPopular, type Find } from "@/lib/finds";
import { site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";
import { PageHeader } from "./page";
import { ProductCard } from "./product-card";
import { Select } from "./select";
import { btnPrimary } from "./ui";

type Sort = "popular" | "newest" | "priceAsc" | "priceDesc";
const SORTS: Sort[] = ["popular", "newest", "priceAsc", "priceDesc"];
const PAGE = 30;

const normalize = (s: string) =>
  s.toLocaleLowerCase("pl").normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/ł/g, "l");

const field =
  "h-11 rounded-xl border border-line bg-card px-4 text-sm text-fg transition-colors hover:border-line-strong focus:border-line-strong focus:outline-none";

export function FindsCatalog({ finds }: { finds: Find[] }) {
  const f = useFormat();
  const { t } = f;
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [query, setQuery] = useState(params.get("q") ?? "");
  const deferredQuery = useDeferredValue(query);
  const category = params.get("category") ?? "";
  const batch = params.get("batch") ?? "";
  const sortParam = params.get("sort") as Sort | null;
  const sort: Sort = sortParam && SORTS.includes(sortParam) ? sortParam : "popular";
  const [limit, setLimit] = useState(PAGE);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    setLimit(PAGE);
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  };

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of finds) map.set(item.category, (map.get(item.category) ?? 0) + 1);
    return map;
  }, [finds]);

  const results = useMemo(() => {
    const q = normalize(deferredQuery.trim());
    let list = finds.filter(
      (item) =>
        (!category || item.category === category) &&
        (!batch || item.batch === batch) &&
        (!q || normalize(`${item.name} ${item.category}`).includes(q)),
    );
    if (sort === "popular") list = sortPopular(list);
    if (sort === "newest") list = sortNewest(list);
    if (sort === "priceAsc") list = [...list].sort((a, b) => a.pricePln - b.pricePln);
    if (sort === "priceDesc") list = [...list].sort((a, b) => b.pricePln - a.pricePln);
    return list;
  }, [finds, deferredQuery, category, batch, sort]);

  const visible = results.slice(0, limit);
  const filtered = Boolean(category || batch || query.trim());

  const reset = () => {
    setQuery("");
    setLimit(PAGE);
    router.replace(pathname, { scroll: false });
  };

  return (
    <>
      <PageHeader crumbs={[{ label: t("footer.finds") }]} title={[t("finds.title1"), t("finds.title2")]} lead={t("finds.lead", { n: finds.length })} />

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
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE);
            }}
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
            onChange={(v) => setParam("sort", v === "popular" ? "" : v)}
            options={SORTS.map((s) => ({ value: s, label: t(`sort.${s}` as DictKey) }))}
            className="flex-1 lg:w-52 lg:flex-none"
          />
        </div>
      </div>

      <div role="group" aria-label={t("product.category")} className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        {["", ...categories.filter((c) => counts.has(c))].map((c) => {
          const active = category === c;
          return (
            <button
              key={c || "all"}
              type="button"
              aria-pressed={active}
              onClick={() => setParam("category", c)}
              className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-[0.8125rem] font-medium transition-colors ${
                active ? "border-fg bg-fg text-bg" : "border-line bg-card text-muted hover:border-line-strong hover:text-fg"
              }`}
            >
              {c ? f.category(c) : t("finds.all")}
              <span className="font-mono text-[0.6875rem] text-dim tabular">{c ? counts.get(c) : finds.length}</span>
            </button>
          );
        })}
      </div>

      <p className="mt-6 text-sm text-muted" aria-live="polite">
        {t("finds.count", { shown: Math.min(limit, results.length), total: results.length })}
      </p>

      {results.length === 0 ? (
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
        <>
          <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">
            {visible.map((item) => (
              <li key={item.id}>
                <ProductCard find={item} />
              </li>
            ))}
          </ul>
          {limit < results.length && (
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={() => setLimit((l) => l + PAGE)}
                className="inline-flex h-11 items-center rounded-xl border border-line bg-card px-6 text-sm font-semibold hover:border-line-strong"
              >
                {t("finds.more")}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
