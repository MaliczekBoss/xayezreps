import { storedImageResponse } from "@/lib/image-store";

export async function GET(_request: Request, ctx: RouteContext<"/o/[file]">) {
  const { file } = await ctx.params;
  return storedImageResponse("o", file);
}
