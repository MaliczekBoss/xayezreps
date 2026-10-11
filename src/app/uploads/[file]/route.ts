import { readFile } from "node:fs/promises";
import path from "node:path";

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
};

/** Zdjęcia wgrane w panelu admina (data/uploads) */
export async function GET(_request: Request, ctx: RouteContext<"/uploads/[file]">) {
  const { file } = await ctx.params;
  const name = path.basename(file);
  const type = TYPES[name.split(".").pop()?.toLowerCase() ?? ""];
  if (!type || !/^[\w-]+\.\w+$/.test(name)) return new Response("Nie znaleziono", { status: 404 });

  try {
    const data = await readFile(path.join(process.cwd(), "data", "uploads", name));
    return new Response(new Uint8Array(data), {
      headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Response("Nie znaleziono", { status: 404 });
    throw error;
  }
}
