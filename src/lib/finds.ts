import type { ProductSource } from "./agents";

export type Find = {
  id: string;
  name: string;
  category: Category;
  batch: Batch;
  pricePln: number;
  /** Szacowana waga do kalkulatora paczki */
  weightGrams: number;
  views: number;
  image: string;
  source: ProductSource;
  /** Data dodania (ISO), według niej sortujemy „Najnowsze” */
  createdAt: string;
  /** Liczba zdjęć QC w magazynie – doklejana na stronach, nie zapisywana w katalogu */
  qc?: number;
};

export const categories = [
  "Bluzy",
  "Koszulki",
  "Kurtki",
  "Spodnie",
  "Spodenki",
  "Spódnice",
  "Buty",
  "Paski",
  "Torby",
  "Czapki",
  "Biżuteria",
  "Bielizna",
  "Komplety",
  "Perfumy",
  "Zegarki",
  "Elektronika",
  "Klocki",
  "Akcesoria",
] as const;

export type Category = (typeof categories)[number];

export const batches = ["Best batch", "Budget batch", "Random batch"] as const;

export type Batch = (typeof batches)[number];

/** Domyślna waga dla kategorii, podpowiadana w panelu admina */
export const defaultWeight: Record<Category, number> = {
  Bluzy: 750,
  Koszulki: 250,
  Kurtki: 1200,
  Spodnie: 700,
  Spodenki: 420,
  Spódnice: 300,
  Buty: 1300,
  Paski: 350,
  Torby: 700,
  Czapki: 150,
  Biżuteria: 80,
  Bielizna: 150,
  Komplety: 900,
  Perfumy: 300,
  Zegarki: 250,
  Elektronika: 250,
  Klocki: 1200,
  Akcesoria: 150,
};

/** Plakietka „Nowy” dla rzeczy dodanych w ostatnich dniach */
export const NEW_FOR_DAYS = 14;

export const sortNewest = (list: Find[]) => [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const sortPopular = (list: Find[]) => [...list].sort((a, b) => b.views - a.views);
