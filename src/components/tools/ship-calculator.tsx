"use client";

import { useState } from "react";
import { Plus, RotateCcw } from "lucide-react";
import { defaultWeight, type Category } from "@/lib/finds";
import { shippingCost, withPackaging } from "@/lib/haul";
import { pricing, site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";
import { HaulSection } from "../haul-section";
import { PageHeader } from "../page";

const PRESETS: Category[] = ["Koszulki", "Bluzy", "Spodnie", "Kurtki", "Buty", "Czapki", "Torby", "Akcesoria"];
const MAX_GRAMS = 30000;

export function ShipCalculator() {
  const f = useFormat();
  const { t } = f;
  const [grams, setGrams] = useState(1000);

  const set = (value: number) => setGrams(Math.min(MAX_GRAMS, Math.max(0, Math.round(value) || 0)));
  const shipped = withPackaging(grams);

  return (
    <>
      <PageHeader crumbs={[{ label: t("nav.tools"), href: site.routes.tools }, { label: t("tools.calc") }]} title={[t("ship.title1"), t("ship.title2")]} lead={t("ship.lead")} />

      <section aria-labelledby="ship-manual" className="grid gap-8 border-y border-line py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
        <div className="min-w-0">
          <h2 id="ship-manual" className="text-lg font-semibold">
            {t("ship.manual")}
          </h2>
          <label htmlFor="ship-grams" className="mt-4 block text-sm text-muted">
            {t("ship.weight")}
          </label>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex h-14 min-w-0 flex-1 items-center rounded-2xl border border-line bg-card pr-4 focus-within:border-line-strong">
              <input
                id="ship-grams"
                inputMode="numeric"
                value={grams || ""}
                onChange={(e) => set(Number(e.target.value.replace(/\D/g, "")))}
                placeholder="0"
                className="h-full min-w-0 flex-1 bg-transparent pl-4 text-2xl font-semibold tracking-[-0.02em] text-fg tabular placeholder:text-dim focus:outline-none"
              />
              <span className="text-muted">g</span>
            </div>
            <button
              type="button"
              onClick={() => set(0)}
              className="grid size-14 shrink-0 place-items-center rounded-2xl border border-line text-muted hover:border-line-strong hover:text-fg"
              title={t("ship.reset")}
            >
              <RotateCcw aria-hidden size={18} />
              <span className="sr-only">{t("ship.reset")}</span>
            </button>
          </div>
          <input
            type="range"
            min={0}
            max={10000}
            step={100}
            value={Math.min(grams, 10000)}
            onChange={(e) => set(Number(e.target.value))}
            aria-label={t("ship.weight")}
            className="mt-5 w-full accent-brand"
          />

          <p className="mt-6 text-sm text-muted">{t("ship.add")}</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set(grams + defaultWeight[c])}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[0.8125rem] text-muted transition-colors hover:border-line-strong hover:text-fg"
              >
                <Plus aria-hidden size={13} />
                {f.category(c)}
                <span className="text-dim tabular">{f.weight(defaultWeight[c], "g")}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-sm text-muted">{t("ship.withPackaging", { w: f.weight(shipped, "g") })}</p>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {pricing.lines.map((line) => (
              <li key={line.id} className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-semibold">{line.name}</p>
                  <p className="text-sm text-muted">{f.days(line.days)}</p>
                </div>
                <p className="text-2xl font-semibold tracking-[-0.02em] tabular" aria-live="polite">
                  {grams ? f.money(shippingCost(shipped, line.id)) : "–"}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-dim">{t("ship.note", { step: f.weight(pricing.stepGrams, "g") })}</p>
        </div>
      </section>

      <HaulSection embedded />
    </>
  );
}
