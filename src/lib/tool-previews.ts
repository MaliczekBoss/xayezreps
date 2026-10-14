import "server-only";

import type { ToolPreviews } from "@/components/tools";
import { sortPopular } from "./finds";
import { getQcFeed } from "./qc-feed";
import { getSellers } from "./remote";
import { getFinds } from "./store";

export async function getToolPreviews(): Promise<ToolPreviews> {
  const [finds, qcFeed, sellers] = await Promise.all([getFinds(), getQcFeed(), getSellers()]);
  return {
    products: sortPopular(finds)
      .filter((f) => f.category === "Buty")
      .concat(sortPopular(finds))
      .slice(0, 8)
      .map((f) => ({ image: f.image, name: f.name })),
    qc: qcFeed.slice(0, 3).map((e) => e.cover),
    sellerThumbs: sellers.slice(0, 4).map((s) => s.items[0]?.image ?? ""),
    sellerCount: sellers.length,
    sellerItems: sellers.reduce((sum, s) => sum + s.itemCount, 0),
    sellers: sellers.slice(0, 3).map((s) => ({ name: s.name, itemCount: s.itemCount, thumbs: s.items.slice(0, 5).map((i) => i.image) })),
  };
}
