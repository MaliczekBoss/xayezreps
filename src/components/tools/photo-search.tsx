"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { ImageUp, Loader2, RotateCcw, Sparkles } from "lucide-react";
import type { DictKey } from "@/lib/dict";
import type { Find } from "@/lib/finds";
import { site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";
import { Carousel, cardSlot } from "../carousel";
import { PageHeader } from "../page";
import { ProductCard } from "../product-card";
import { SectionTitle } from "../ui";

type Result = { description: string; category: string | null; matches: { find: Find; match: "exact" | "similar" }[]; related: Find[] };
type ErrorCode = "not-configured" | "rate-limited" | "busy" | "bad-image" | "upstream";
type State =
  | { status: "idle" }
  | { status: "loading"; preview: string }
  | { status: "done"; preview: string; result: Result }
  | { status: "error"; preview: string | null; code: ErrorCode; image: string | null };

const MAX_SIDE = 1024;

/** Zmniejsza zdjęcie do 1024 px i zapisuje jako JPEG, żeby wysyłka była szybka */
async function prepare(file: Blob): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

/** Zakres katalogu, w którym szuka AI: liczba findów i najliczniejsze kategorie */
export type PhotoCatalog = { total: number; categories: [string, number][] };

export function PhotoSearch({ catalog }: { catalog?: PhotoCatalog }) {
  const f = useFormat();
  const { t } = f;
  const [state, setState] = useState<State>({ status: "idle" });
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const search = useCallback(async (image: string) => {
    setState({ status: "loading", preview: image });
    try {
      const res = await fetch("/api/image-search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image }) });
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error("api"), { code: data?.error ?? "upstream" });
      setState({ status: "done", preview: image, result: data });
    } catch (e) {
      const code = ((e as { code?: ErrorCode }).code ?? "upstream") as ErrorCode;
      setState({ status: "error", preview: image, code, image });
    }
  }, []);

  const handleFile = useCallback(
    async (file: Blob | null | undefined) => {
      if (!file || !file.type.startsWith("image/")) return;
      try {
        await search(await prepare(file));
      } catch {
        setState({ status: "error", preview: null, code: "bad-image", image: null });
      }
    },
    [search],
  );

  // Wklejanie zdjęcia ze schowka (Ctrl+V) w dowolnym miejscu strony
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith("image/"));
      if (item) {
        e.preventDefault();
        handleFile(item.getAsFile());
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [handleFile]);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const reset = () => {
    setState({ status: "idle" });
    input.current?.click();
  };

  const preview = state.status === "idle" ? null : state.preview;
  const result = state.status === "done" ? state.result : null;
  const exact = result?.matches.filter((m) => m.match === "exact").map((m) => m.find) ?? [];
  const similar = result?.matches.filter((m) => m.match === "similar").map((m) => m.find) ?? [];

  return (
    <>
      <PageHeader crumbs={[{ label: t("nav.tools"), href: site.routes.tools }, { label: t("tools.photo") }]} title={[t("photo.title1"), t("photo.title2")]} lead={t("photo.lead")} />

      <input ref={input} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => handleFile(e.target.files?.[0])} />

      {!preview ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-14 text-center transition-colors sm:py-20 ${
            dragging ? "border-fg bg-card-hover" : "border-line-strong bg-card"
          }`}
        >
          <span className="grid size-14 place-items-center rounded-xl border border-line bg-bg">
            <ImageUp aria-hidden size={24} />
          </span>
          <p className="mt-5 max-w-[26rem] text-[0.9375rem] text-muted">{t("photo.drop")}</p>
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-fg px-5 text-sm font-medium text-bg transition-colors hover:bg-white"
          >
            {t("photo.pick")}
          </button>
          <p className="mt-4 text-xs text-dim">{t("photo.formats")}</p>
        </div>
      ) : null}

      {!preview && (
        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <section aria-labelledby="photo-tips">
            <h2 id="photo-tips" className="text-lg font-semibold">
              {t("photo.tipsTitle")}
            </h2>
            <dl className="mt-4 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
              {(["1", "2", "3"] as const).map((n) => (
                <div key={n} className="bg-card p-4">
                  <dt className="font-semibold">{t(`photo.tip${n}t` as DictKey)}</dt>
                  <dd className="mt-1.5 text-sm leading-relaxed text-muted">{t(`photo.tip${n}` as DictKey)}</dd>
                </div>
              ))}
            </dl>
          </section>
          {catalog && catalog.total > 0 && (
            <section aria-labelledby="photo-scope">
              <h2 id="photo-scope" className="text-sm font-semibold">
                {t("photo.scopeTitle")}
              </h2>
              <p className="mt-1 text-sm text-muted">{t("photo.scope", { n: catalog.total.toLocaleString(f.locale) })}</p>
              <ul className="mt-3 divide-y divide-line border-y border-line text-sm">
                {catalog.categories.map(([category, count]) => (
                  <li key={category}>
                    <Link
                      href={`${site.routes.finds}?category=${encodeURIComponent(category)}`}
                      className="flex justify-between gap-4 py-2 transition-colors hover:text-fg"
                    >
                      <span>{f.category(category)}</span>
                      <span className="text-muted tabular">{count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {preview && (
        <div className="flex flex-col gap-5 rounded-xl border border-line bg-card p-4 sm:flex-row sm:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- podgląd zdjęcia z urządzenia */}
          <img src={preview} alt={t("photo.yourPhoto")} className="aspect-square w-32 rounded-lg bg-bg object-cover sm:w-40" />
          <div className="min-w-0 flex-1" aria-live="polite">
            {state.status === "loading" && (
              <p className="inline-flex items-center gap-2 text-[0.9375rem]">
                <Loader2 aria-hidden size={17} className="animate-spin" />
                {t("photo.searching")}
              </p>
            )}
            {result && (
              <>
                <p className="flex items-center gap-1.5 text-[13px] text-muted">
                  <Sparkles aria-hidden size={14} />
                  {t("photo.sees")}
                </p>
                <p className="mt-1 text-lg font-semibold leading-snug">{result.description || "–"}</p>
                {result.category && <p className="mt-1 text-sm text-muted">{f.category(result.category)}</p>}
              </>
            )}
            {state.status === "error" && (
              <>
                <p className="text-[0.9375rem] text-amber-300">{t(`photo.err.${state.code}` as DictKey)}</p>
                {state.image && state.code !== "not-configured" && (
                  <button
                    type="button"
                    onClick={() => search(state.image!)}
                    className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-bg px-3 text-sm font-medium hover:border-line-strong"
                  >
                    <RotateCcw aria-hidden size={14} />
                    {t("photo.retry")}
                  </button>
                )}
              </>
            )}
          </div>
          {state.status !== "loading" && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-line bg-bg px-4 text-sm font-medium transition-colors hover:border-line-strong"
            >
              <ImageUp aria-hidden size={16} />
              {t("photo.again")}
            </button>
          )}
        </div>
      )}

      {state.status === "loading" && (
        <div aria-hidden="true" className="mt-8 grid animate-pulse grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="aspect-[3/4] rounded-[10px] bg-card" />
          ))}
        </div>
      )}

      {result && (
        <>
          {exact.length > 0 && <Grid id="photo-exact" title={t("photo.exact")} items={exact} />}
          {similar.length > 0 && <Grid id="photo-similar" title={t("photo.similar")} items={similar} />}
          {result.matches.length === 0 && (
            <div className="mt-8 rounded-xl border border-line bg-card p-5">
              <p className="font-semibold">{t("photo.none")}</p>
              <p className="mt-1 text-sm text-muted">{t("photo.noneText")}</p>
              <Link
                href={site.routes.linkConverter}
                className="mt-4 inline-flex h-10 items-center rounded-lg bg-fg px-4 text-sm font-medium text-bg transition-colors hover:bg-white"
              >
                {t("photo.toConverter")}
              </Link>
            </div>
          )}
          {result.related.length > 0 && result.category && (
            <section aria-labelledby="photo-related" className="mt-12">
              <SectionTitle
                id="photo-related"
                title={[t("photo.related", { category: f.category(result.category) }), ""]}
                href={`${site.routes.finds}?category=${encodeURIComponent(result.category)}`}
                linkLabel={t("rows.seeAll")}
              />
              <Carousel label={t("photo.related", { category: f.category(result.category) })}>
                {result.related.map((item) => (
                  <li key={item.id} className={cardSlot}>
                    <ProductCard find={item} />
                  </li>
                ))}
              </Carousel>
            </section>
          )}
        </>
      )}
    </>
  );
}

function Grid({ id, title, items }: { id: string; title: string; items: Find[] }) {
  return (
    <section aria-labelledby={id} className="mt-10">
      <SectionTitle id={id} title={[title, ""]} count={items.length} />
      <ul className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((item) => (
          <li key={item.id}>
            <ProductCard find={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}
