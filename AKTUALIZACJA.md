# Aktualizacja xayezreps.pl – ceny, zapasy i zdjęcia QC na CDN

## Co się zmienia

1. **Ceny i szczegóły produktów odświeżają się najwyżej raz na 3 dni.** Pierwsza osoba, która wejdzie w produkt
   (albo zobaczy go w katalogu), pobiera aktualne dane od agenta; zapisują się w MongoDB i przez 3 dni wszyscy dostają
   je z bazy – bez pytania agenta. To zdejmuje z serwera blokady USFans.
2. **Zapasy, gdy USFans zablokuje.** Strona sama wykrywa blokadę (captcha, 403, 429) i na godzinę przestaje go pytać.
   Kolejność źródeł: dane z ostatnich 3 dni → USFans → Weidian (2 niezależne adresy API) → ostatnie znane dane
   (do 30 dni) → zapis ze starej strony. Kakobuy nie nadaje się na zapas – ich API wymaga zalogowania.
3. **Zdjęcia QC na CDN.** Folder `q/` (ok. 24 tys. zdjęć WebP, max 1400 px) idzie do tego samego magazynu S3
   co `i/`, `s/`, `o/`. Strona bierze z niego zdjęcia, które są na liście `data/qc-cdn.json`.
4. **Każde nowe zdjęcie QC dostaje kopię.** Gdy strona zapisze nowe zdjęcie QC (z USFans albo z codziennego zadania),
   robi jego kopię: z ustawionym S3 – prosto do `q/` w magazynie CDN, bez S3 – do MongoDB, a strona podaje ją
   pod `https://xayezreps.pl/q/…` (z cache na rok). Zdjęcia nie znikną, nawet gdy agent je usunie.

## Kolejność wdrożenia

1. **Najpierw zdjęcia:** wgraj zawartość folderu `q/` do magazynu S3 tak, żeby pliki były pod
   `https://cdn.xayezreps.pl/q/<plik>.webp`. Nagłówki: `Content-Type: image/webp`,
   `Cache-Control: public, max-age=31536000, immutable`. Np. rclone:

   ```bash
   rclone copy ./q s3:NAZWA-BUCKETU/q --transfers 32 --header-upload "Cache-Control: public, max-age=31536000, immutable"
   ```

2. **Potem strona:** podmień pliki strony na nowe (plik `.env` zostaje Wasz – nie nadpisuj go) i zrestartuj serwer.
   Przy starcie strona sama doinstaluje jedną nową paczkę (`aws4fetch`) i przebuduje się.
3. **(Opcjonalnie) S3 dla nowych zdjęć:** dopisz do `.env` dane dostępu do magazynu – wtedy nowe zdjęcia QC trafiają
   od razu na CDN (bez tego – do MongoDB, też działa):

   ```env
   S3_ENDPOINT=https://adres-s3
   S3_BUCKET=nazwa-bucketu
   S3_ACCESS_KEY_ID=…
   S3_SECRET_ACCESS_KEY=…
   S3_REGION=auto
   ```

   Klucz potrzebuje tylko prawa zapisu (`PutObject`) do `q/` w tym buckecie.
   `S3_ENDPOINT` to adres **API** magazynu (np. MinIO, R2, Wasabi), nie adres CDN. `S3_BUCKET` – ten sam bucket,
   w którym są `i/`, `s/`, `o/`. Pliki idą pod `S3_ENDPOINT/S3_BUCKET/q/<plik>.webp` (adresowanie path-style).
   `S3_REGION` – `auto` dla R2 i MinIO, dla innych dostawców ich region (np. `eu-central-1`).
   Po restarcie w konsoli przy pierwszym nowym zdjęciu QC nie powinno być wpisów `[qc-cdn] S3 …` (to byłby błąd zapisu).

Wgranie strony przed zdjęciami spowoduje, że do czasu wgrania `q/` zdjęcia QC z listy będą się nie wczytywać.

## Sprawdzenie

- `https://cdn.xayezreps.pl/q/<dowolny plik z folderu>` otwiera zdjęcie.
- Na stronie produktu zdjęcia QC ładują się z `cdn.xayezreps.pl/q/…` (narzędzia przeglądarki → Sieć).
- `curl -I "https://xayezreps.pl/api/item?url=https%3A%2F%2Fweidian.com%2Fitem.html%3FitemID%3D7758838382"` – nagłówek
  `X-Agent-Status` mówi, skąd są dane: `200` (USFans), `… -> weidian` (zapas), `cache …` (z bazy, do 3 dni).
- W konsoli serwera wpis `[agent] USFans blokuje …` oznacza, że strona sama przełączyła się na zapasy.
