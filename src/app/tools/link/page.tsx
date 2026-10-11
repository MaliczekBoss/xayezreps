import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { LinkConverter } from "@/components/tools/link-converter";
import { ToolSkeleton } from "@/components/tools/tool-skeleton";

export const metadata: Metadata = {
  title: "Konwerter linków",
  description: "Zamień link z Weidiana, Taobao albo 1688 na link do USFans, Kakobuy, Litbuy i Oopbuy.",
  alternates: { canonical: "/tools/link" },
};

export default function LinkConverterPage() {
  return (
    <PageShell>
      <Suspense fallback={<ToolSkeleton />}>
        <LinkConverter />
      </Suspense>
    </PageShell>
  );
}
