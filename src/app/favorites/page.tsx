import type { Metadata } from "next";
import { FavoritesList } from "@/components/favorites-list";
import { PageShell } from "@/components/page-shell";
import { getQcIndex, withQc } from "@/lib/qc-feed";
import { getFinds } from "@/lib/store";

export const metadata: Metadata = {
  title: "Ulubione",
  description: "Findy zapisane serduszkiem.",
  robots: { index: false },
};

export default async function FavoritesPage() {
  const [finds, qcIndex] = await Promise.all([getFinds(), getQcIndex()]);
  return (
    <PageShell>
      <FavoritesList finds={withQc(finds, qcIndex)} />
    </PageShell>
  );
}
