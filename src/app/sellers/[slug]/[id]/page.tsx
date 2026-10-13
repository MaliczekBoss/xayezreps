import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { ProductDetail } from "@/components/product-detail";
import { ToolSkeleton } from "@/components/tools/tool-skeleton";
import type { Find } from "@/lib/finds";
import { live } from "@/lib/live";
import { getSellers } from "@/lib/remote";
import { toSellerFind } from "@/lib/seller-find";

// Oferta sprzedawcy: ta sama strona co produkt z katalogu (galeria, agenci, cena u agenta, zdjęcia QC),
// a niżej więcej produktów z tego sklepu. Przy buildzie generujemy tylko pierwsze oferty każdego sklepu.
const PRERENDER_PER_SELLER = 3;

async function offer(slug: string, id: string) {
  const seller = (await getSellers()).find((s) => s.slug === slug);
  const item = seller?.items.find((i) => i.id === id);
  return seller && item ? { seller, item, find: toSellerFind(seller.slug, item) } : null;
}

export async function generateStaticParams() {
  const sellers = await getSellers();
  const params = sellers.flatMap((s) => s.items.slice(0, PRERENDER_PER_SELLER).map((i) => ({ slug: s.slug, id: i.id })));
  return params.length ? params : [{ slug: "tophotfashion", id: "0" }];
}

export async function generateMetadata({ params }: PageProps<"/sellers/[slug]/[id]">): Promise<Metadata> {
  const { slug, id } = await params;
  const found = await offer(slug, id);
  if (!found?.find) return { title: "Nie znaleziono" };
  const { seller, find } = found;
  const price = find.pricePln > 0 ? ` za ${new Intl.NumberFormat("pl-PL").format(find.pricePln)} zł` : "";
  return {
    title: `${find.name} – ${seller.name}`,
    description: `Kup ${find.name}${price} ze sklepu ${seller.name}. Link do agenta, zdjęcia QC i kalkulator paczki.`,
    alternates: { canonical: find.href },
  };
}

export default function SellerOfferPage({ params }: PageProps<"/sellers/[slug]/[id]">) {
  return (
    <PageShell>
      <Suspense fallback={<ToolSkeleton />}>
        <OfferContent params={params} />
      </Suspense>
    </PageShell>
  );
}

async function OfferContent({ params }: { params: PageProps<"/sellers/[slug]/[id]">["params"] }) {
  const { slug, id } = await params;
  const found = await offer(slug, id);
  if (!found?.find) notFound();
  const { seller, find } = found;
  // Więcej z tego sklepu: najpierw z tej samej kategorii, potem reszta
  const others = seller.items
    .filter((i) => i.id !== id)
    .map((i) => toSellerFind(seller.slug, i))
    .filter((f): f is Find => f !== null);
  const related = [...others.filter((f) => f.category === find.category), ...others.filter((f) => f.category !== find.category)].slice(0, 12);
  const [current, ...more] = await live([find, ...related]);
  return <ProductDetail find={current} related={more} back={{ href: `/sellers/${seller.slug}`, label: seller.name }} />;
}
