import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OutfitDetail } from "@/components/outfits";
import { PageShell } from "@/components/page-shell";
import { ToolSkeleton } from "@/components/tools/tool-skeleton";
import { resolveOutfits } from "@/lib/outfits";
import { getFinds, getOutfits } from "@/lib/store";

export async function generateStaticParams() {
  const outfits = await getOutfits();
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
  const [outfits, finds] = await Promise.all([getOutfits(), getFinds()]);
  const all = resolveOutfits(outfits, finds);
  const outfit = all.find((o) => o.id === id);
  if (!outfit) notFound();
  return <OutfitDetail outfit={outfit} more={all.filter((o) => o.id !== id).slice(0, 10)} />;
}
