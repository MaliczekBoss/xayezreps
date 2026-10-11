import type { Metadata } from "next";
import { Suspense } from "react";
import { FindsCatalog } from "@/components/finds-catalog";
import { PageShell } from "@/components/page-shell";
import { getFinds } from "@/lib/store";

export const metadata: Metadata = {
  title: "Findy",
  description: "Wszystkie sprawdzone findy z linkami do agentów: szukaj, filtruj po kategorii i batchu, sortuj po cenie.",
  alternates: { canonical: "/finds" },
};

export default async function FindsPage() {
  const finds = await getFinds();
  return (
    <PageShell>
      <Suspense fallback={<CatalogSkeleton />}>
        <FindsCatalog finds={finds} />
      </Suspense>
    </PageShell>
  );
}

function CatalogSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse">
      <div className="h-4 w-40 rounded bg-card" />
      <div className="mt-6 h-14 w-80 rounded-xl bg-card" />
      <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="aspect-[4/6] rounded-2xl bg-card" />
        ))}
      </div>
    </div>
  );
}
