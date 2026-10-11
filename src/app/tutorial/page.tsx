import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { Guide } from "@/components/tools/guide";

export const metadata: Metadata = {
  title: "Jak zamawiać z Chin",
  description: "Pierwsze zamówienie przez agenta krok po kroku: konto, find, płatność, zdjęcia QC, wysyłka i odbiór.",
  alternates: { canonical: "/tutorial" },
};

export default function TutorialPage() {
  return (
    <PageShell>
      <Guide />
    </PageShell>
  );
}
