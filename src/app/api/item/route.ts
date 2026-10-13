import { parseSource } from "@/lib/agents";
import { fetchAgentPriceCny, fetchItemDetails } from "@/lib/remote";

/**
 * Szczegóły produktu ze sklepu dla linku: /api/item?url=…
 * agentPriceCny – aktualna cena u agenta (USFans) w juanach; strona przelicza ją kursem agenta na każdą walutę.
 */
export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url") ?? "";
  const source = parseSource(url);
  if (!source) return Response.json({ error: "invalid-url" }, { status: 400 });

  const [item, agentPriceCny] = await Promise.all([
    fetchItemDetails(source).catch(() => null),
    fetchAgentPriceCny(source).catch(() => null),
  ]);
  if (!item && !agentPriceCny) return Response.json({ error: "not-found" }, { status: 404 });
  return Response.json({ source, item, agentPriceCny }, { headers: { "Cache-Control": "public, max-age=3600" } });
}
