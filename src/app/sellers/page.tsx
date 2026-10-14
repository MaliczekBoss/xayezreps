import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { SellersList } from "@/components/tools/sellers";
import { getSellers } from "@/lib/remote";
import { sellerStats } from "@/lib/seller-stats";

export const metadata: Metadata = {
  title: "Sprzedawcy",
  description: "Sprawdzeni sprzedawcy z Weidiana i Taobao, z których zamawiamy najczęściej.",
  alternates: { canonical: "/sellers" },
};

export default async function SellersPage() {
  const sellers = (await getSellers()).map(({ slug, name, description, items }) => ({
    slug,
    name,
    description,
    ...sellerStats(items),
    thumbs: items.slice(0, 3).map((i) => i.image),
  }));
  return (
    <PageShell>
      <SellersList sellers={sellers} />
    </PageShell>
  );
}
