import { revalidateTag } from "next/cache";
import { parseSource, type ProductSource } from "@/lib/agents";
import { PRICES_TAG, saveAgentPrice } from "@/lib/prices";
import { isCatalogSource } from "@/lib/qc-feed";
import { agentStatus, fetchAgentPriceCny, fetchItemDetails, getSellers } from "@/lib/remote";
import { limitRequest } from "@/lib/rate-limit";

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
  return Response.json(
    { source, item, agentPriceCny },
    { headers: { "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=3600", "X-Agent-Status": await agentStatus(source) } },
  );
}

async function isKnownSource(source: ProductSource) {
  if (await isCatalogSource(source)) return true;
  return (await getSellers()).some((s) => s.items.some((i) => i.link.includes(source.id) && parseSource(i.link)?.id === source.id));
}
