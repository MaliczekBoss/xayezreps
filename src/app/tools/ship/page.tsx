import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { ShipCalculator } from "@/components/tools/ship-calculator";

export const metadata: Metadata = {
  title: "Kalkulator wysyłki",
  description: "Policz koszt wysyłki paczki z Chin do Polski z wagi albo z rzeczy dodanych do paczki.",
  alternates: { canonical: "/tools/ship" },
};

export default function ShipPage() {
  return (
    <PageShell>
      <ShipCalculator />
    </PageShell>
  );
}
