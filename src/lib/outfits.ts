import type { Find } from "./finds";

export type OutfitPart = {
  findId: string;
  x?: number;
  y?: number;
  label?: string;
};

export type OutfitGender = "girl" | "boy";

export type Outfit = {
  id: string;
  title: string;
  author: string;
  image: string;
  gender?: OutfitGender;
  parts: OutfitPart[];
  createdAt: string;
};

export const MAX_OUTFIT_PARTS = 10;

export const hasPoint = (p: OutfitPart): p is OutfitPart & { x: number; y: number } => typeof p.x === "number" && typeof p.y === "number";

export type ResolvedPart = OutfitPart & { find: Find };
export type ResolvedOutfit = Omit<Outfit, "parts"> & { parts: ResolvedPart[] };

export type OutfitSummary = {
  id: string;
  title: string;
  image: string;
  gender: OutfitGender;
  createdAt: string;
  total: number;
  items: { image: string; category: string }[];
};

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
