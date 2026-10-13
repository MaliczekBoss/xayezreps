import { revalidateTag } from "next/cache";
import { parseSource } from "@/lib/agents";
import { isCatalogSource } from "@/lib/qc-feed";
import { fetchQcFromSources } from "@/lib/qc-sources";
import { byNewest, syncQc } from "@/lib/qc-store";

// Źródła QC potrafią odpowiadać kilkanaście sekund
export const maxDuration = 30;

/**
 * Zdjęcia QC dla linku produktu: /api/qc?url=…
 * Pyta wszystkie źródła naraz. Dla aukcji z naszego katalogu nowe zdjęcia zapisuje i oddaje całą
 * zapisaną historię, więc zdjęcia z dawnych zamówień nie znikają, gdy źródło pokazuje już tylko nowsze.
 */
export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url") ?? "";
  const source = parseSource(url);
  if (!source) return Response.json({ error: "invalid-url" }, { status: 400 });

  const fresh = await fetchQcFromSources(source);
  let photos = byNewest(fresh.photos);

  if (await isCatalogSource(source)) {
    try {
      const saved = await syncQc(source, fresh.photos);
      photos = saved.photos;
      // Nowe zdjęcia zmieniają liczbę QC w katalogu
      if (saved.added > 0) revalidateTag("qc-index", "max");
    } catch (e) {
      console.error("[qc] zapis:", (e as Error).message);
    }
  }

  if (photos.length === 0 && !fresh.ok) return Response.json({ error: "upstream" }, { status: 502 });
  return Response.json({ source, photos }, { headers: { "Cache-Control": "public, max-age=900" } });
}
