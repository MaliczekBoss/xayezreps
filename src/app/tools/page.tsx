import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { ToolsIndex } from "@/components/tools/tools-index";
import { getToolPreviews } from "@/lib/tool-previews";

export const metadata: Metadata = {
  title: "Narzędzia",
  description: "Konwerter linków, wyszukiwarka zdjęć QC, śledzenie paczek, kalkulator wysyłki i sprawdzeni sprzedawcy.",
  alternates: { canonical: "/tools" },
};

export default async function ToolsPage() {
  const previews = await getToolPreviews();
  return (
    <PageShell>
      <ToolsIndex previews={previews} />
    </PageShell>
  );
}
