import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { QcFinder } from "@/components/tools/qc-finder";
import { ToolSkeleton } from "@/components/tools/tool-skeleton";
import { getQcFeed } from "@/lib/qc-feed";

export const metadata: Metadata = {
  title: "Wyszukiwarka zdjęć QC",
  description: "Wklej link do produktu i zobacz prawdziwe zdjęcia QC z magazynów agentów, zanim kupisz.",
  alternates: { canonical: "/tools/qc" },
};

export default async function QcFinderPage() {
  const examples = (await getQcFeed()).slice(0, 8);
  return (
    <PageShell>
      <Suspense fallback={<ToolSkeleton />}>
        <QcFinder examples={examples} />
      </Suspense>
    </PageShell>
  );
}
