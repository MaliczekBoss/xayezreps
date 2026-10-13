# Bot xayezreps na Discorda

Gdy ktoś na serwerze wyśle link do produktu ze strony (`…/product/<id>`), bot odpowiada wiadomością:
logo i „xayezreps” nad tytułem, opis z ceną i liczbą zdjęć QC, grafika produktu, biały pasek z lewej
i przyciski „Zobacz przedmiot” oraz „Zobacz inne przedmioty”. Zwykły podgląd linku pod wiadomością ukrywa.

## 1. Utwórz bota

1. Wejdź na https://discord.com/developers/applications → **New Application** → nazwa `xayezreps`.
2. Zakładka **Bot**: wgraj logo jako avatar, kliknij **Reset Token** i skopiuj token (nikomu go nie pokazuj).
3. W tej samej zakładce włącz **Message Content Intent** (bot musi widzieć treść wiadomości, żeby znaleźć link).
4. Zakładka **OAuth2 → URL Generator**: zaznacz `bot`, a w uprawnieniach: **View Channels**, **Send Messages**,
   **Embed Links**, **Read Message History** i **Manage Messages** (do ukrywania zwykłego podglądu linku).
5. Otwórz wygenerowany link i dodaj bota na swój serwer.

## 2. Uruchom

Potrzebny Node.js 20.6 albo nowszy.

```bash
cd bot
npm install
cp .env.example .env
npm start
```

W pliku `.env` wpisz `DISCORD_BOT_TOKEN`. Gdy w konsoli pojawi się „Bot działa jako …”, wyślij na kanale link
do produktu ze strony.

## 3. Żeby działał cały czas

Bot musi być stale włączony. Na komputerze działa, dopóki komputer i okno są włączone. Na stałe wrzuć folder
`bot` na serwer, który chodzi 24/7, np. Railway, Render (Background Worker) albo własny VPS: komenda startowa
`npm start`, zmienne z `.env` ustaw w panelu hostingu.
