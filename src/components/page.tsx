"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { useFormat } from "@/lib/use-format";

type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const { t } = useFormat();
  const all: Crumb[] = [{ label: t("page.home"), href: "/" }, ...items];
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {all.map((c, i) => (
          <li key={i} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && <ChevronRight aria-hidden size={14} className="shrink-0 text-dim" />}
            {c.href && i < all.length - 1 ? (
              <Link href={c.href} className="hover:text-fg">
                {c.label}
              </Link>
            ) : (
              <span aria-current="page" className="max-w-[16rem] truncate text-fg sm:max-w-[28rem]">
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

type PageHeaderProps = {
  crumbs: Crumb[];
  title: [string, string];
  lead?: ReactNode;
  children?: ReactNode;
};

export function PageHeader({ crumbs, title, lead, children }: PageHeaderProps) {
  return (
    <header className="pb-8">
      <Breadcrumbs items={crumbs} />
      <h1 className="mt-6 text-[clamp(2.25rem,5vw,3.5rem)] font-semibold leading-[1.02] tracking-[-0.035em]">
        {title[0]} <span className="fancy text-[1.1em] text-muted">{title[1]}</span>
      </h1>
      {lead && <p className="mt-4 max-w-[38rem] text-[1.0625rem] leading-relaxed text-muted">{lead}</p>}
      {children}
    </header>
  );
}
