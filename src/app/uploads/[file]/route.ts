import path from "node:path";
import { isUploadName, readImage } from "@/lib/docstore";

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
};

/** Zdjęcia wgrane w panelu admina (z Upstash Redis albo z folderu data/uploads) */
export async function GET(_request: Request, ctx: RouteContext<"/uploads/[file]">) {
  const { file } = await ctx.params;
  const name = path.basename(file);
  const type = TYPES[name.split(".").pop()?.toLowerCase() ?? ""];
  if (!type || !isUploadName(name)) return new Response("Nie znaleziono", { status: 404 });

  const data = await readImage(name);
  if (!data) return new Response("Nie znaleziono", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
