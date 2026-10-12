"use client";

import { Heart } from "lucide-react";
import type { Find } from "@/lib/finds";
import { favoriteActions, useFavorites } from "@/lib/favorites";
import { useFormat } from "@/lib/use-format";

type FavoriteButtonProps = {
  find: Pick<Find, "id" | "name" | "image">;
  className?: string;
  withLabel?: boolean;
  /** Bez własnej ramki i tła, do kapsuły na zdjęciu karty findu */
  bare?: boolean;
};

/** Serduszko: dodaje find do ulubionych albo go z nich usuwa */
export function FavoriteButton({ find, className = "", withLabel = false, bare = false }: FavoriteButtonProps) {
  const { t } = useFormat();
  const favorites = useFavorites();
  const saved = Boolean(favorites[find.id]);

  return (
    <button
      type="button"
      onClick={() => favoriteActions.toggle(find)}
      aria-pressed={saved}
      title={saved ? t("fav.remove") : t("fav.add")}
      className={
        withLabel
          ? `inline-flex h-10 items-center gap-2 rounded-lg border px-3.5 text-sm font-medium transition-colors ${
              saved ? "border-fg text-fg" : "border-line bg-card text-muted hover:border-line-strong hover:text-fg"
            } ${className}`
          : bare
            ? `grid size-8 place-items-center transition-colors hover:bg-white/15 ${saved ? "text-red-400" : "text-white"} ${className}`
            : `grid size-8 place-items-center rounded-lg border backdrop-blur transition-colors ${
              saved ? "border-white/10 bg-[#18181b]/80 text-red-400" : "border-white/10 bg-[#18181b]/80 text-fg hover:border-white/30"
            } ${className}`
      }
    >
      <Heart aria-hidden size={withLabel ? 16 : 15} strokeWidth={2.25} className={saved ? "fill-current" : ""} />
      {withLabel ? (saved ? t("fav.saved") : t("fav.save")) : <span className="sr-only">{saved ? t("fav.removeSr", { name: find.name }) : t("fav.addSr", { name: find.name })}</span>}
    </button>
  );
}
