# xayezreps.pl

Strona główna xayezreps.pl w Next.js 16 (App Router, React 19, Tailwind 4, Motion).

## Start

```bash
npm install
npm run dev
```

Strona działa pod adresem http://localhost:3000.

```bash
npm run build && npm start
```

## Co gdzie edytować

| Plik | Co zawiera |
| --- | --- |
| `src/lib/site.ts` | linki (Discord, USFans z kodem polecającym), kod promocyjny, liczba kupujących, ścieżki podstron, cennik kalkulatora paczki |
| `src/lib/finds.ts` | „Najnowsze findy”: nazwa, kategoria, batch, cena, szacowana waga, zdjęcie, link do USFans |
| `src/lib/qc-feed.ts` | przykładowe wpisy w „Ostatnio wyszukiwane QC” (docelowo dane z QC Findera) |
| `src/app/globals.css` | kolory, czcionki, animacje |

## Sekcje strony głównej

Prosty, płaski styl wzorowany na cadenreps.pl. Wybrane napisy (logo, druga linia hero, nagłówki sekcji) są szeryfową kursywą Instrument Serif.

1. Nagłówek z wyszukiwarką i paskiem oferty USFans (kod xayez67, pasek można zamknąć)
2. Hero „Lepsze findy. Niższe ceny.” z wyszukiwarką: wklejony link z Weidiana od razu zamienia się na link USFans z kodem
3. Najnowsze findy i najczęściej oglądane (rzędy kart, plus dodaje do paczki)
4. Ostatnie zdjęcia QC
5. Kalkulator paczki z wagą i wyświetlaczem LCD
6. Narzędzia, blok Discorda i stopka

Paczka zapisuje się w `localStorage` przeglądarki.

Linki w menu i stopce prowadzą do podstron obecnego serwisu (`/finds`, `/outfits`, `/tools/...`, `/product/[id]`, `/contact`). W tym projekcie jest na razie tylko strona główna.
