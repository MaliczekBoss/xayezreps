import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OutfitDetail } from "@/components/outfits";
import { PageShell } from "@/components/page-shell";
import { ToolSkeleton } from "@/components/tools/tool-skeleton";
import { resolveOutfits, summarizeOutfits } from "@/lib/outfits";
import { getQcIndex, withQc } from "@/lib/qc-feed";
import { getAllFinds, getOutfits } from "@/lib/store";
import { live } from "@/lib/live";

const PRERENDER = 48;

export async function generateStaticParams() {
  const outfits = (await getOutfits()).slice(0, PRERENDER);
  return outfits.length ? outfits.map((o) => ({ id: o.id })) : [{ id: "0" }];
}

export async function generateMetadata({ params }: PageProps<"/outfits/[id]">): Promise<Metadata> {
  const { id } = await params;
  const outfit = (await getOutfits()).find((o) => o.id === id);
  if (!outfit) return { title: "Nie znaleziono" };
  return {
    title: `${outfit.title} – outfit`,
    description: `${outfit.title}: ${outfit.parts.length} części z linkami do agentów.`,
    alternates: { canonical: `/outfits/${outfit.id}` },
    ...(outfit.image ? { openGraph: { images: [{ url: outfit.image }] } } : {}),
  };
}

export default function OutfitPage({ params }: PageProps<"/outfits/[id]">) {
  return (
    <PageShell>
      <Suspense fallback={<ToolSkeleton />}>
        <OutfitContent params={params} />
      </Suspense>
    </PageShell>
  );
}

async function OutfitContent({ params }: { params: PageProps<"/outfits/[id]">["params"] }) {
  const { id } = await params;
  const [outfits, raw, qcIndex] = await Promise.all([getOutfits(), getAllFinds().then(live), getQcIndex()]);
  const finds = withQc(raw, qcIndex);
  const own = outfits.find((o) => o.id === id);
  const [outfit] = own ? resolveOutfits([own], finds) : [];
  if (!outfit) notFound();
  const more = summarizeOutfits(
    outfits.filter((o) => o.id !== id && (o.gender ?? "boy") === (own?.gender ?? "boy")),
    finds,
  ).slice(0, 12);
  return <OutfitDetail outfit={outfit} more={more} />;
}
