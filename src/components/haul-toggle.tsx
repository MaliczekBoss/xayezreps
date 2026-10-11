"use client";

import { Check, Plus } from "lucide-react";
import { haulActions, useHaul, type HaulFind } from "@/lib/haul";
import { useFormat } from "@/lib/use-format";

/** Dodaje find do paczki albo go z niej wyjmuje. Ilości zmienia się w kalkulatorze. */
export function HaulToggle({ find, className = "" }: { find: HaulFind; className?: string }) {
  const { t } = useFormat();
  const haul = useHaul();
  const inHaul = Boolean(haul.items[find.id]);

  return (
    <button
      type="button"
      onClick={() => haulActions.toggle(find)}
      aria-pressed={inHaul}
      title={inHaul ? t("toggle.remove") : t("toggle.add")}
      className={`grid size-8 place-items-center rounded-full border backdrop-blur transition-colors ${
        inHaul ? "border-brand bg-brand text-white" : "border-white/15 bg-black/60 text-white hover:border-white/40 hover:bg-black/80"
      } ${className}`}
    >
      {inHaul ? <Check aria-hidden size={15} strokeWidth={3} /> : <Plus aria-hidden size={15} strokeWidth={2.5} />}
      <span className="sr-only">{inHaul ? t("toggle.removeSr", { name: find.name }) : t("toggle.addSr", { name: find.name })}</span>
    </button>
  );
}
