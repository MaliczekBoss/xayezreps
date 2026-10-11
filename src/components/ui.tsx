import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-full bg-brand font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25)] transition-colors hover:bg-brand-bright";

export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-full border border-line bg-card font-medium text-fg transition-colors hover:border-line-strong hover:bg-card-hover";

type SectionTitleProps = {
  id: string;
  /** Pierwsza część zwykłym krojem, druga szeryfową kursywą */
  title: [string, string];
  count?: number;
  href?: string;
  linkLabel?: string;
  children?: ReactNode;
};

/** Nagłówek rzędu: tytuł z licznikiem po lewej, przycisk „Zobacz wszystkie” po prawej */
export function SectionTitle({ id, title, count, href, linkLabel, children }: SectionTitleProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div>
        <h2 id={id} className="flex items-center gap-3 text-[1.625rem] font-semibold tracking-[-0.025em] sm:text-[1.875rem]">
          <span>
            {title[0]} <span className="fancy text-[1.12em] text-brand-bright">{title[1]}</span>
          </span>
          {count !== undefined && (
            <span className="rounded-full border border-line bg-card px-2.5 py-0.5 font-mono text-xs font-medium text-muted tabular">
              {count}
            </span>
          )}
        </h2>
        {children}
      </div>
      {href && (
        <a href={href} className={`${btnGhost} h-9 px-4 text-[0.8125rem]`}>
          {linkLabel}
          <ArrowRight aria-hidden size={14} />
        </a>
      )}
    </div>
  );
}
