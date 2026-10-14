import { liveSellerItems } from "@/lib/live";
import { getSellers } from "@/lib/remote";
import { buildSearchIndex, searchFinds } from "@/lib/search";
import { limitRequest } from "@/lib/rate-limit";

const PAGE = 60;

/** Produkty jednego sprzedawcy w porcjach, z wyszukiwaniem i sortowaniem: /api/sellers/{slug}?q=…&sort=price_asc|price_desc&offset=… */
export async function GET(request: Request, ctx: RouteContext<"/api/sellers/[slug]">) {
  const limited = await limitRequest(request, "sellers", 600, 600);
  if (limited) return limited;
  const { slug } = await ctx.params;
  const params = new URL(request.url).searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, 80);
  const offset = Math.max(0, Number(params.get("offset")) || 0);

  const seller = (await getSellers()).find((s) => s.slug === slug);
  if (!seller) return Response.json({ error: "not-found" }, { status: 404 });

  const sort = params.get("sort");
  // Ta sama wyszukiwarka co w katalogu: „koszulka” znajdzie T-Shirt, literówki też przejdą
  const items = seller.items.map((i) => ({ id: i.id, name: i.title, item: i }));
  const filtered = q ? searchFinds(buildSearchIndex(items), items, q).items.map((s) => s.item) : seller.items;
  const matching = sort === "price_asc" ? [...filtered].sort((a, b) => a.price - b.price) : sort === "price_desc" ? [...filtered].sort((a, b) => b.price - a.price) : filtered;
  return Response.json(
    { total: matching.length, items: await liveSellerItems(matching.slice(offset, offset + PAGE)) },
    { headers: { "Cache-Control": "public, max-age=600" } },
  );
}
