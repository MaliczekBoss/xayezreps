import { agents, parseSource } from "@/lib/agents";
import { fetchQcPhotos } from "@/lib/remote";

/** Zdjęcia QC dla linku produktu: /api/qc?url=… */
export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url") ?? "";
  const source = parseSource(url);
  if (!source) return Response.json({ error: "invalid-url" }, { status: 400 });

  try {
    const photos = await fetchQcPhotos(agents[0].productUrl(source));
    if (photos === null) return Response.json({ error: "upstream" }, { status: 502 });
    return Response.json({ source, photos }, { headers: { "Cache-Control": "public, max-age=900" } });
  } catch {
    return Response.json({ error: "upstream" }, { status: 502 });
  }
}
