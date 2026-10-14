import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { LinkConverter } from "@/components/tools/link-converter";
import { ToolSkeleton } from "@/components/tools/tool-skeleton";
import { sourceUrl } from "@/lib/agents";
import { sortPopular } from "@/lib/finds";
import { getFinds } from "@/lib/store";

export const metadata: Metadata = {
  title: "Konwerter linków",
  description: "Zamień link z Weidiana, Taobao albo 1688 na link do USFans, Kakobuy, Litbuy i Oopbuy.",
  alternates: { canonical: "/tools/link" },
};

export default async function LinkConverterPage() {
  const top = sortPopular(await getFinds()).find((f) => f.source.platform === "weidian");
  const example = top ? { name: top.name, image: top.image, url: sourceUrl(top.source) } : undefined;
  return (
    <PageShell>
      <Suspense fallback={<ToolSkeleton />}>
        <LinkConverter example={example} />
      </Suspense>
    </PageShell>
  );
}
