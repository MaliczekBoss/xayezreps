"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { consumeTotp, createSession, destroyAllSessions, destroySession, releaseLoginAttempt, reserveLoginAttempt } from "@/lib/admin-session";
import { isAdmin } from "@/lib/auth";
import { SESSION_COOKIE, adminConfigured, checkPassword, sessionCookie, totpEnabled } from "@/lib/auth-token";
import { clientIp, ipKey } from "@/lib/rate-limit";

// Panel admina ma tylko statystyki, więc jedyne akcje to logowanie i wylogowanie.
// Next sprawdza przy każdej akcji, czy zapytanie przyszło z tej samej strony (ochrona przed CSRF).

export type FormState = { error?: string };

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!adminConfigured()) {
    return { error: "Panel nie jest skonfigurowany. Na Vercelu dodaj ADMIN_PASSWORD i ADMIN_SECRET w Settings → Environment Variables i zrób Redeploy." };
  }
  const h = await headers();
  const ip = ipKey(clientIp(h));

  // Próba jest liczona, zanim sprawdzimy hasło; bez działającego licznika nie wpuszczamy nikogo
  const allowed = await reserveLoginAttempt(ip).catch(() => null);
  if (!allowed) {
    console.error(`[admin] licznik prób nie działa – logowanie odrzucone (${ip.slice(0, 8)})`);
    return { error: "Logowanie jest chwilowo niedostępne. Spróbuj za chwilę." };
  }
  if (!allowed.ok) {
    console.warn(`[admin] logowanie zablokowane (${ip.slice(0, 8)})`);
    return { error: `Za dużo nieudanych prób. Spróbuj za ${Math.ceil(allowed.retryAfter / 60)} min.` };
  }

  const password = String(formData.get("password") ?? "");
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  // Kod 2FA sprawdzamy dopiero przy dobrym haśle, żeby nie zużyć go na próbach z cudzym hasłem
  const ok = checkPassword(password) && (!totpEnabled() || (await consumeTotp(code)));
  if (!ok) {
    console.warn(`[admin] nieudane logowanie (${ip.slice(0, 8)})`);
    // Spowolnienie z losowym rozrzutem utrudnia zgadywanie i pomiar czasu odpowiedzi
    await pause(500 + Math.random() * 500);
    return { error: totpEnabled() ? "Nieprawidłowe hasło albo kod z aplikacji." : "Nieprawidłowe hasło." };
  }

  await releaseLoginAttempt(ip).catch(() => {});
  const token = await createSession({ ip, ua: h.get("user-agent") ?? "" });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookie);
  console.info(`[admin] zalogowano (${ip.slice(0, 8)})`);
  redirect("/admin/stats");
}

/** Wylogowanie z tego urządzenia – sesja jest unieważniana w bazie, nie tylko usuwana z przeglądarki */
export async function logout() {
  const jar = await cookies();
  await destroySession(jar.get(SESSION_COOKIE)?.value).catch(() => {});
  jar.set(SESSION_COOKIE, "", { ...sessionCookie, maxAge: 0 });
  redirect("/admin/login");
}

/** Wylogowanie ze wszystkich urządzeń – np. gdy ktoś mógł przejąć sesję */
export async function logoutEverywhere() {
  if (!(await isAdmin())) redirect("/admin/login");
  await destroyAllSessions();
  (await cookies()).set(SESSION_COOKIE, "", { ...sessionCookie, maxAge: 0 });
  console.info("[admin] unieważniono wszystkie sesje");
  redirect("/admin/login");
}
