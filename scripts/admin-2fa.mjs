import { randomBytes } from "node:crypto";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32(buf) {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

const secret = base32(randomBytes(20));
const label = encodeURIComponent("xayezreps:admin");
const uri = `otpauth://totp/${label}?secret=${secret}&issuer=xayezreps&algorithm=SHA1&digits=6&period=30`;

console.log(`
Logowanie dwuetapowe do panelu admina

1. W aplikacji z kodami (np. Google Authenticator) wybierz „Dodaj kod” → „Wpisz klucz konfiguracji”:
     Nazwa konta: xayezreps admin
     Klucz:       ${secret}
     Typ:         oparty na czasie

   (albo zrób z tego adresu kod QR w zaufanym, lokalnym programie: ${uri})

2. Na Vercelu: Settings → Environment Variables → dodaj
     ADMIN_TOTP_SECRET = ${secret}
   i zrób Redeploy. Lokalnie dopisz tę samą linijkę do .env.local.

3. Od teraz logowanie pyta o hasło i 6-cyfrowy kod z aplikacji. Każdy kod działa tylko raz.

Zgubisz telefon? Usuń ADMIN_TOTP_SECRET na Vercelu (Redeploy) i wygeneruj nowy klucz.
`);
