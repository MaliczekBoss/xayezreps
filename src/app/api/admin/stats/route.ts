import { ranges, readStats, type Range } from "@/lib/analytics/stats";
import { isAdmin } from "@/lib/auth";

const noStore = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

export async function GET(request: Request) {
  if (!(await isAdmin())) return Response.json({ error: "unauthorized" }, { status: 401, headers: noStore });

  const param = new URL(request.url).searchParams.get("range");
  const range: Range = ranges.includes(param as Range) ? (param as Range) : "today";
  try {
    return Response.json(await readStats(range), { headers: noStore });
  } catch (e) {
    console.error("[stats] odczyt nie powiódł się:", e);
    return Response.json({ error: "storage" }, { status: 502, headers: noStore });
  }
}
