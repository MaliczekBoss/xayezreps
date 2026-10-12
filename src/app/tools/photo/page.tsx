import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { PhotoSearch } from "@/components/tools/photo-search";
import { getFinds } from "@/lib/store";

export const metadata: Metadata = {
  title: "Szukaj po zdjęciu",
  description: "Wrzuć zdjęcie ciucha albo butów, a AI znajdzie ten sam lub podobny find w asortymencie xayezreps.",
  alternates: { canonical: "/tools/photo" },
};

export default async function PhotoSearchPage() {
  const finds = await getFinds();
  const counts = new Map<string, number>();
  for (const f of finds) counts.set(f.category, (counts.get(f.category) ?? 0) + 1);
  const catalog = { total: finds.length, categories: [...counts].sort((a, b) => b[1] - a[1]).slice(0, 8) };
  return (
    <PageShell>
      <PhotoSearch catalog={catalog} />
    </PageShell>
  );
}
