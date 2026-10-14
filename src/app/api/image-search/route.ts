import { ImageSearchError, searchByImage } from "@/lib/image-search";
import { trustedOrigin } from "@/lib/site-url";
import { clientIp, tooLarge } from "@/lib/rate-limit";

export const maxDuration = 60;

const STATUS: Record<ImageSearchError["code"], number> = {
  "not-configured": 503,
  "rate-limited": 429,
  busy: 429,
  "bad-image": 400,
  upstream: 502,
};

export async function POST(request: Request) {
  if (tooLarge(request, 4_000_000)) return Response.json({ error: "bad-image" }, { status: 413 });
  let image = "";
  try {
    image = String((await request.json())?.image ?? "");
  } catch {
    return Response.json({ error: "bad-image" }, { status: 400 });
  }

  const ip = clientIp(request);
  try {
    return Response.json(await searchByImage(image, ip, trustedOrigin(request)), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof ImageSearchError) return Response.json({ error: e.code }, { status: STATUS[e.code] });
    console.error("[image-search]", e);
    return Response.json({ error: "upstream" }, { status: 502 });
  }
}
