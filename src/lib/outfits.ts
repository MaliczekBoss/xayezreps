import type { Find } from "./finds";

// Outfit: zdjęcie stylizacji z ponumerowanymi punktami na częściach, każda część to find z katalogu.

export type OutfitPart = {
  findId: string;
  /** Pozycja punktu na zdjęciu w procentach (0–100); bez zdjęcia nieużywana */
  x: number;
  y: number;
  /** Własna nazwa części, np. „Czapka Chrome Hearts” – domyślnie nazwa findu */
  label?: string;
};

export type Outfit = {
  id: string;
  title: string;
  /** Kto nosi albo kto ułożył zestaw */
  author: string;
  /** Zdjęcie stylizacji; puste = kolaż ze zdjęć części */
  image: string;
  parts: OutfitPart[];
  createdAt: string;
};

export const MAX_OUTFIT_PARTS = 10;

export type ResolvedPart = OutfitPart & { find: Find };
export type ResolvedOutfit = Omit<Outfit, "parts"> & { parts: ResolvedPart[] };

/** Podpina findy do części outfitu; części z usuniętymi findami pomijamy */
export function resolveOutfits(outfits: Outfit[], finds: Find[]): ResolvedOutfit[] {
  const byId = new Map(finds.map((f) => [f.id, f]));
  return outfits
    .map((o) => ({ ...o, parts: o.parts.flatMap((p) => (byId.has(p.findId) ? [{ ...p, find: byId.get(p.findId)! }] : [])) }))
    .filter((o) => o.parts.length > 0)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
