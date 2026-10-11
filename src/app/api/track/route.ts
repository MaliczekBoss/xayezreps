import { createHash } from "node:crypto";
import { AGENT_HOSTS, isSource, normalizePath, SESSION_ID } from "@/lib/analytics/shared";
import { record, stamp, type TrackEvent, type Visitor } from "@/lib/analytics/stats";

const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|embedly|whatsapp|curl|wget|python|axios/i;
const MAX_DUR_S = 30 * 60;

const done = () => new Response(null, { status: 204 });

/** Zdarzenia statystyk z przeglądarki (sendBeacon, text/plain): odsłona, czas aktywności, klik do agenta */
export async function POST(request: Request) {
  const ua = request.headers.get("user-agent") ?? "";
  if (!ua || BOT.test(ua)) return done();

  const text = await request.text();
  if (text.length > 2048) return done();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text);
  } catch {
    return done();
  }

  const sid = String(body.sid ?? "");
  if (!SESSION_ID.test(sid)) return done();
  // Przeglądarki w aplikacjach TikTok, Instagram i Facebook zwykle nie podają, skąd przyszedł ruch – rozpoznajemy je po nazwie
  const inApp = /musical_ly|BytedanceWebview|TikTok/i.test(ua) ? "tiktok" : /Instagram/i.test(ua) ? "instagram" : /FBAN|FBAV|FB_IAB/i.test(ua) ? "facebook" : null;
  const claimed = isSource(body.src) ? body.src : "other";
  const src = claimed === "direct" && inApp ? inApp : claimed;
  const dur = Math.min(MAX_DUR_S, Math.max(0, Math.round(Number(body.dur) || 0)));

  let event: TrackEvent | null = null;
  if (body.t === "pv") {
    event = { t: "pv", sid, src, dur, path: normalizePath(String(body.p ?? "/")), isNew: body.new === true, n: Math.max(1, Math.round(Number(body.n) || 1)) };
  } else if (body.t === "ping") {
    event = { t: "ping", sid, src, dur };
  } else if (body.t === "out") {
    const agent = AGENT_HOSTS.find(([id]) => id === body.a)?.[0];
    if (agent) event = { t: "out", sid, src, agent };
  }
  if (!event) return done();

  // Odwiedzającego rozpoznajemy po dziennym hashu IP i przeglądarki – samego IP nigdzie nie zapisujemy
  const ip = (request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "").split(",")[0].trim();
  const salt = process.env.ADMIN_SECRET ?? "xayezreps";
  const visitor: Visitor = {
    id: createHash("sha256").update(`${salt}|${stamp(Date.now()).day}|${ip}|${ua}`).digest("hex").slice(0, 16),
    country: /^[A-Z]{2}$/.test(request.headers.get("x-vercel-ip-country") ?? "") ? request.headers.get("x-vercel-ip-country")! : "XX",
    device: /iPad|Tablet/i.test(ua) ? "tablet" : /Mobi|Android|iPhone/i.test(ua) ? "mobile" : "desktop",
  };

  // Tylko lokalnie: zdarzenie z podaną datą, żeby dało się przetestować porównanie z poprzednim okresem
  const at = process.env.NODE_ENV === "development" && typeof body.at === "number" ? body.at : Date.now();

  try {
    await record(event, visitor, at);
  } catch (e) {
    console.error("[stats] zapis nie powiódł się:", e);
  }
  return done();
}
