import { findsByIds, parseCatalogQuery, queryCatalog } from "@/lib/catalog";

const HEADERS = { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=3600" };

/**
 * Porcja katalogu: /api/finds?q=…&category=…&batch=…&qc=1&sort=…&offset=…
 * albo konkretne produkty (ulubione): /api/finds?ids=a,b,c
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const ids = params.get("ids");
  if (ids !== null) {
    const list = ids.split(",").map((id) => id.trim()).filter(Boolean).slice(0, 200);
    return Response.json({ items: await findsByIds(list) }, { headers: { "Cache-Control": "public, max-age=60" } });
  }
  return Response.json(await queryCatalog(parseCatalogQuery(params)), { headers: HEADERS });
}
