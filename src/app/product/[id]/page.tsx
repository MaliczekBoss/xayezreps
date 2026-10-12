import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { ProductDetail } from "@/components/product-detail";
import { sortPopular } from "@/lib/finds";
import { getQcIndex, withQc } from "@/lib/qc-feed";
import { getFinds } from "@/lib/store";

export async function generateStaticParams() {
  const finds = await getFinds();
  return finds.length ? finds.map((f) => ({ id: f.id })) : [{ id: "0" }];
}

export async function generateMetadata({ params }: PageProps<"/product/[id]">): Promise<Metadata> {
  const { id } = await params;
  const find = (await getFinds()).find((f) => f.id === id);
  if (!find) return { title: "Nie znaleziono" };
  return {
    title: find.name,
    description: `${find.name} – ${find.category}, ${find.batch}. Cena ok. ${find.pricePln} zł. Link do agenta, zdjęcia QC i kalkulator wysyłki.`,
    alternates: { canonical: `/product/${find.id}` },
    openGraph: { title: find.name, images: [{ url: find.image }] },
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
  const finds = withQc(await getFinds(), await getQcIndex());
  const find = finds.find((f) => f.id === id);
  if (!find) notFound();
  const related = sortPopular(finds.filter((f) => f.category === find.category && f.id !== find.id)).slice(0, 12);
  return <ProductDetail find={find} related={related} />;
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
