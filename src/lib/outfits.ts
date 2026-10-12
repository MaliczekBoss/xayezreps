import type { Find } from "./finds";

// Outfit: zdjęcie stylizacji (opcjonalnie z ponumerowanymi punktami na częściach), każda część to find z katalogu.

export type OutfitPart = {
  findId: string;
  /** Pozycja punktu na zdjęciu w procentach (0–100); bez niej część nie ma punktu na zdjęciu */
  x?: number;
  y?: number;
  /** Własna nazwa części, np. „Czapka Chrome Hearts” – domyślnie nazwa findu */
  label?: string;
};

export type OutfitGender = "girl" | "boy";

export type Outfit = {
  id: string;
  title: string;
  /** Kto nosi albo kto ułożył zestaw */
  author: string;
  /** Zdjęcie stylizacji; puste = flat lay ze zdjęć części */
  image: string;
  gender?: OutfitGender;
  parts: OutfitPart[];
  createdAt: string;
};

export const MAX_OUTFIT_PARTS = 10;

export const hasPoint = (p: OutfitPart): p is OutfitPart & { x: number; y: number } => typeof p.x === "number" && typeof p.y === "number";

export type ResolvedPart = OutfitPart & { find: Find };
export type ResolvedOutfit = Omit<Outfit, "parts"> & { parts: ResolvedPart[] };

/** Lekka wersja outfitu na listy (bez pełnych danych produktów) */
export type OutfitSummary = {
  id: string;
  title: string;
  image: string;
  gender: OutfitGender;
  createdAt: string;
  total: number;
  /** Zdjęcia i kategorie części – do podglądu i do flat lay, gdy outfit nie ma zdjęcia */
  items: { image: string; category: string }[];
};

/** Podpina findy do części outfitu; części z usuniętymi findami pomijamy */
export function resolveOutfits(outfits: Outfit[], finds: Find[]): ResolvedOutfit[] {
  const byId = new Map(finds.map((f) => [f.id, f]));
  return outfits
    .map((o) => ({ ...o, parts: o.parts.flatMap((p) => (byId.has(p.findId) ? [{ ...p, find: byId.get(p.findId)! }] : [])) }))
    .filter((o) => o.parts.length > 0)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function summarizeOutfits(outfits: Outfit[], finds: Find[]): OutfitSummary[] {
  return resolveOutfits(outfits, finds).map((o) => ({
    id: o.id,
    title: o.title,
    image: o.image,
    gender: o.gender ?? "boy",
    createdAt: o.createdAt,
    total: Math.round(o.parts.reduce((sum, p) => sum + p.find.pricePln, 0) * 100) / 100,
    items: o.parts.slice(0, 6).map((p) => ({ image: p.find.image, category: p.find.category })),
  }));
}
