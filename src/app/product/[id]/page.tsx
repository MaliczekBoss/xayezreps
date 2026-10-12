import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { ProductDetail } from "@/components/product-detail";
import { sortPopular } from "@/lib/finds";
import { getQcIndex, withQc } from "@/lib/qc-feed";
import { getAllFinds, getFinds } from "@/lib/store";

// Przy buildzie generujemy tylko najpopularniejsze produkty; reszta renderuje się przy pierwszym wejściu i trafia do cache
const PRERENDER = 120;

export async function generateStaticParams() {
  const finds = sortPopular(await getFinds()).slice(0, PRERENDER);
  return finds.length ? finds.map((f) => ({ id: f.id })) : [{ id: "0" }];
}

export async function generateMetadata({ params }: PageProps<"/product/[id]">): Promise<Metadata> {
  const { id } = await params;
  const find = (await getAllFinds()).find((f) => f.id === id);
  if (!find) return { title: "Nie znaleziono" };
  return {
    title: find.name,
    description: `${find.name} – ${find.category}, ${find.batch}. Cena ok. ${find.pricePln} zł. Link do agenta, zdjęcia QC i kalkulator wysyłki.`,
    alternates: { canonical: `/product/${find.id}` },
    openGraph: { title: find.name, images: find.image ? [{ url: find.image }] : undefined },
    // Produkty tylko z outfitów nie powinny konkurować w wyszukiwarkach z katalogiem
    robots: find.hidden ? { index: false } : undefined,
  };
}

export default function ProductPage({ params }: PageProps<"/product/[id]">) {
  return (
    <PageShell>
      <Suspense fallback={<ProductSkeleton />}>
        <ProductContent params={params} />
      </Suspense>
    </PageShell>
  );
}

async function ProductContent({ params }: { params: PageProps<"/product/[id]">["params"] }) {
  const { id } = await params;
  const [all, qcIndex] = await Promise.all([getAllFinds(), getQcIndex()]);
  const raw = all.find((f) => f.id === id);
  if (!raw) notFound();
  const [find] = withQc([raw], qcIndex);
  const visible = all.filter((f) => !f.hidden && f.id !== find.id);
  // Inne kolory i wersje z tej samej aukcji
  const variants = withQc(
    visible.filter((f) => f.source.platform === find.source.platform && f.source.id === find.source.id),
    qcIndex,
  ).slice(0, 16);
  const variantIds = new Set(variants.map((f) => f.id));
  const related = withQc(sortPopular(visible.filter((f) => f.category === find.category && !variantIds.has(f.id))).slice(0, 12), qcIndex);
  return <ProductDetail find={find} related={related} variants={variants} />;
}

function ProductSkeleton() {
  return (
    <div aria-hidden="true" className="grid animate-pulse gap-8 lg:grid-cols-2">
      <div className="aspect-square rounded-2xl bg-card" />
      <div className="space-y-4">
        <div className="h-6 w-24 rounded-full bg-card" />
        <div className="h-12 w-3/4 rounded-xl bg-card" />
        <div className="h-10 w-40 rounded-xl bg-card" />
        <div className="h-14 rounded-full bg-card" />
      </div>
    </div>
  );
}
