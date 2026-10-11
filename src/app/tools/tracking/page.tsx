import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { ToolSkeleton } from "@/components/tools/tool-skeleton";
import { Tracker } from "@/components/tools/tracker";

export const metadata: Metadata = {
  title: "Śledzenie paczek",
  description: "Sprawdź, gdzie jest twoja paczka z Chin: numer przesyłki, przewoźnik i historia.",
  alternates: { canonical: "/tools/tracking" },
};

export default function TrackingPage() {
  return (
    <PageShell>
      <Suspense fallback={<ToolSkeleton />}>
        <Tracker />
      </Suspense>
    </PageShell>
  );
}
