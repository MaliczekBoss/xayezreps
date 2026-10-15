import { revalidateTag } from "next/cache";
import { after } from "next/server";
import { parseSource } from "@/lib/agents";
import { copyQcPhotos, qcCopies } from "@/lib/qc-cdn";
import { isCatalogSource } from "@/lib/qc-feed";
import { fetchQcFromSources } from "@/lib/qc-sources";
import { byNewest, photoUrl, syncQc } from "@/lib/qc-store";
import { limitRequest } from "@/lib/rate-limit";

export const maxDuration = 30;

export async function GET(request: Request) {
  const limited = await limitRequest(request, "qc", 60, 600);
  if (limited) return limited;
  const url = new URL(request.url).searchParams.get("url") ?? "";
  const source = parseSource(url);
  if (!source) return Response.json({ error: "invalid-url" }, { status: 400 });

  const fresh = await fetchQcFromSources(source);
  let photos = byNewest(fresh.photos);

  if (await isCatalogSource(source)) {
    try {
      const saved = await syncQc(source, fresh.photos);
      photos = saved.photos;
      if (saved.added > 0) revalidateTag("qc-index", "max");
      after(() => copyQcPhotos(saved.photos).catch(() => 0));
    } catch (e) {
      console.error("[qc] zapis:", (e as Error).message);
    }
  }

  if (photos.length === 0 && !fresh.ok) return Response.json({ error: "upstream" }, { status: 502 });
  const copies = await qcCopies();
  photos = [...new Set(photos.map((p) => photoUrl(p, copies)))];
  return Response.json({ source, photos }, { headers: { "Cache-Control": "public, max-age=900" } });
}
