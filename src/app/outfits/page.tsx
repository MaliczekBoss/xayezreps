import type { Metadata } from "next";
import { OutfitsIndex } from "@/components/outfits";
import { PageShell } from "@/components/page-shell";
import { resolveOutfits } from "@/lib/outfits";
import { getFinds, getOutfits } from "@/lib/store";

export const metadata: Metadata = {
  title: "Outfity",
  description: "Gotowe stylizacje z linkiem do każdej części: bluzy, spodnie, buty i dodatki z Weidiana i Taobao.",
  alternates: { canonical: "/outfits" },
};

export default async function OutfitsPage() {
  const [outfits, finds] = await Promise.all([getOutfits(), getFinds()]);
  return (
    <PageShell>
      <OutfitsIndex outfits={resolveOutfits(outfits, finds)} />
    </PageShell>
  );
}
