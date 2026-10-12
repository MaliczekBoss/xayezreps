import type { Metadata } from "next";
import { FavoritesList } from "@/components/favorites-list";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Ulubione",
  description: "Findy zapisane serduszkiem.",
  robots: { index: false },
};

export default function FavoritesPage() {
  return (
    <PageShell>
      <FavoritesList />
    </PageShell>
  );
}
