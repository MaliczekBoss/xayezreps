import { revalidateTag } from "next/cache";
import { after } from "next/server";
import { copyQcPhotos } from "@/lib/qc-cdn";
import { qcCursor, qcKey, syncQc } from "@/lib/qc-store";
import { fetchQcFromSources } from "@/lib/qc-sources";
import { getAllFinds } from "@/lib/store";
import { isCronRequest } from "@/lib/rate-limit";

export const maxDuration = 60;

const BUDGET_MS = 45_000;
const CONCURRENCY = 4;

export async function GET(request: Request) {
  if (!isCronRequest(request)) {
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
  const fresh: string[][] = [];

  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (Date.now() < deadline && checked < sources.length) {
        const source = sources[next++ % sources.length];
        checked++;
        try {
          const { photos } = await fetchQcFromSources(source);
          const saved = await syncQc(source, photos);
          added += saved.added;
          if (saved.added > 0) fresh.push(saved.photos);
          if (saved.photos.length) withQc++;
        } catch (e) {
          console.error("[cron qc]", qcKey(source), (e as Error).message);
        }
      }
    }),
  );

  await qcCursor(next % sources.length);
  if (added > 0) revalidateTag("qc-index", "max");
  after(async () => {
    for (const photos of fresh) await copyQcPhotos(photos).catch(() => 0);
  });
  return Response.json({ checked, withQc, added, from: start, next: next % sources.length, total: sources.length });
}
