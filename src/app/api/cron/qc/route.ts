import { revalidateTag } from "next/cache";
import { qcCursor, qcKey, syncQc } from "@/lib/qc-store";
import { fetchQcFromSources } from "@/lib/qc-sources";
import { getAllFinds } from "@/lib/store";

export const maxDuration = 60;

// Ile czasu jedno uruchomienie może sprawdzać aukcje (z zapasem do limitu funkcji)
const BUDGET_MS = 45_000;
const CONCURRENCY = 4;

/**
 * Codzienne sprawdzanie QC (vercel.json → crons): kolejne aukcje z katalogu po kolei, ile się zmieści
 * w czasie, i zapis nowych zdjęć. Następne uruchomienie zaczyna tam, gdzie skończyło poprzednie,
 * więc cały katalog przechodzi się w kółko. Vercel wysyła nagłówek z CRON_SECRET.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const finds = await getAllFinds();
  const sources = [...new Map(finds.map((f) => [qcKey(f.source), f.source])).entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, s]) => s);
  if (sources.length === 0) return Response.json({ checked: 0 });

  const start = await qcCursor();
  const deadline = Date.now() + BUDGET_MS;
  let next = start;
  let checked = 0;
  let added = 0;
  let withQc = 0;

  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (Date.now() < deadline && checked < sources.length) {
        const source = sources[next++ % sources.length];
        checked++;
        try {
          const { photos } = await fetchQcFromSources(source);
          const saved = await syncQc(source, photos);
          added += saved.added;
          if (saved.photos.length) withQc++;
        } catch (e) {
          console.error("[cron qc]", qcKey(source), (e as Error).message);
        }
      }
    }),
  );

  await qcCursor(next % sources.length);
  if (added > 0) revalidateTag("qc-index", "max");
  return Response.json({ checked, withQc, added, from: start, next: next % sources.length, total: sources.length });
}
