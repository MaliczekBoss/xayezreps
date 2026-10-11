"use client";

import Link from "next/link";
import { useFormat } from "@/lib/use-format";
import { PageHeader } from "../page";
import { tools } from "../tools";

export function ToolsIndex() {
  const { t } = useFormat();

  return (
    <>
      <PageHeader crumbs={[{ label: t("nav.tools") }]} title={[t("tools.title1"), t("tools.title2")]} lead={t("tools.lead")} />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <li key={tool.href}>
              <Link href={tool.href} className="group flex h-full flex-col rounded-xl border border-line bg-card p-5 transition-colors hover:border-line-strong">
                <span className="grid size-10 place-items-center rounded-lg border border-line bg-bg">
                  <Icon aria-hidden size={18} />
                </span>
                <span className="mt-6 text-lg font-semibold tracking-[-0.01em]">{t(tool.title)}</span>
                <span className="mt-1 text-sm leading-relaxed text-muted">{t(tool.text)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
