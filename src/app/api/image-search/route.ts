import { ImageSearchError, searchByImage } from "@/lib/image-search";

// Odpowiedź modelu AI może potrwać kilkanaście sekund
export const maxDuration = 60;

const STATUS: Record<ImageSearchError["code"], number> = {
  "not-configured": 503,
  "rate-limited": 429,
  busy: 429,
  "bad-image": 400,
  upstream: 502,
};

/** Szukanie findów po zdjęciu: POST { image: "data:image/jpeg;base64,…" } */
export async function POST(request: Request) {
  let image = "";
  try {
    image = String((await request.json())?.image ?? "");
  } catch {
    return Response.json({ error: "bad-image" }, { status: 400 });
  }

  const ip = (request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "").split(",")[0].trim();
  try {
    return Response.json(await searchByImage(image, ip), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof ImageSearchError) return Response.json({ error: e.code }, { status: STATUS[e.code] });
    console.error("[image-search]", e);
    return Response.json({ error: "upstream" }, { status: 502 });
  }
}
