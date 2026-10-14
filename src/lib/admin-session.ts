import "server-only";

import { redisCall, run, storageKind } from "./analytics/store";
import { createToken, readToken, SESSION_MAX_AGE_S, sha256, totpStep } from "./auth-token";
import { hit, peek } from "./rate-limit";

// Sesje admina zapisane w bazie: token w ciasteczku musi mieć poprawny podpis I istnieć w bazie,
// więc wylogowanie (także „wyloguj wszędzie”) od razu unieważnia skradzione ciasteczko.
// Do tego blokada zgadywania hasła i jednorazowe kody 2FA. Bez Upstash (lokalnie) – pamięć procesu.

const SESSIONS = "adm:sessions";
const sessionKey = (sid: string) => `adm:s:${sha256(sid).slice(0, 40)}`;

type Mem = { sessions: Map<string, number>; used: Map<string, number> };
const mem: Mem = ((globalThis as { __xayezAdmin?: Mem }).__xayezAdmin ??= { sessions: new Map(), used: new Map() });

/** Nowa sesja po poprawnym logowaniu; zwraca token do ciasteczka */
export async function createSession(meta: { ip: string; ua: string }) {
  const now = Date.now();
  const { token, sid } = createToken(now);
  const key = sessionKey(sid);
  if (storageKind() === "redis") {
    await run([
      { op: "SET", keys: [key], args: [JSON.stringify({ at: now, ip: meta.ip, ua: meta.ua.slice(0, 160) }), "EX", SESSION_MAX_AGE_S] },
      { op: "SADD", keys: [SESSIONS], args: [key] },
    ]);
  } else {
    mem.sessions.set(key, now + SESSION_MAX_AGE_S * 1000);
  }
  return token;
}

/** Czy token należy do aktywnej sesji admina (podpis, ważność i wpis w bazie) */
export async function verifySession(token: string | undefined): Promise<boolean> {
  const sid = readToken(token, Date.now());
  if (!sid) return false;
  const key = sessionKey(sid);
  if (storageKind() !== "redis") return (mem.sessions.get(key) ?? 0) > Date.now();
  try {
    return (await redisCall(["EXISTS", key])) === 1;
  } catch {
    // Bez bazy nie da się sprawdzić unieważnienia – bezpieczniej odmówić
    return false;
  }
}

/** Wylogowanie: usuwa tę jedną sesję */
export async function destroySession(token: string | undefined) {
  const sid = readToken(token, Date.now());
  if (!sid) return;
  const key = sessionKey(sid);
  if (storageKind() !== "redis") {
    mem.sessions.delete(key);
    return;
  }
  await run([
    { op: "DEL", keys: [key] },
    { op: "SREM", keys: [SESSIONS], args: [key] },
  ]);
}

/** „Wyloguj wszędzie”: unieważnia wszystkie sesje admina na wszystkich urządzeniach */
export async function destroyAllSessions() {
  if (storageKind() !== "redis") {
    mem.sessions.clear();
    return;
  }
  const keys = ((await redisCall(["SMEMBERS", SESSIONS])) as string[] | null) ?? [];
  await run([...keys.map((key) => ({ op: "DEL", keys: [key] })), { op: "DEL", keys: [SESSIONS] }]);
}

/* ---------- Blokada zgadywania hasła ---------- */

const WINDOW_S = 15 * 60;
// Z jednego adresu: tyle nieudanych prób na 15 minut
const PER_IP = 5;
// Ze wszystkich adresów razem (zgadywanie z wielu IP naraz): tyle nieudanych prób na 15 minut
const GLOBAL = 40;

/** Czy z tego adresu można jeszcze próbować; retryAfter – ile sekund czekać */
export async function loginAllowed(ip: string): Promise<{ ok: boolean; retryAfter: number }> {
  const [own, all] = await Promise.all([peek("adm-login", ip, WINDOW_S), peek("adm-login", "all", WINDOW_S)]);
  const retryAfter = WINDOW_S - (Math.floor(Date.now() / 1000) % WINDOW_S);
  return { ok: own < PER_IP && all < GLOBAL, retryAfter };
}

export async function loginFailed(ip: string) {
  await Promise.all([hit("adm-login", ip, PER_IP, WINDOW_S), hit("adm-login", "all", GLOBAL, WINDOW_S)]);
}

/**
 * Kod 2FA z aplikacji: poprawny i jeszcze nieużyty. Każdy kod działa tylko raz – podsłuchany albo
 * podejrzany kod nie wpuści drugi raz.
 */
export async function consumeTotp(code: string): Promise<boolean> {
  const step = totpStep(code, Date.now());
  if (step === null) return false;
  const key = `adm:totp:${step}`;
  if (storageKind() !== "redis") {
    if (mem.used.has(key)) return false;
    mem.used.set(key, Date.now());
    return true;
  }
  return (await redisCall(["SET", key, "1", "EX", 120, "NX"])) === "OK";
}
