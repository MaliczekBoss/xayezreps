import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { PhotoSearch } from "@/components/tools/photo-search";

export const metadata: Metadata = {
  title: "Szukaj po zdjęciu",
  description: "Wrzuć zdjęcie ciucha albo butów, a AI znajdzie ten sam lub podobny find w asortymencie xayezreps.",
  alternates: { canonical: "/tools/photo" },
};

export default function PhotoSearchPage() {
  return (
    <PageShell>
      <PhotoSearch />
    </PageShell>
  );
}
