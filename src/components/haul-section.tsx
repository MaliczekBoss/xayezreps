"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Minus, Plus, X } from "lucide-react";
import { MAX_ITEM_QTY, haulActions, summarize, useHaul, type HaulLine, type HaulState } from "@/lib/haul";
import { pricing, site } from "@/lib/site";
import { useFormat, type Format } from "@/lib/use-format";
import { ProductImage } from "./product-image";
import { SevenSegment } from "./seven-segment";
import { SectionTitle, btnPrimary } from "./ui";

const LIMIT_GRAMS = 10000;

/** Waga i paragon paczki; `embedded` – bez własnego kontenera, gdy sekcja stoi na podstronie */
export function HaulSection({ embedded = false }: { embedded?: boolean }) {
  const f = useFormat();
  const haul = useHaul();
  const summary = summarize(haul);

  return (
    <section id="paczka" aria-labelledby="paczka-title" className={embedded ? "py-10" : "mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8"}>
      <SectionTitle id="paczka-title" title={[f.t("haul.title1"), f.t("haul.title2")]}>
        <p className="mt-1.5 max-w-[36rem] text-sm text-muted">{f.t("haul.lead")}</p>
      </SectionTitle>

      <div className="mt-6 grid items-start gap-3 sm:gap-4 lg:grid-cols-2">
        <div className="min-w-0 lg:sticky lg:top-36">
          <Scale lines={summary.lines} grams={summary.itemsGrams} f={f} />
        </div>
        <div className="min-w-0">
          <Receipt haul={haul} summary={summary} f={f} />
        </div>
      </div>
    </section>
  );
}

function useTween(target: number) {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(target);
  const current = useRef(target);

  useEffect(() => {
    if (reduce) return;
    const controls = animate(current.current, target, {
      duration: 0.9,
      ease: [0.2, 0.9, 0.25, 1],
      onUpdate: (v) => {
        current.current = v;
        setValue(v);
      },
    });
    return () => controls.stop();
  }, [target, reduce]);

  return reduce ? target : value;
}

// Miejsca na szalce: dolny rząd, potem kolejne warstwy
const PILE = [
  { x: 4, y: 0, r: -6 },
  { x: 36, y: 0, r: 3 },
  { x: 68, y: 2, r: -4 },
  { x: 19, y: 34, r: 7 },
  { x: 52, y: 37, r: -5 },
  { x: 35, y: 68, r: 2 },
];

function Scale({ lines, grams, f }: { lines: HaulLine[]; grams: number; f: Format }) {
  const { t } = f;
  const reduce = useReducedMotion();
  const shown = useTween(grams);
  const visible = lines.slice(-PILE.length);
  const hidden = lines.length - visible.length;
  const empty = lines.length === 0;

  return (
    <div className="rounded-xl border border-line bg-card px-5 pb-5 pt-7 sm:px-7 sm:pb-6">
      {/* Rzeczy na szalce */}
      <div className="relative mx-[7%] h-[11.5rem] sm:h-[14.5rem]">
        <AnimatePresence>
          {visible.map((line, i) => {
            const spot = PILE[i];
            return (
              <motion.div
                key={line.find.id}
                layout={!reduce}
                initial={reduce ? false : { y: -180, opacity: 0, rotate: spot.r - 14 }}
                animate={{ y: 0, opacity: 1, rotate: spot.r }}
                exit={reduce ? { opacity: 0 } : { y: -90, opacity: 0, transition: { duration: 0.2 } }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                className="absolute aspect-square w-[29%]"
                style={{ left: `${spot.x}%`, bottom: `${spot.y}%`, zIndex: i }}
              >
                <ProductImage src={line.find.image} sizes="9rem" />
                {line.qty > 1 && (
                  <span className="absolute bottom-1 right-1 rounded-md bg-black/80 px-1.5 py-0.5 font-mono text-[0.6875rem] font-semibold tabular">
                    ×{line.qty}
                  </span>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {hidden > 0 && (
          <span className="absolute right-0 top-0 rounded-lg border border-line bg-bg px-2.5 py-1 text-xs font-medium">
            {t("scale.more", { pieces: f.pieces(hidden) })}
          </span>
        )}

        {empty && (
          <div className="absolute inset-x-0 bottom-5 text-center">
            <p className="fancy text-2xl text-muted">{t("scale.empty")}</p>
            <a href="#findy" className="mt-1 inline-block text-sm font-medium text-fg underline-offset-4 hover:underline">
              {t("scale.addFirst")}
            </a>
          </div>
        )}
      </div>

      {/* Szalka */}
      <div
        aria-hidden="true"
        className="relative z-10 h-4 rounded-md border border-line-strong bg-[linear-gradient(180deg,#4a4a52,#2b2b31)] shadow-[0_1px_0_rgb(255_255_255/0.15)_inset]"
      />
      <div aria-hidden="true" className="mx-auto h-3 w-[30%] bg-[#232327]" />

      {/* Korpus z wyświetlaczem */}
      <div className="rounded-xl border border-line bg-bg p-3">
        <div className="flex items-center gap-4 rounded-lg border border-black bg-lcd px-4 py-3 shadow-[inset_0_2px_10px_rgb(0_0_0/0.8)]">
          <SevenSegment
            text={grams >= 1000 ? (shown / 1000).toFixed(2) : String(Math.round(shown))}
            className="h-12 min-w-0 flex-1 text-brand-bright drop-shadow-[0_0_6px_rgb(96_165_250/0.45)] sm:h-16"
          />
          <div className="flex flex-col items-center gap-1 font-mono text-xs font-semibold">
            <span className={grams >= 1000 ? "text-brand-bright" : "text-white/15"}>kg</span>
            <span className={grams < 1000 ? "text-brand-bright" : "text-white/15"}>g</span>
            <span className="sr-only">{grams >= 1000 ? "kg" : "g"}</span>
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-3 px-1">
          <span className="inline-flex items-center gap-2 text-xs text-muted">
            <span aria-hidden="true" className={`size-1.5 rounded-full ${empty ? "bg-dim" : "bg-gl"}`} />
            {empty ? t("scale.ready") : t("scale.stable", { w: f.weight(grams, "g") })}
          </span>
          <span className="fancy text-base leading-none text-dim">xayez</span>
        </div>
      </div>

      {/* Pasek do limitu promocji */}
      <div className="mt-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-muted">
          <span>{t("scale.limit", { code: site.promo.code })}</span>
          <span className="font-mono tabular">
            {f.weight(grams, "kg")} / {f.weight(LIMIT_GRAMS, "kg")}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-700 ease-[var(--ease-out-soft)]"
            style={{ width: `${Math.min(100, (grams / LIMIT_GRAMS) * 100)}%` }}
          />
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {t("scale.sr", { w: f.weight(grams, "g") })}
      </p>
    </div>
  );
}

type ReceiptProps = {
  haul: HaulState;
  summary: ReturnType<typeof summarize>;
  f: Format;
};

function Receipt({ haul, summary, f }: ReceiptProps) {
  const { t } = f;
  const empty = summary.count === 0;

  return (
    <div className="rounded-xl border border-line bg-card p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3.5">
        <h3 className="font-semibold">{t("receipt.title")}</h3>
        <span className="font-mono text-xs text-muted tabular">{empty ? t("receipt.emptyTag") : f.pieces(summary.count)}</span>
      </div>

      {empty ? (
        <div className="py-12 text-center">
          <p className="font-semibold">{t("receipt.emptyTitle")}</p>
          <p className="mx-auto mt-1.5 max-w-[22rem] text-sm text-muted">{t("receipt.emptyText")}</p>
          <a href="#findy" className={`${btnPrimary} mt-6 h-10 px-4 text-sm`}>
            {t("receipt.choose")}
            <ArrowRight aria-hidden size={15} />
          </a>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-line">
            {summary.lines.map((line) => (
              <ReceiptLine key={line.find.id} line={line} f={f} />
            ))}
          </ul>

          <dl className="space-y-1.5 border-t border-line pt-3.5 text-sm tabular">
            <Row label={t("receipt.itemsWeight")} value={f.weight(summary.itemsGrams, "g")} />
            <Row label={t("receipt.packaging")} value={`≈ ${f.weight(summary.packagingGrams, "g")}`} muted />
            <Row label={t("receipt.shipWeight")} value={`≈ ${f.weight(summary.shippingGrams, "kg")}`} strong />
          </dl>

          <fieldset className="mt-5">
            <legend className="text-sm font-semibold">{t("receipt.line")}</legend>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              {pricing.lines.map((line) => {
                const cost = summarize({ ...haul, line: line.id }).shippingPln;
                const checked = haul.line === line.id;
                return (
                  <label
                    key={line.id}
                    className={`flex cursor-pointer flex-col gap-0.5 rounded-lg border px-3.5 py-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-bright ${
                      checked ? "border-brand bg-brand/10" : "border-line hover:border-line-strong"
                    }`}
                  >
                    <input
                      type="radio"
                      name="shipping-line"
                      value={line.id}
                      checked={checked}
                      onChange={() => haulActions.setLine(line.id)}
                      className="sr-only"
                    />
                    <span className={`text-sm font-semibold ${checked ? "text-brand-bright" : ""}`}>{line.name}</span>
                    <span className="text-xs text-muted">{f.days(line.days)}</span>
                    <span className="mt-1 font-mono text-sm font-semibold tabular">≈ {f.money(cost)}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <dl className="mt-5 space-y-1.5 text-sm tabular">
            <Row label={t("receipt.products")} value={f.money(summary.productsPln)} />
            <Row label={t("receipt.domestic")} value={`≈ ${f.money(summary.domesticPln)}`} />
            <Row label={t("receipt.shipping", { line: summary.line.name })} value={`≈ ${f.money(summary.shippingPln)}`} />
          </dl>

          <div className="mt-3 flex items-end justify-between gap-4 rounded-lg border border-line bg-bg px-4 py-3.5">
            <div>
              <p className="text-sm font-semibold">{t("receipt.total")}</p>
              <p className="text-xs text-muted">{t("receipt.delivery", { days: f.days(summary.line.days) })}</p>
            </div>
            <p className="text-[1.75rem] font-semibold leading-none tracking-[-0.035em] tabular sm:text-[2rem]">
              ≈ {f.money(summary.totalPln)}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
            <a
              href={f.agent.signupUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className={`${btnPrimary} h-11 px-5 text-sm`}
            >
              {t("receipt.order", { agent: f.agent.name })}
              <ArrowRight aria-hidden size={15} />
              <span className="sr-only">{t("newTab")}</span>
            </a>
            <button
              type="button"
              onClick={() => haulActions.clear()}
              className="text-sm font-medium text-muted underline-offset-4 hover:text-fg hover:underline"
            >
              {t("receipt.clear")}
            </button>
          </div>
        </>
      )}

      <p className="mt-6 border-t border-line pt-4 text-xs leading-relaxed text-dim">
        {t("receipt.note", { domestic: f.money(pricing.domesticPlnPerItem), step: pricing.stepGrams })}
      </p>
    </div>
  );
}

function ReceiptLine({ line, f }: { line: HaulLine; f: Format }) {
  const { t } = f;
  const { find, qty } = line;
  return (
    <li className="flex items-center gap-3 py-3">
      <div className="relative size-11 shrink-0">
        <ProductImage src={find.image} sizes="2.75rem" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{find.name}</p>
        <p className="font-mono text-[0.6875rem] text-muted tabular">
          {t("receipt.meta", { price: f.money(find.pricePln), weight: f.weight(find.weightGrams, "g") })}
        </p>
      </div>
      <div className="flex items-center rounded-lg border border-line" role="group" aria-label={t("receipt.qty", { name: find.name })}>
        <button type="button" onClick={() => haulActions.decrement(find.id)} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-bg hover:text-fg">
          <Minus aria-hidden size={13} strokeWidth={2.5} />
          <span className="sr-only">{t("receipt.minus")}</span>
        </button>
        <span className="w-5 text-center font-mono text-sm font-semibold tabular" aria-live="polite">
          {qty}
        </span>
        <button
          type="button"
          onClick={() => haulActions.add(find)}
          disabled={qty >= MAX_ITEM_QTY}
          className="grid size-8 place-items-center rounded-lg text-muted hover:bg-bg hover:text-fg disabled:opacity-30"
        >
          <Plus aria-hidden size={13} strokeWidth={2.5} />
          <span className="sr-only">{t("receipt.plus")}</span>
        </button>
      </div>
      <button
        type="button"
        onClick={() => haulActions.remove(find.id)}
        className="grid size-8 shrink-0 place-items-center rounded-lg text-dim hover:bg-bg hover:text-fg"
      >
        <X aria-hidden size={15} />
        <span className="sr-only">{t("receipt.remove", { name: find.name })}</span>
      </button>
    </li>
  );
}

function Row({ label, value, muted, strong }: { label: string; value: string; muted?: boolean; strong?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 ${muted ? "text-dim" : "text-muted"} ${strong ? "font-semibold text-fg" : ""}`}>
      <dt>{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
