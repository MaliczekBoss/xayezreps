import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-fg font-medium text-bg transition-colors hover:bg-white";

export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-card font-medium text-fg transition-colors hover:border-line-strong hover:bg-card-hover";

type SectionTitleProps = {
  id: string;
  /** Pierwsza część zwykłym krojem, druga szeryfową kursywą */
  title: [string, string];
  count?: number;
  href?: string;
  linkLabel?: string;
  children?: ReactNode;
};

/** Nagłówek rzędu: tytuł po lewej, „Zobacz wszystkie →” po prawej */
export function SectionTitle({ id, title, count, href, linkLabel, children }: SectionTitleProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div>
        <h2 id={id} className="text-xl font-semibold tracking-[-0.02em]">
          {title[0]} {title[1]}
          {count !== undefined && <span className="ml-1.5 text-base font-normal text-muted tabular">({count})</span>}
        </h2>
        {children}
      </div>
      {href && (
        <a href={href} className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-fg/70 transition-colors hover:text-fg">
          {linkLabel}
          <ArrowRight aria-hidden size={14} className="transition-transform group-hover:translate-x-0.5" />
        </a>
      )}
    </div>
  );
}
