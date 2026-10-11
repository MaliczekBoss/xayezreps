"use client";

import { ArrowUpRight, BookOpen, Calculator, Camera, Link2, Store, Truck, type LucideIcon } from "lucide-react";
import type { DictKey } from "@/lib/dict";
import { site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";
import { SectionTitle } from "./ui";

export const tools: { icon: LucideIcon; title: DictKey; text: DictKey; href: string }[] = [
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
    <section id="narzedzia" aria-labelledby="narzedzia-title" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <SectionTitle id="narzedzia-title" title={[t("tools.title1"), t("tools.title2")]} href={site.routes.tools} linkLabel={t("rows.seeAll")} />
      <ul className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-2">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <li key={tool.title} className="bg-card">
              <a href={tool.href} className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-card-hover sm:py-5">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand/12 text-brand-bright ring-1 ring-brand/25">
                  <Icon aria-hidden size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{t(tool.title)}</span>
                  <span className="mt-0.5 block text-sm text-muted">{t(tool.text)}</span>
                </span>
                <ArrowUpRight
                  aria-hidden
                  size={18}
                  className="shrink-0 text-dim transition-[color,transform] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg"
                />
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
