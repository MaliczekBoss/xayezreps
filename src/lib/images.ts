// Nasze zdjęcia: produkty bez tła (public/i), produkty sprzedawców (public/s) i okładki outfitów (public/o).
// Domyślnie są w paczce ze stroną. Można je też trzymać na osobnym serwerze zdjęć (jak cdn na starej stronie):
// wtedy NEXT_PUBLIC_IMAGES_URL, np. https://cdn.xayezreps.pl, z tymi samymi folderami i/, s/, o/ (HOSTING.md).
// Zmienna jest wpisywana w kod przy budowaniu, więc po jej zmianie trzeba stronę zbudować od nowa.

const raw = (process.env.NEXT_PUBLIC_IMAGES_URL ?? "").trim().replace(/\/+$/, "");

/** Adres serwera zdjęć albo pusty, gdy zdjęcia są w paczce ze stroną */
export const IMAGES_URL = /^https?:\/\/[^\s/]+(\/[^\s]*)?$/.test(raw) ? raw : "";

const OWN = /^\/(i|s|o)\//;

/** Adres zdjęcia do pokazania: nasze ścieżki /i/, /s/, /o/ z serwera zdjęć, jeśli jest ustawiony; reszta bez zmian */
export const imageUrl = (src: string) => (IMAGES_URL && OWN.test(src) ? `${IMAGES_URL}${src}` : src);

/** Zdjęcie produktu bez tła (public/i) – w paczce albo na serwerze zdjęć */
export const isCutoutImage = (src: string) => src.startsWith("/i/") || (IMAGES_URL !== "" && src.startsWith(`${IMAGES_URL}/i/`));
