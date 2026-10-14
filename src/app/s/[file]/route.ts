import { storedImageResponse } from "@/lib/image-store";

export async function GET(_request: Request, ctx: RouteContext<"/s/[file]">) {
  const { file } = await ctx.params;
  return storedImageResponse("s", file);
}
