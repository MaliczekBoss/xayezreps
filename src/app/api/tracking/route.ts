import { fetchTracking } from "@/lib/remote";

/** Status przesyłki: /api/tracking?number=… */
export async function GET(request: Request) {
  const number = (new URL(request.url).searchParams.get("number") ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9-]{8,40}$/.test(number)) return Response.json({ error: "invalid-number" }, { status: 400 });

  const data = await fetchTracking(number);
  return Response.json({ number, data });
}
