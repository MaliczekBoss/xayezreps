import "server-only";

import { redisCall, run, storageKind } from "./analytics/store";
import { createToken, readToken, SESSION_MAX_AGE_S, sha256, totpEnabled, totpStep } from "./auth-token";
import { hit } from "./rate-limit";

const SESSIONS = "adm:sessions";
const sessionKey = (sid: string) => `adm:s:${sha256(sid).slice(0, 40)}`;

type Mem = { sessions: Map<string, number>; used: Map<string, number> };
const mem: Mem = ((globalThis as { __xayezAdmin?: Mem }).__xayezAdmin ??= { sessions: new Map(), used: new Map() });

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

export async function verifySession(token: string | undefined): Promise<boolean> {
  const sid = readToken(token, Date.now());
  if (!sid) return false;
  const key = sessionKey(sid);
  if (storageKind() !== "redis") return (mem.sessions.get(key) ?? 0) > Date.now();
  try {
    return (await redisCall(["EXISTS", key])) === 1;
  } catch {
    return false;
  }
}

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

export async function destroyAllSessions() {
  if (storageKind() !== "redis") {
    mem.sessions.clear();
    return;
  }
  const keys = ((await redisCall(["SMEMBERS", SESSIONS])) as string[] | null) ?? [];
  await run([...keys.map((key) => ({ op: "DEL", keys: [key] })), { op: "DEL", keys: [SESSIONS] }]);
}

const WINDOW_S = 15 * 60;
const PER_IP = 5;
const GLOBAL = 40;
const TOTP_FAILS_PER_DAY = 10;
const DAY_S = 24 * 60 * 60;

export async function reserveLoginAttempt(ip: string): Promise<{ ok: boolean; retryAfter: number }> {
  const own = await hit("adm-login", ip, PER_IP, WINDOW_S);
  if (!own.ok) return { ok: false, retryAfter: own.retryAfter };
  if (totpEnabled()) return { ok: true, retryAfter: 0 };
  const all = await hit("adm-login", "all", GLOBAL, WINDOW_S);
  if (!all.ok) {
    await hit("adm-login", ip, PER_IP, WINDOW_S, -1);
    return { ok: false, retryAfter: all.retryAfter };
  }
  return { ok: true, retryAfter: 0 };
}

export async function releaseLoginAttempt(ip: string) {
  await hit("adm-login", ip, PER_IP, WINDOW_S, -1);
  if (!totpEnabled()) await hit("adm-login", "all", GLOBAL, WINDOW_S, -1);
}

export async function consumeTotp(code: string): Promise<boolean> {
  const reserved = await hit("adm-totp", "all", TOTP_FAILS_PER_DAY, DAY_S);
  if (!reserved.ok) {
    console.warn("[admin] dobowy limit złych kodów 2FA wyczerpany – ktoś zna hasło, zmień je");
    return false;
  }
  const ok = await checkTotpOnce(code);
  if (ok) await hit("adm-totp", "all", TOTP_FAILS_PER_DAY, DAY_S, -1);
  return ok;
}

async function checkTotpOnce(code: string) {
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
