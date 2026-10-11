import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth-token";
import { ranges, readStats, type Range } from "@/lib/analytics/stats";

/** Statystyki strony dla panelu admina: /api/admin/stats?range=today|yesterday|7d|30d */
export async function GET(request: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!verifySessionToken(token, Date.now())) return Response.json({ error: "unauthorized" }, { status: 401 });

  const param = new URL(request.url).searchParams.get("range");
  const range: Range = ranges.includes(param as Range) ? (param as Range) : "today";
  try {
    return Response.json(await readStats(range), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[stats] odczyt nie powiódł się:", e);
    return Response.json({ error: "storage" }, { status: 502 });
  }
}
