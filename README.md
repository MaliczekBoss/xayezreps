# xayezreps.pl

Strona xayezreps.pl w Next.js 16 (App Router, React 19, Tailwind 4, Motion).

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
| `data/finds.json` | katalog produktów (na Vercelu lista żyje w Upstash Redis, plik to źródło nowych pozycji) |
| `data/outfits.json` | outfity |
| `data/qc-index.json` | liczba zdjęć QC i okładka dla każdej aukcji (`npm run qc:snapshot`) |
| `public/i/` | zdjęcia produktów bez tła, `<id>.webp` |
| `src/app/globals.css` | kolory, czcionki, animacje |

## Katalog i zdjęcia bez tła

Każde zdjęcie produktu na stronie jest bez tła: produkt leży prosto na grafitowej stronie.
Zdjęcia wycina model BiRefNet na karcie graficznej (NVIDIA), skryptem `scripts/cutout.py`.

Import całego katalogu z eksportu `catalogue.csv`:

```bash
node scripts/fetch-images.mjs lista.json ../.import/orig
python scripts/cutout.py ../.import/orig public/i
node scripts/import-catalogue.mjs catalogue.csv
npm run qc:snapshot
```

- `fetch-images.mjs` pobiera oryginalne zdjęcia z listy `[{ "id", "url" }]`.
- `cutout.py` wycina tło, przycina produkt i ustawia go na środku kwadratu 640 px (pomija pliki, które już są).
  Potrzebuje Pythona z `onnxruntime-gpu[cuda,cudnn]`, `onnx`, `onnxconverter-common`, `opencv-python-headless` i `pillow`.
- `import-catalogue.mjs` zamienia katalog: nadaje nasze kategorie, przelicza ceny z juanów na złotówki,
  a produkty z outfitów zostawia ukryte (widać je tylko w outfitach).

Przy wymianie całego katalogu zmień znacznik `RESET.finds` w `src/lib/docstore.ts`: przy pierwszym wejściu
po wdrożeniu lista w Redis zostanie zastąpiona plikiem, a stara trafi do kopii `xd:finds:backup:<znacznik>`.

Produkty dodane w panelu admina mają zdjęcie takie, jakie się wgra. Żeby było bez tła, przepuść je
przez `scripts/cutout.py` i wgraj gotowy plik WEBP.

## Wyszukiwarka

Katalog jest za duży, żeby wysyłać go do przeglądarki, więc wyszukiwanie, filtry i sortowanie liczy serwer
(`src/lib/catalog.ts`, `/api/finds`). Wyszukiwarka rozumie polskie i angielskie nazwy („koszulka” znajdzie „tee”),
kolory i literówki (`src/lib/search.ts`).
