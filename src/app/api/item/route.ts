import { revalidateTag } from "next/cache";
import { parseSource, type ProductSource } from "@/lib/agents";
import { PRICES_TAG, saveAgentPrice } from "@/lib/prices";
import { isCatalogSource } from "@/lib/qc-feed";
import { agentStatus, fetchAgentPriceCny, fetchItemDetails, getSellers } from "@/lib/remote";
import { limitRequest } from "@/lib/rate-limit";

/**
 * Szczegóły produktu dla linku: /api/item?url=… – na żywo z USFans (zdjęcia, warianty, dostępność), CDN trzyma je 15 min.
 * agentPriceCny – aktualna cena u agenta (USFans) w juanach; strona przelicza ją kursem agenta na każdą walutę.
 * Cenę oferty z katalogu zapisujemy, żeby katalog, strona główna i ulubione pokazywały tę samą (prices.ts).
 */
export async function GET(request: Request) {
  const limited = await limitRequest(request, "item", 120, 600);
  if (limited) return limited;
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
      if ((await isKnownSource(source)) && (await saveAgentPrice(source, agentPriceCny))) revalidateTag(PRICES_TAG, "max");
    } catch (e) {
      console.error("[item] zapis ceny:", (e as Error).message);
    }
  }
  // X-Agent-Status: kod odpowiedzi USFans (200 = dane na żywo) – widać, czy szczegóły są od agenta, czy z zapisu
  return Response.json(
    { source, item, agentPriceCny },
    { headers: { "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=3600", "X-Agent-Status": agentStatus(source) } },
  );
}

/** Aukcja z katalogu albo od jednego z naszych sprzedawców – tylko takim zapisujemy ceny */
async function isKnownSource(source: ProductSource) {
  if (await isCatalogSource(source)) return true;
  return (await getSellers()).some((s) => s.items.some((i) => i.link.includes(source.id) && parseSource(i.link)?.id === source.id));
}
