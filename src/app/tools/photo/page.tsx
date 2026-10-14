import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { PhotoSearch, type PhotoExample } from "@/components/tools/photo-search";
import { normalize } from "@/lib/search";
import { getFinds } from "@/lib/store";

export const metadata: Metadata = {
  title: "Szukaj po zdjęciu",
  description: "Wrzuć zdjęcie ciucha albo butów, a AI znajdzie ten sam lub podobny find w asortymencie xayezreps.",
  alternates: { canonical: "/tools/photo" },
};

const EXAMPLE_ID = "nenn8w2nve";
const EXAMPLE_READ = { brand: "Jordan", model: "Jordan 4", type: "sneakers", color: "black" };

export default async function PhotoSearchPage() {
  const finds = await getFinds();
  const pick = finds.find((f) => f.id === EXAMPLE_ID && f.image);
  const model = normalize(EXAMPLE_READ.model);
  const example: PhotoExample | null = pick
    ? {
        id: pick.id,
        image: pick.image,
        name: pick.name,
        category: pick.category,
        read: EXAMPLE_READ,
        count: finds.filter((f) => normalize(f.name).includes(model)).length,
      }
    : null;
  return (
    <PageShell>
      <PhotoSearch total={finds.length} example={example} />
    </PageShell>
  );
}
