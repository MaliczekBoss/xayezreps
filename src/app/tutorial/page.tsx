import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { Guide, type GuideExample } from "@/components/tools/guide";
import { sortPopular } from "@/lib/finds";
import { getQcIndex, withQc } from "@/lib/qc-feed";
import { getFinds } from "@/lib/store";

export const metadata: Metadata = {
  title: "Jak zamawiać z Chin",
  description: "Pierwsze zamówienie przez agenta krok po kroku: konto, find, płatność, zdjęcia QC, wysyłka i odbiór. Z prawdziwym przykładem kosztów.",
  alternates: { canonical: "/tutorial" },
};

export default async function TutorialPage() {
  const [finds, qcIndex] = await Promise.all([getFinds(), getQcIndex()]);
  const pool = withQc(sortPopular(finds), qcIndex).filter((f) => f.image && f.pricePln > 0 && f.qcCover && (f.qc ?? 0) >= 4);
  const pick = pool.find((f) => f.category === "Buty") ?? pool[0];
  const example: GuideExample | null = pick
    ? {
        id: pick.id,
        name: pick.name,
        image: pick.image,
        pricePln: pick.pricePln,
        weightGrams: pick.weightGrams,
        qc: pick.qc ?? 0,
        qcCover: pick.qcCover!,
        source: pick.source,
      }
    : null;
  return (
    <PageShell>
      <Guide example={example} />
    </PageShell>
  );
}
