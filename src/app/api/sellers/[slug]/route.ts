import { getSellers } from "@/lib/remote";

const PAGE = 48;

const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

/** Produkty jednego sprzedawcy w porcjach, z wyszukiwaniem: /api/sellers/{slug}?q=…&offset=… */
export async function GET(request: Request, ctx: RouteContext<"/api/sellers/[slug]">) {
  const { slug } = await ctx.params;
  const params = new URL(request.url).searchParams;
  const q = normalize((params.get("q") ?? "").trim()).slice(0, 80);
  const offset = Math.max(0, Number(params.get("offset")) || 0);

  const seller = (await getSellers()).find((s) => s.slug === slug);
  if (!seller) return Response.json({ error: "not-found" }, { status: 404 });

  const matching = q ? seller.items.filter((i) => normalize(i.title).includes(q)) : seller.items;
  return Response.json(
    { total: matching.length, items: matching.slice(offset, offset + PAGE) },
    { headers: { "Cache-Control": "public, max-age=600" } },
  );
}
