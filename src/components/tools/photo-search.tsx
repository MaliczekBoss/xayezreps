"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type DragEvent, type ReactNode } from "react";
import { ChevronRight, ImageUp, Loader2, RotateCcw } from "lucide-react";
import type { DictKey } from "@/lib/dict";
import type { Find } from "@/lib/finds";
import { site } from "@/lib/site";
import { useFormat, type Format } from "@/lib/use-format";
import { Carousel, cardSlot } from "../carousel";
import { PageHeader } from "../page";
import { ProductCard } from "../product-card";
import { ProductImage } from "../product-image";
import { SectionTitle } from "../ui";

type Read = { brand: string; model: string; type: string; color: string };
type Result = { description: string; category: string | null; read?: Read; matches: { find: Find; match: "exact" | "similar" }[]; related: Find[] };
type ErrorCode = "not-configured" | "rate-limited" | "busy" | "bad-image" | "upstream";
type State =
  | { status: "idle" }
  | { status: "loading"; preview: string }
  | { status: "done"; preview: string; result: Result }
  | { status: "error"; preview: string | null; code: ErrorCode; image: string | null };

/** Przykładowy odczyt pokazywany, zanim ktoś wrzuci własne zdjęcie */
export type PhotoExample = { id: string; image: string; name: string; category: string; read: Read; count: number };

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

// AI podaje kolor po angielsku; po polsku pokazujemy nazwę i próbkę koloru
const COLORS: Record<string, [pl: string, swatch: string]> = {
  black: ["czarny", "#0a0a0a"],
  white: ["biały", "#f5f5f4"],
  grey: ["szary", "#8b8b8f"],
  gray: ["szary", "#8b8b8f"],
  red: ["czerwony", "#dc2626"],
  blue: ["niebieski", "#2563eb"],
  navy: ["granatowy", "#1e2a4a"],
  green: ["zielony", "#16a34a"],
  olive: ["oliwkowy", "#6b6b2e"],
  beige: ["beżowy", "#d6c7a8"],
  cream: ["kremowy", "#efe6d0"],
  brown: ["brązowy", "#6b4428"],
  pink: ["różowy", "#f472b6"],
  purple: ["fioletowy", "#7c3aed"],
  yellow: ["żółty", "#facc15"],
  orange: ["pomarańczowy", "#f97316"],
  silver: ["srebrny", "#c0c0c4"],
  gold: ["złoty", "#c9a227"],
};

export function PhotoSearch({ total, example }: { total: number; example: PhotoExample | null }) {
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

  const pick = () => {
    if (input.current) input.current.value = "";
    input.current?.click();
  };

  const preview = state.status === "idle" ? null : state.preview;
  const loading = state.status === "loading";
  const result = state.status === "done" ? state.result : null;
  const exact = result?.matches.filter((m) => m.match === "exact").map((m) => m.find) ?? [];
  const similar = result?.matches.filter((m) => m.match === "similar").map((m) => m.find) ?? [];

  return (
    <>
      <PageHeader crumbs={[{ label: t("nav.tools"), href: site.routes.tools }, { label: t("tools.photo") }]} title={[t("photo.title1"), t("photo.title2")]} lead={t("photo.lead")} />

      <input ref={input} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => handleFile(e.target.files?.[0])} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-5">
        {/* Wizjer: tu upuszcza się zdjęcie, a potem leży w nim podgląd */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
          }}
          onDrop={onDrop}
          onClick={preview ? undefined : pick}
          className={`relative aspect-square overflow-hidden rounded-2xl border transition-colors sm:aspect-[3/2] ${
            dragging ? "border-gl/50 bg-card-hover" : "border-line bg-card"
          } ${preview ? "" : "cursor-pointer"}`}
        >
          {!preview && (
            <>
              {/* Siatka trójpodziału jak w aparacie */}
              <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1/3 w-px bg-white/[0.035]" />
              <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-2/3 w-px bg-white/[0.035]" />
              <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/3 h-px bg-white/[0.035]" />
              <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-2/3 h-px bg-white/[0.035]" />
            </>
          )}
          <Corners active={dragging || loading} />

          {preview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- podgląd zdjęcia z urządzenia */}
              <img
                src={preview}
                alt={t("photo.yourPhoto")}
                className="absolute inset-0 m-auto max-h-[calc(100%-4.5rem)] max-w-[calc(100%-4.5rem)] rounded-lg object-contain shadow-[0_28px_56px_-20px_rgb(0_0_0/0.8)] motion-safe:animate-[modal-in_0.45s_var(--ease-out-soft)_both]"
              />
              {loading && <span aria-hidden="true" className="scan-line pointer-events-none absolute inset-x-6 h-px bg-gl shadow-[0_0_14px_3px_rgb(16_185_129/0.55)]" />}
              {!loading && (
                <button
                  type="button"
                  onClick={pick}
                  className="absolute bottom-4 right-4 inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-black/65 px-4 text-sm font-medium backdrop-blur transition-colors hover:bg-black/80"
                >
                  <ImageUp aria-hidden size={16} />
                  {t("photo.again")}
                </button>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
              <p className="text-[clamp(1.625rem,3.4vw,2.375rem)] font-semibold leading-none tracking-[-0.035em]">
                {dragging ? t("photo.dropHere") : t("photo.dropTitle")}
              </p>
              <p className="mt-3 max-w-[22rem] text-[0.9375rem] text-muted pointer-coarse:hidden">
                {t("photo.dropText")} <Kbd>Ctrl</Kbd> <Kbd>V</Kbd>
              </p>
              <p className="mt-3 hidden max-w-[22rem] text-[0.9375rem] text-muted pointer-coarse:block">{t("photo.dropTouch")}</p>
              <button
                type="button"
                className="mt-7 inline-flex h-11 items-center gap-2 rounded-xl bg-fg px-5 text-sm font-medium text-bg transition-colors hover:bg-white"
              >
                <ImageUp aria-hidden size={17} />
                {t("photo.pick")}
              </button>
              <p className="absolute inset-x-16 bottom-5 text-balance text-xs text-dim">{t("photo.formats")}</p>
            </div>
          )}
        </div>

        <Readout f={f} state={state} example={example} exact={exact.length} similar={similar.length} onRetry={(image) => search(image)} />
      </div>

      {state.status === "idle" && (
        <>
          <dl className="mt-10 grid gap-x-8 gap-y-6 border-t border-line pt-6 sm:grid-cols-3">
            {(["1", "2", "3"] as const).map((n) => (
              <div key={n}>
                <dt className="text-[0.9375rem] font-semibold">{t(`photo.tip${n}t` as DictKey)}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-muted">{t(`photo.tip${n}` as DictKey)}</dd>
              </div>
            ))}
          </dl>
          {total > 0 && <p className="mt-8 max-w-[40rem] text-sm text-dim">{t("photo.scopeLine", { n: total.toLocaleString(f.locale) })}</p>}
        </>
      )}

      {loading && (
        <div aria-hidden="true" className="mt-10 grid animate-pulse grid-cols-2 gap-x-2.5 gap-y-6 sm:grid-cols-3 sm:gap-x-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="aspect-square rounded-[14px] bg-card" />
          ))}
        </div>
      )}

      {result && (
        <>
          {exact.length > 0 && <Grid id="photo-exact" title={t("photo.exact")} items={exact} />}
          {similar.length > 0 && <Grid id="photo-similar" title={t("photo.similar")} items={similar} />}
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

/** Narożniki kadru; przy przeciąganiu zdjęcia i szukaniu zaciskają się i robią zielone */
function Corners({ active }: { active: boolean }) {
  const base = `pointer-events-none absolute size-8 transition-all duration-300 ease-out ${active ? "border-gl" : "border-fg/40"}`;
  return (
    <>
      <span aria-hidden="true" className={`${base} rounded-tl-xl border-l-2 border-t-2 ${active ? "left-6 top-6" : "left-4 top-4"}`} />
      <span aria-hidden="true" className={`${base} rounded-tr-xl border-r-2 border-t-2 ${active ? "right-6 top-6" : "right-4 top-4"}`} />
      <span aria-hidden="true" className={`${base} rounded-bl-xl border-b-2 border-l-2 ${active ? "bottom-6 left-6" : "bottom-4 left-4"}`} />
      <span aria-hidden="true" className={`${base} rounded-br-xl border-b-2 border-r-2 ${active ? "bottom-6 right-6" : "bottom-4 right-4"}`} />
    </>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="inline-grid h-6 min-w-6 place-items-center rounded-md border border-line-strong bg-bg px-1.5 font-sans text-xs font-medium text-fg">{children}</kbd>;
}

/** Panel obok wizjera: przykład, odczyt w trakcie, wynik albo błąd */
function Readout({
  f,
  state,
  example,
  exact,
  similar,
  onRetry,
}: {
  f: Format;
  state: State;
  example: PhotoExample | null;
  exact: number;
  similar: number;
  onRetry: (image: string) => void;
}) {
  const { t } = f;
  const panel = "flex min-w-0 flex-col rounded-2xl border border-line bg-card p-5";

  if (state.status === "error") {
    return (
      <aside aria-live="polite" className={panel}>
        <h2 className="text-sm font-semibold">{t("photo.readTitle")}</h2>
        <p className="mt-4 text-[0.9375rem] leading-relaxed text-amber-300">{t(`photo.err.${state.code}` as DictKey)}</p>
        {state.image && state.code !== "not-configured" && (
          <button
            type="button"
            onClick={() => onRetry(state.image!)}
            className="mt-4 inline-flex h-10 w-fit items-center gap-2 rounded-lg border border-line-strong bg-bg px-4 text-sm font-medium transition-colors hover:border-fg/40"
          >
            <RotateCcw aria-hidden size={15} />
            {t("photo.retry")}
          </button>
        )}
      </aside>
    );
  }

  if (state.status === "loading") {
    return (
      <aside aria-live="polite" aria-busy="true" className={panel}>
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Loader2 aria-hidden size={15} className="animate-spin text-gl" />
          {t("photo.reading")}
        </h2>
        <div aria-hidden="true" className="mt-4 space-y-2">
          <div className="h-5 w-11/12 animate-pulse rounded bg-line" />
          <div className="h-5 w-2/3 animate-pulse rounded bg-line" />
        </div>
        <dl aria-hidden="true" className="mt-5">
          {(["photo.fBrand", "photo.fModel", "photo.fColor", "photo.fCategory"] as const).map((k, i) => (
            <Field key={k} label={t(k)}>
              <span className="block h-3.5 animate-pulse rounded bg-line" style={{ width: `${[48, 64, 36, 44][i]}%` }} />
            </Field>
          ))}
        </dl>
        <p className="mt-auto pt-5 text-sm text-muted">{t("photo.searching")}</p>
      </aside>
    );
  }

  if (state.status === "done") {
    const { result } = state;
    const read = result.read;
    const rows = [
      ["photo.fBrand", read?.brand],
      ["photo.fModel", read?.model],
      ["photo.fType", read?.type],
      ["photo.fColor", read?.color],
      ["photo.fCategory", result.category ? f.category(result.category) : ""],
    ].filter((r): r is [DictKey, string] => Boolean(r[1]));
    return (
      <aside aria-live="polite" className={panel}>
        <h2 className="text-sm font-semibold">{t("photo.sees")}</h2>
        <p className="read-in mt-4 text-xl font-semibold leading-snug tracking-[-0.02em]">{result.description || "–"}</p>
        {rows.length > 0 && (
          <dl className="mt-5">
            {rows.map(([k, v], i) => (
              <Field key={k} label={t(k)} delay={120 + i * 70}>
                {k === "photo.fColor" ? <Color f={f} value={v} /> : v}
              </Field>
            ))}
          </dl>
        )}
        <div className="mt-auto pt-5">
          {result.matches.length > 0 ? (
            <ul className="space-y-1.5">
              {exact > 0 && <Jump href="#photo-exact" label={t("photo.exact")} count={exact} strong />}
              {similar > 0 && <Jump href="#photo-similar" label={t("photo.similar")} count={similar} />}
            </ul>
          ) : (
            <>
              <p className="font-semibold">{t("photo.none")}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{t("photo.noneText")}</p>
              <Link
                href={site.routes.linkConverter}
                className="mt-4 inline-flex h-10 items-center rounded-lg bg-fg px-4 text-sm font-medium text-bg transition-colors hover:bg-white"
              >
                {t("photo.toConverter")}
              </Link>
            </>
          )}
        </div>
      </aside>
    );
  }

  // Zanim ktoś wrzuci zdjęcie: tak wygląda odczyt dla prawdziwego findu z katalogu
  return (
    <aside className={panel}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{t("photo.readTitle")}</h2>
        {example && <span className="rounded-full border border-line-strong px-2.5 py-0.5 text-xs text-muted">{t("photo.example")}</span>}
      </div>
      {example ? (
        <>
          <div className="mt-4 flex items-center gap-4">
            <Link href={site.routes.product(example.id)} className="relative size-24 shrink-0" aria-label={example.name}>
              <ProductImage src={example.image} sizes="6rem" />
            </Link>
            <p className="text-lg font-semibold leading-snug tracking-[-0.02em]">{t("photo.exampleDesc")}</p>
          </div>
          <dl className="mt-5">
            <Field label={t("photo.fBrand")}>{example.read.brand}</Field>
            <Field label={t("photo.fModel")}>{example.read.model}</Field>
            <Field label={t("photo.fColor")}>
              <Color f={f} value={example.read.color} />
            </Field>
            <Field label={t("photo.fCategory")}>{f.category(example.category)}</Field>
          </dl>
          <div className="mt-auto pt-5">
            <Link
              href={`${site.routes.finds}?q=${encodeURIComponent(example.read.model)}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-line bg-bg px-3.5 py-3 text-sm transition-colors hover:border-line-strong"
            >
              <span>{t("photo.inCatalog", { n: example.count })}</span>
              <ChevronRight aria-hidden size={16} className="shrink-0 text-muted" />
            </Link>
            <p className="mt-3 text-xs leading-relaxed text-dim">{t("photo.exampleNote")}</p>
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm leading-relaxed text-muted">{t("photo.lead")}</p>
      )}
    </aside>
  );
}

function Field({ label, delay, children }: { label: string; delay?: number; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-3 border-t border-line py-2.5 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className={`min-w-0 truncate font-medium ${delay !== undefined ? "read-in" : ""}`} style={delay !== undefined ? ({ "--d": `${delay}ms` } as CSSProperties) : undefined}>
        {children}
      </dd>
    </div>
  );
}

function Color({ f, value }: { f: Format; value: string }) {
  const known = COLORS[value.toLowerCase()];
  return (
    <span className="inline-flex items-center gap-2">
      {known && <span aria-hidden="true" className="size-3 shrink-0 rounded-full ring-1 ring-white/20" style={{ background: known[1] }} />}
      {known && f.locale.startsWith("pl") ? known[0] : value}
    </span>
  );
}

function Jump({ href, label, count, strong }: { href: string; label: string; count: number; strong?: boolean }) {
  return (
    <li>
      <a
        href={href}
        className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-sm transition-colors ${
          strong ? "border-gl/35 bg-gl/10 hover:border-gl/60" : "border-line bg-bg hover:border-line-strong"
        }`}
      >
        <span className="font-medium">{label}</span>
        <span className={`tabular ${strong ? "text-gl" : "text-muted"}`}>{count}</span>
      </a>
    </li>
  );
}

function Grid({ id, title, items }: { id: string; title: string; items: Find[] }) {
  return (
    <section aria-labelledby={`${id}-title`} id={id} className="mt-12 scroll-mt-28">
      <SectionTitle id={`${id}-title`} title={[title, ""]} count={items.length} />
      <ul className="mt-5 grid grid-cols-2 gap-x-2.5 gap-y-6 sm:grid-cols-3 sm:gap-x-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((item) => (
          <li key={item.id}>
            <ProductCard find={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}
