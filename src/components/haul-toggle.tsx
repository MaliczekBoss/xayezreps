"use client";

import { Check, Plus } from "lucide-react";
import { haulActions, useHaul, type HaulFind } from "@/lib/haul";
import { useFormat } from "@/lib/use-format";

export function HaulToggle({ find, className = "", bare = false }: { find: HaulFind; className?: string; bare?: boolean }) {
  const { t } = useFormat();
  const haul = useHaul();
  const inHaul = Boolean(haul.items[find.id]);

  return (
    <button
      type="button"
      onClick={() => haulActions.toggle(find)}
      aria-pressed={inHaul}
      title={inHaul ? t("toggle.remove") : t("toggle.add")}
      className={
        bare
          ? `grid size-8 place-items-center transition-colors ${inHaul ? "bg-white text-black" : "text-white hover:bg-white/15"} ${className}`
          : `grid size-8 place-items-center rounded-lg border backdrop-blur transition-colors ${
              inHaul ? "border-fg bg-fg text-bg" : "border-white/10 bg-[#18181b]/80 text-fg hover:border-white/30"
            } ${className}`
      }
    >
      {inHaul ? <Check aria-hidden size={15} strokeWidth={3} /> : <Plus aria-hidden size={15} strokeWidth={2.5} />}
      <span className="sr-only">{inHaul ? t("toggle.removeSr", { name: find.name }) : t("toggle.addSr", { name: find.name })}</span>
    </button>
  );
}
