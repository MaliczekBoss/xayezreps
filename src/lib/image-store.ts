import "server-only";

import { mongo, mongoConfigured } from "./analytics/mongo";

const NAME = /^[\w-]+\.webp$/;
const YEAR = "public, max-age=31536000, immutable";

export async function storedImageResponse(folder: "i" | "s" | "o" | "q", file: string) {
  if (!mongoConfigured() || !NAME.test(file)) return new Response("Not found", { status: 404, headers: { "Cache-Control": "public, max-age=300" } });
  try {
    const { images } = await mongo();
    const doc = await images.findOne({ _id: `${folder}/${file}` });
    if (!doc) return new Response("Not found", { status: 404, headers: { "Cache-Control": "public, max-age=300" } });
    const data = Buffer.from(doc.data.buffer);
    return new Response(new Uint8Array(data), { headers: { "Content-Type": doc.type || "image/webp", "Content-Length": String(data.length), "Cache-Control": YEAR } });
  } catch (error) {
    console.error("[zdjęcia]", (error as Error).message);
    return new Response("Unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
