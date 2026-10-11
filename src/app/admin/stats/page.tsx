import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { getFindsFresh } from "@/lib/store";
import { StatsDashboard } from "./stats-dashboard";

export const metadata: Metadata = { title: "Statystyki" };

export default function StatsPage() {
  return (
    <Suspense fallback={<p className="p-10 text-center text-sm text-muted">Ładowanie statystyk…</p>}>
      <StatsContent />
    </Suspense>
  );
}

async function StatsContent() {
  if (!(await isAdmin())) redirect("/admin/login");
  // Nazwy produktów, żeby w „Najczęściej oglądane” zamiast /product/123 była nazwa
  const productNames = Object.fromEntries((await getFindsFresh()).map((f) => [f.id, f.name]));
  return <StatsDashboard productNames={productNames} />;
}
