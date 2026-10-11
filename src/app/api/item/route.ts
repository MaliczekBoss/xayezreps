import { parseSource } from "@/lib/agents";
import { fetchItemDetails } from "@/lib/remote";

/** Szczegóły produktu ze sklepu dla linku: /api/item?url=… */
export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url") ?? "";
  const source = parseSource(url);
  if (!source) return Response.json({ error: "invalid-url" }, { status: 400 });

  try {
    const item = await fetchItemDetails(source);
    if (!item) return Response.json({ error: "not-found" }, { status: 404 });
    return Response.json({ source, item }, { headers: { "Cache-Control": "public, max-age=3600" } });
  } catch {
    return Response.json({ error: "upstream" }, { status: 502 });
  }
}
