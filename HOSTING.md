# Hosting xayezreps.pl – instrukcja wdrożenia

Wszystko, czego potrzeba, żeby postawić stronę i utrzymać ją na produkcji. Kod i dane są w tej paczce
(albo w repozytorium GitHub `MaliczekBoss/xayezreps`). **Haseł i kluczy w paczce nie ma** – właściciel
przekaże je osobno, bezpiecznym kanałem (np. Bitwarden Send, 1Password), nie mailem ani na czacie.

## W skrócie

| | |
| --- | --- |
| Framework | Next.js 16.4 (App Router, Cache Components), React 19, Tailwind 4 |
| Node.js | 20.9 lub nowszy (strona była budowana na Node 24), menedżer pakietów: npm |
| Baza | Upstash Redis przez REST – statystyki, sesje admina, historia QC, ceny od agenta, limity zapytań |
| Dane i zdjęcia | w repozytorium: `data/` (katalog, QC, szczegóły produktów) i `public/` (ok. 380 MB zdjęć) |
| Zadania cykliczne | 2 crony dziennie: `/api/cron/qc` (04:00 UTC) i `/api/cron/prices` (04:30 UTC) |
| Obecnie | działa na Vercelu: `xayezreps.vercel.app`; domena `xayezreps.pl` jeszcze przekierowuje na starą stronę |

Zalecany hosting to **Vercel** – strona jest do niego przygotowana (crony w `vercel.json`, nagłówki IP,
dołączanie plików danych do funkcji). Własny serwer też zadziała – opis niżej.

## Zmienne środowiskowe

Wzór z opisami: `.env.example`. Losowy sekret wygenerujesz tak:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

| Zmienna | Wymagana | Do czego |
| --- | --- | --- |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | tak | Upstash Redis (REST). Zamiennie: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. Bez bazy strona działa na pamięci procesu – tylko do testów |
| `ADMIN_PASSWORD` | tak | hasło do panelu `/admin` (min. 8 znaków, zalecane 16+) |
| `ADMIN_SECRET` | tak | losowy sekret do podpisywania sesji admina, inny niż hasło (zalecane 32+ znaki) |
| `ADMIN_TOTP_SECRET` | zalecana | logowanie dwuetapowe (kod z aplikacji); klucz generuje `npm run admin:2fa` |
| `CRON_SECRET` | tak | min. 16 znaków; bez niego crony odpowiadają 401 i nic nie robią |
| `OPENAI_BASE_URL`, `OPENAI_API_KEY`, `OPENAI_MODEL` | jedna z trzech opcji AI | wyszukiwanie po zdjęciu (`/tools/photo`) przez API zgodne z OpenAI (obecnie codex.sale); opcjonalnie `OPENAI_REASONING_EFFORT` |
| `GEMINI_API_KEY` | jedna z trzech opcji AI | zamiennie: Gemini (opcjonalnie `GEMINI_MODEL`) |
| `ANTHROPIC_API_KEY` | jedna z trzech opcji AI | zamiennie: Claude (opcjonalnie `CLAUDE_MODEL`) |
| `NEXT_PUBLIC_SITE_URL` | na własnym serwerze | adres strony, np. `https://xayezreps.pl` (na Vercelu brany z domeny produkcyjnej) |
| `TRUST_PROXY` | na własnym serwerze | nagłówek z adresem klienta ustawiany przez proxy: `1` (= `X-Real-IP`), `x-forwarded-for` (liczy się ostatni adres) albo `cf-connecting-ip`. Bez tego wszyscy odwiedzający dzielą jeden limit zapytań |
| `IMAGE_SEARCH_HOURLY_LIMIT`, `IMAGE_SEARCH_DAILY_LIMIT` | nie | limity wyszukiwań po zdjęciu (domyślnie 20 na osobę na godzinę i 800 na dzień, z Gemini 500) |
| `DISCORD_LOGO_EMOJI` | nie | emoji obok nazwy w podglądzie linku na Discordzie, format `<:nazwa:id>` |

Wyszukiwanie po zdjęciu pyta dostawców po kolei (OpenAI-zgodny → Gemini → Claude) – wystarczy jeden.
Bez żadnego klucza reszta strony działa, a samo wyszukiwanie po zdjęciu pokazuje komunikat o niedostępności.

## Opcja A: Vercel (zalecana)

1. **Projekt.** Najprościej przejąć istniejący projekt (właściciel doda Cię do zespołu na Vercelu i do repozytorium
   na GitHubie). Nowy projekt: *Add New → Project* → repozytorium z GitHuba (albo wgraj tę paczkę do nowego repo).
   Ustawienia domyślne dla Next.js: build `npm run build`, katalog główny repozytorium, Node 22 lub 24.
2. **Baza.** *Storage / Marketplace → Upstash for Redis → Connect* do projektu – integracja sama doda
   `KV_REST_API_URL` i `KV_REST_API_TOKEN`. Przy przenosinach na nowe konto: podłącz tę samą bazę
   (te same zmienne), żeby nie stracić statystyk, historii QC i cen – albo przenieś dane do nowej bazy
   (`npm run db:backup`, potem `npm run db:restore`).
3. **Zmienne.** *Settings → Environment Variables* → wpisz zmienne z tabeli (środowisko *Production*). Zmiana zmiennych
   działa dopiero po ponownym wdrożeniu (*Deployments → Redeploy*).
4. **Crony.** Działają same z `vercel.json`, jeśli jest `CRON_SECRET` (Vercel dokleja go do zapytania crona).
5. **Domena.** *Settings → Domains* → dodaj `xayezreps.pl` i `www.xayezreps.pl` (jedną jako przekierowanie na drugą).
   Domena jest w **Cloudflare**, gdzie teraz stoi przekierowanie 301 na `xayezreps.com` – usuń je
   (*Rules → Redirect Rules / Page Rules*), a w DNS ustaw rekordy, które pokaże Vercel
   (zwykle `A @ 76.76.21.21` i `CNAME www cname.vercel-dns.com`), najlepiej jako *DNS only* (szara chmurka).
6. **Sprawdź** (lista na końcu).

## Opcja B: własny serwer (VPS)

```bash
npm ci
npm run build
npm start -- -p 3000      # uruchamiaj pod pm2 albo systemd, z katalogu projektu
```

- **Zmienne** jak w tabeli, plus `NEXT_PUBLIC_SITE_URL` i `TRUST_PROXY`.
- **HTTPS i proxy.** Przed Node'em postaw nginx albo Caddy z certyfikatem. Proxy musi **nadpisywać** nagłówek
  z adresem klienta (klient nie może przemycić własnego), np. w nginx: `proxy_set_header X-Real-IP $remote_addr;`
  i `TRUST_PROXY=1`. Strona czyta tylko ten jeden nagłówek. Jeśli przed serwerem jest jeszcze proxy Cloudflare,
  ustaw w nginx moduł `real_ip` z zakresami IP Cloudflare (`real_ip_header CF-Connecting-IP;`), żeby
  `$remote_addr` był adresem odwiedzającego, i wpuszczaj ruch tylko z adresów Cloudflare.
- **Crony** z systemowego crona (czas UTC):

  ```cron
  0 4 * * *  curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://xayezreps.pl/api/cron/qc
  30 4 * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://xayezreps.pl/api/cron/prices
  ```

- Strona czyta pliki z `data/` w trakcie działania, więc uruchamiaj ją z pełnego katalogu projektu
  (bez trybu `output: "standalone"`).
- Na jednym serwerze bez Redis da się wystartować do testów, ale produkcja powinna mieć Upstash
  (dane w pamięci giną przy restarcie).

## Co jest gdzie

| Ścieżka | Zawartość |
| --- | --- |
| `src/app/` | podstrony i API (`/api/...`) |
| `src/lib/` | logika: katalog i wyszukiwarka, ceny, QC, sprzedawcy, logowanie admina, limity zapytań |
| `src/lib/site.ts` | linki (Discord, USFans z kodem polecającym), kod promocyjny, cennik kalkulatora paczki |
| `data/finds.json` | katalog produktów (7374) |
| `data/outfits.json`, `data/sellers.json` | outfity i sprzedawcy z produktami |
| `data/qc/`, `data/qc-index.json` | zapisane galerie zdjęć QC i ich liczniki |
| `data/items/` | zapisane szczegóły produktów (zapas, gdy USFans nie odpowie) |
| `public/i/`, `public/s/`, `public/o/` | zdjęcia: produkty bez tła, produkty sprzedawców, okładki outfitów |
| `scripts/` | skrypty do importu i odświeżania danych (`npm run ...`) |
| `next.config.ts` | nagłówki bezpieczeństwa (CSP, HSTS), dozwolone hosty zdjęć, pliki danych dołączane do funkcji |
| `vercel.json` | crony |

## Usługi zewnętrzne

- **USFans** (bez klucza): ceny i szczegóły produktów na żywo, kursy walut, zdjęcia QC z magazynu.
  Przy bardzo dużej liczbie zapytań z jednego IP USFans potrafi je blokować captchą – nie odpalaj masowych
  skryptów (`prices:snapshot`) z adresu serwera produkcyjnego.
- **NBP** – zapasowe kursy walut.
- **Stara strona xayezreps.com** – tylko jako dodatek, dopóki działa (z bezpiecznikiem). Wszystko, co z niej
  braliśmy, jest zapisane w `data/` i `public/`, więc jej wyłączenie niczego nie psuje.
- **Dostawca AI** do wyszukiwania po zdjęciu (jeden z trzech).

## Panel admina

`/admin` – same statystyki (odsłony, produkty, kliknięcia w agentów). Logowanie hasłem, opcjonalnie z kodem 2FA.
Po 5 złych próbach z jednego adresu logowanie blokuje się na 15 minut. Przycisk „Wyloguj wszędzie” unieważnia
sesje na wszystkich urządzeniach. Zmiana `ADMIN_SECRET` też wylogowuje wszystkich.

## Utrzymanie

| Komenda | Co robi |
| --- | --- |
| `npm run admin:2fa` | generuje klucz do logowania dwuetapowego |
| `npm run db:backup -- <folder>` | kopia całej bazy Redis do pliku JSON (wystarczy token tylko do odczytu) |
| `npm run db:restore -- <plik.json>` | wgranie kopii do nowej, pustej bazy – np. przy przenosinach na inne konto |
| `npm run old-site:snapshot -- qc` / `-- items` | ponownie zapisuje galerie QC / szczegóły produktów ze starej strony (dopóki działa) |
| `npm run sellers:snapshot`, `npm run outfits:images` | zapis sprzedawców i zdjęć outfitów ze starej strony |
| `npm run qc:snapshot`, `npm run prices:snapshot` | odświeżenie liczników QC i cen w plikach katalogu |

Import nowego katalogu i wycinanie tła ze zdjęć opisuje `README.md`. Po każdej zmianie w `data/` lub `public/`
wystarczy commit i wdrożenie.

## Bezpieczeństwo

- `.env.local` i inne pliki `.env*` nigdy nie trafiają do repozytorium (są w `.gitignore`).
- Klucze, które kiedykolwiek przeszły przez czat lub maila, warto wymienić (szczególnie klucz API do wyszukiwania po zdjęciu).
- Strona wysyła ścisłe nagłówki bezpieczeństwa (CSP w `next.config.ts`). Dodając zewnętrzny skrypt
  (np. analitykę), dopisz jego domenę do CSP, inaczej przeglądarka go zablokuje.
- HSTS ma `includeSubDomains` na 2 lata – po uruchomieniu na `xayezreps.pl` wszystkie subdomeny muszą działać po HTTPS.

## Lista kontrolna po wdrożeniu

- [ ] Strona główna, `/finds`, strona produktu i `/sellers` się otwierają, zdjęcia są widoczne
- [ ] Na stronie produktu są rozmiary i ceny; `curl -I "https://DOMENA/api/item?url=https%3A%2F%2Fweidian.com%2Fitem.html%3FitemID%3D7758838382"` zwraca nagłówek `X-Agent-Status: 200 ...` (dane na żywo z USFans)
- [ ] `/admin` przekierowuje na logowanie, a po zalogowaniu pokazuje statystyki
- [ ] Cron ręcznie: `curl -H "Authorization: Bearer $CRON_SECRET" https://DOMENA/api/cron/qc` zwraca JSON z `checked`
- [ ] `https://DOMENA/robots.txt` i `https://DOMENA/sitemap.xml` się otwierają
- [ ] `https://xayezreps.pl` otwiera nową stronę (a nie przekierowuje na xayezreps.com)
