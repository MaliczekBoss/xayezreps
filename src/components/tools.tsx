"use client";

import { ArrowUpRight, BookOpen, Calculator, Camera, ImageUp, Link2, Store, Truck, type LucideIcon } from "lucide-react";
import type { DictKey } from "@/lib/dict";
import { site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";
import { SectionTitle } from "./ui";

export const tools: { icon: LucideIcon; title: DictKey; text: DictKey; href: string }[] = [
  { icon: ImageUp, title: "tools.photo", text: "tools.photoText", href: site.routes.photoSearch },
  { icon: Link2, title: "tools.converter", text: "tools.converterText", href: site.routes.linkConverter },
  { icon: Truck, title: "tools.tracking", text: "tools.trackingText", href: site.routes.tracking },
  { icon: Camera, title: "tools.qc", text: "tools.qcText", href: site.routes.qcFinder },
  { icon: Store, title: "tools.sellers", text: "tools.sellersText", href: site.routes.sellers },
  { icon: Calculator, title: "tools.calc", text: "tools.calcText", href: site.routes.shipCalculator },
  { icon: BookOpen, title: "tools.guide", text: "tools.guideText", href: site.routes.tutorial },
];

export function Tools() {
  const { t } = useFormat();

  return (
    <section id="narzedzia" aria-labelledby="narzedzia-title" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <SectionTitle id="narzedzia-title" title={[t("tools.title1"), t("tools.title2")]} href={site.routes.tools} linkLabel={t("rows.seeAll")} />
      <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tools.map((tool, i) => {
          const Icon = tool.icon;
          return (
            <li key={tool.title} className={i === 0 ? "sm:col-span-2" : ""}>
              <a href={tool.href} className="group flex h-full items-start gap-4 rounded-xl border border-line bg-card p-4 transition-colors hover:border-line-strong">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-line bg-bg text-fg">
                  <Icon aria-hidden size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{t(tool.title)}</span>
                  <span className="mt-0.5 block text-sm text-muted">{t(tool.text)}</span>
                </span>
                <ArrowUpRight aria-hidden size={16} className="mt-0.5 shrink-0 text-dim transition-colors group-hover:text-fg" />
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
