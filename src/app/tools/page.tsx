import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { ToolsIndex } from "@/components/tools/tools-index";

export const metadata: Metadata = {
  title: "Narzędzia",
  description: "Konwerter linków, wyszukiwarka zdjęć QC, śledzenie paczek, kalkulator wysyłki i sprawdzeni sprzedawcy.",
  alternates: { canonical: "/tools" },
};

export default function ToolsPage() {
  return (
    <PageShell>
      <ToolsIndex />
    </PageShell>
  );
}
