import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { QcFinder } from "@/components/tools/qc-finder";
import { ToolSkeleton } from "@/components/tools/tool-skeleton";

export const metadata: Metadata = {
  title: "Wyszukiwarka zdjęć QC",
  description: "Wklej link do produktu i zobacz prawdziwe zdjęcia QC z magazynów agentów, zanim kupisz.",
  alternates: { canonical: "/tools/qc" },
};

export default function QcFinderPage() {
  return (
    <PageShell>
      <Suspense fallback={<ToolSkeleton />}>
        <QcFinder />
      </Suspense>
    </PageShell>
  );
}
