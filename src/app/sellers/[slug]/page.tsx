import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { SellerShop } from "@/components/tools/sellers";
import { ToolSkeleton } from "@/components/tools/tool-skeleton";
import { getSellers } from "@/lib/remote";
import { liveSellerItems } from "@/lib/live";
import { sellerStats } from "@/lib/seller-stats";

const FIRST_PAGE = 60;

export async function generateStaticParams() {
  const sellers = await getSellers();
  return sellers.length ? sellers.map((s) => ({ slug: s.slug })) : [{ slug: "tophotfashion" }];
}

export async function generateMetadata({ params }: PageProps<"/sellers/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const seller = (await getSellers()).find((s) => s.slug === slug);
  if (!seller) return { title: "Nie znaleziono" };
  return {
    title: `${seller.name} – sprzedawca`,
    description: seller.description || `Wszystkie produkty sprzedawcy ${seller.name} z linkami do agentów.`,
    alternates: { canonical: `/sellers/${seller.slug}` },
  };
}

export default function SellerPage({ params }: PageProps<"/sellers/[slug]">) {
  return (
    <PageShell>
      <Suspense fallback={<ToolSkeleton />}>
        <SellerContent params={params} />
      </Suspense>
    </PageShell>
  );
}

async function SellerContent({ params }: { params: PageProps<"/sellers/[slug]">["params"] }) {
  const { slug } = await params;
  const seller = (await getSellers()).find((s) => s.slug === slug);
  if (!seller) notFound();
  const { items, slug: s, name, description } = seller;
  return <SellerShop seller={{ slug: s, name, description, ...sellerStats(items) }} initial={await liveSellerItems(items.slice(0, FIRST_PAGE))} />;
}
