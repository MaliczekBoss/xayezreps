# xayezreps.pl na Pterodactyl (Docker) z MongoDB, w HA

Strona startuje jednym plikiem i sama robi wszystko, co trzeba – bez komend npm, bez zewnętrznego crona i bez Redisa.

## Co jest w paczce

| | |
| --- | --- |
| `index.js` | plik startowy (Pterodactyl: *Startup → JS file / MAIN_FILE* = `index.js`) |
| `seed/baza.json` | obecne dane strony (statystyki, ceny, historia QC, katalog) – wgrywane do MongoDB przy pierwszym starcie |
| `seed/images/` | 14 567 zdjęć (ok. 380 MB) – wgrywane do MongoDB przy pierwszym starcie; potem folder można usunąć |
| `.env.example` | wzór ustawień – skopiuj do `.env` |
| reszta | kod strony i dane (`data/`) |

## Wymagania

- Obraz Node.js **22 lub 24** (np. `ghcr.io/parkervcp/yolks:nodejs_22`), dostęp do internetu (instalacja paczek przy pierwszym starcie).
- **RAM: min. 2 GB przy pierwszym starcie** (budowanie strony), potem ok. 300–500 MB.
- Dysk: ok. 1,5 GB (paczki, zbudowana strona, `seed/` do czasu wgrania).
- MongoDB 6+ (np. 7 albo 8). Zdjęcia zajmą w bazie ok. 380 MB.

## Ustawienia – plik `.env`

Utwórz w katalogu serwera plik `.env` (menedżer plików w panelu) – hasła i klucze przekaże właściciel strony osobno:

```env
MONGODB_URI=mongodb://UŻYTKOWNIK:HASŁO@HOST:27017/?authSource=admin
MONGODB_DB=xayezreps
NEXT_PUBLIC_SITE_URL=https://xayezreps.pl
ADMIN_PASSWORD=…
ADMIN_SECRET=…
TRUST_PROXY=1
```

| Zmienna | Opis |
| --- | --- |
| `MONGODB_URI`, `MONGODB_DB` | baza MongoDB; wszystko (dane, sesje, zdjęcia) idzie do bazy `MONGODB_DB` |
| `NEXT_PUBLIC_SITE_URL` | adres strony |
| `ADMIN_PASSWORD`, `ADMIN_SECRET` | panel `/admin`; **na wszystkich instancjach takie same** |
| `TRUST_PROXY` | nagłówek z adresem odwiedzającego, który ustawia wasze proxy / load balancer: `1` = `X-Real-IP`, albo `x-forwarded-for`, `cf-connecting-ip` |
| `OPENAI_BASE_URL`, `OPENAI_API_KEY`, `OPENAI_MODEL` lub `GEMINI_API_KEY` | wyszukiwanie po zdjęciu (opcjonalnie) |
| `ADMIN_TOTP_SECRET` | logowanie dwuetapowe do panelu (opcjonalnie) |
| `CRON_SCHEDULE` | godziny zadań cyklicznych w UTC, domyślnie `qc=04:00,prices=04:30` |

Port bierze się sam z `SERVER_PORT` (przydział w Pterodactyl). Plik `.env` musi być taki sam na wszystkich instancjach.

## Pierwszy start

W konsoli widać kolejne kroki (wpisy `[xayezreps]`):

1. instalacja paczek (`npm ci`) – ok. 1 min,
2. wgranie `seed/baza.json` i zdjęć do MongoDB – kilkanaście sekund,
3. budowanie strony – 1–3 min,
4. `Ready` – strona działa.

Kolejne starty trwają sekundy – instalacja i budowanie powtarzają się tylko, gdy zmienią się pliki strony albo `.env`.
Dane i zdjęcia wgrywają się tylko raz (do pustej bazy) – restarty niczego nie nadpisują.

## Zadania cykliczne (zamiast crona)

Strona sama, wewnątrz procesu, odpala raz dziennie odświeżanie zdjęć QC i cen (domyślnie 04:00 i 04:30 UTC).
Nic nie trzeba konfigurować. W HA zadanie przed startem rezerwuje się w MongoDB (kolekcja `cron_runs`),
więc **każde zadanie wykonuje dziennie tylko jedna instancja** – nie mnoży się.

## HA – kilka instancji

- Wszystkie instancje łączą się z **tą samą bazą** i mają **ten sam `.env`** – sesje admina, limity zapytań,
  statystyki i zdjęcia są wspólne, więc load balancer może wysyłać zapytania do dowolnej instancji.
- Każda instancja buduje stronę identycznie (wspólny identyfikator wersji i klucz szyfrowania wyliczane z plików
  i `ADMIN_SECRET`) – logowanie i nawigacja działają, nawet gdy kolejne zapytania trafiają do różnych instancji.
- Instancje mogą mieć osobne dyski albo wspólny – przy wspólnym jedna buduje, a pozostałe czekają na gotową wersję.
- Przetestowane: 3 instancje naraz (wspólny i osobny dysk) – dane i zdjęcia wgrane raz, zadania wykonane raz,
  formularz logowania pobrany z jednej instancji i wysłany do drugiej działa.

## Aktualizacja strony

Wgraj nowe pliki i zrestartuj serwer – strona sama doinstaluje paczki i przebuduje się, jeśli coś się zmieniło.

## Gdy coś nie działa

| Objaw w konsoli | Co zrobić |
| --- | --- |
| `Nie udało się zainstalować zależności` | serwer potrzebuje dostępu do internetu (registry.npmjs.org) |
| `Build się nie udał` / proces ubity w trakcie | za mało RAM – na pierwszy start daj min. 2 GB |
| `Wgrywanie danych do MongoDB nie powiodło się` | sprawdź `MONGODB_URI` (użytkownik, hasło, `authSource`) i czy baza jest osiągalna z kontenera |
| `Brak MONGODB_URI` | brak pliku `.env` albo zmiennej – strona działa wtedy bez bazy (tylko do testów) |

Więcej o samej stronie: `HOSTING.md` i `README.md`.
