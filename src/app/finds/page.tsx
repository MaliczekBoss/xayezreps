import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { FindsCatalog } from "@/components/finds-catalog";
import { PageShell } from "@/components/page-shell";
import { getCatalogFacets, newSeed, parseCatalogQuery, queryCatalog } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Findy",
  description: "Wszystkie sprawdzone findy z linkami do agentów: szukaj, filtruj po kategorii i batchu, sortuj po cenie.",
  alternates: { canonical: "/finds" },
};

export default function FindsPage({ searchParams }: PageProps<"/finds">) {
  return (
    <PageShell>
      <Suspense fallback={<CatalogSkeleton />}>
        <Catalog searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}

async function Catalog({ searchParams }: { searchParams: PageProps<"/finds">["searchParams"] }) {
  const raw = await searchParams;
  // Kolejność „Losowo” jest inna przy każdym wejściu, więc ziarno losujemy przy zapytaniu, nie przy budowie strony
  await connection();
  const seed = newSeed();
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) if (typeof value === "string") params.set(key, value);
  const [facets, initial] = await Promise.all([getCatalogFacets(), queryCatalog({ ...parseCatalogQuery(params), seed, offset: 0 })]);
  // Nowy adres z zewnątrz (np. wyszukiwarka w nagłówku) to nowy katalog z własnym stanem
  return <FindsCatalog key={params.toString()} facets={facets} initial={initial} seed={seed} />;
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
