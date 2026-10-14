import type { ProductSource } from "./agents";

export type Find = {
  id: string;
  name: string;
  category: Category;
  batch: Batch;
  pricePln: number;
  /** Cena w juanach (u agenta albo przeliczona przy imporcie) – strona przelicza ją bieżącym kursem, jak na stronie produktu */
  priceCny?: number;
  /** Szacowana waga do kalkulatora paczki */
  weightGrams: number;
  views: number;
  image: string;
  source: ProductSource;
  /** Data dodania (ISO), według niej sortujemy „Najnowsze” */
  createdAt: string;
  /** Liczba zdjęć QC w magazynie – doklejana na stronach, nie zapisywana w katalogu */
  qc?: number;
  /** Pierwsze zdjęcie QC – miniatura w rogu karty */
  qcCover?: string;
  /** Produkt tylko do outfitów: nie pokazuje się w katalogu, wyszukiwarce ani rzędach */
  hidden?: boolean;
  /** Polecany: przy tej samej liczbie wyświetleń idzie wyżej w „Najpopularniejszych” */
  featured?: boolean;
  /** Strona oferty, gdy to nie /product/<id> – np. produkt sprzedawcy (seller-find.ts) */
  href?: string;
  /** Dla kogo jest produkt (npm run gender:classify); bez pola – unisex. Strona na razie nie filtruje po tym polu */
  gender?: Gender;
};

export type Gender = "men" | "women";

export const categories = [
  "Bluzy",
  "Swetry",
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
  Swetry: 600,
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
export const NEW_FOR_DAYS = 3;

export const sortNewest = (list: Find[]) => [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const sortPopular = (list: Find[]) => [...list].sort((a, b) => b.views - a.views || Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
