import { revalidateTag } from "next/cache";
import { parseSource } from "@/lib/agents";
import { PRICES_TAG, saveAgentPrice } from "@/lib/prices";
import { isCatalogSource } from "@/lib/qc-feed";
import { fetchAgentPriceCny, fetchItemDetails } from "@/lib/remote";

/**
 * Szczegóły produktu ze sklepu dla linku: /api/item?url=…
 * agentPriceCny – aktualna cena u agenta (USFans) w juanach; strona przelicza ją kursem agenta na każdą walutę.
 * Cenę oferty z katalogu zapisujemy, żeby katalog, strona główna i ulubione pokazywały tę samą (prices.ts).
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

  if (agentPriceCny) {
    try {
      if ((await isCatalogSource(source)) && (await saveAgentPrice(source, agentPriceCny))) revalidateTag(PRICES_TAG, "max");
    } catch (e) {
      console.error("[item] zapis ceny:", (e as Error).message);
    }
  }
  return Response.json({ source, item, agentPriceCny }, { headers: { "Cache-Control": "public, max-age=3600" } });
}
