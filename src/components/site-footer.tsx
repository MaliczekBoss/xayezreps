"use client";

import { ArrowUp, ArrowUpRight } from "lucide-react";
import type { DictKey } from "@/lib/dict";
import { site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";
import { CopyCode } from "./copy-code";
import { Logo } from "./logo";
import { btnGhost, btnPrimary } from "./ui";

type FooterLink = { label: DictKey; href: string; vars?: Record<string, string> };

export function SiteFooter() {
  const f = useFormat();
  const { t } = f;

  const columns: { title: DictKey; links: FooterLink[] }[] = [
    {
      title: "footer.browse",
      links: [
        { label: "footer.finds", href: site.routes.finds },
        { label: "footer.outfits", href: site.routes.outfits },
        { label: "footer.favorites", href: site.routes.favorites },
        { label: "sort.newest", href: `${site.routes.finds}?sort=newest` },
        { label: "sort.popular", href: `${site.routes.finds}?sort=popular` },
        { label: "footer.sellers", href: site.routes.sellers },
      ],
    },
    {
      title: "footer.tools",
      links: [
        { label: "tools.converter", href: site.routes.linkConverter },
        { label: "tools.tracking", href: site.routes.tracking },
        { label: "tools.qc", href: site.routes.qcFinder },
        { label: "tools.calc", href: site.routes.shipCalculator },
      ],
    },
    {
      title: "footer.help",
      links: [
        { label: "footer.howto", href: site.routes.tutorial },
        { label: "footer.contact", href: site.socials.discord },
        { label: "nav.discord", href: site.socials.discord },
        { label: "footer.signup", href: f.agent.signupUrl, vars: { agent: f.agent.name } },
      ],
    },
  ];

  return (
    <footer className="relative mt-24 overflow-hidden border-t border-line bg-[#0d0d0e]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="line-grid absolute inset-0 [mask-image:linear-gradient(to_top,#000_10%,transparent_70%)]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 border-b border-line py-14 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[34rem]">
            <h2 className="text-[clamp(2rem,4.2vw,3rem)] font-semibold leading-[1.05] tracking-[-0.035em]">
              {t("footer.join1")} <span className="fancy text-[1.1em] text-muted">{t("footer.join2")}</span>
            </h2>
            <p className="mt-3 text-muted">{t("footer.joinText")}</p>
          </div>
          <div className="flex flex-col gap-3 sm:items-start lg:items-end">
            <div className="flex flex-wrap gap-2.5">
              <a href={site.socials.discord} target="_blank" rel="noopener noreferrer" className={`${btnPrimary} h-11 px-5 text-sm`}>
                {t("footer.discord")}
                <ArrowUpRight aria-hidden size={15} />
                <span className="sr-only">{t("newTab")}</span>
              </a>
              <a href={site.routes.tutorial} className={`${btnGhost} h-11 px-5 text-sm`}>
                {t("footer.howto")}
              </a>
            </div>
            <CopyCode code={site.promo.code} label={t("footer.code", { agent: site.partner.name })} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-10 py-12 lg:grid-cols-[1.3fr_repeat(3,1fr)]">
          <div className="col-span-2 lg:col-span-1">
            <Logo />
            <p className="mt-4 max-w-[17rem] text-sm leading-relaxed text-muted">{t("footer.tagline")}</p>
            <p className="mt-5 inline-flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-1.5 text-xs text-muted">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-gl" />
              {t("footer.trust", { n: site.buyers })}
            </p>
          </div>
          {columns.map((col) => (
            <nav key={col.title} aria-label={t(col.title)}>
              <p className="text-sm font-semibold text-fg">{t(col.title)}</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                {col.links.map((l) => {
                  const external = l.href.startsWith("http");
                  return (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        className="group inline-flex items-center gap-1 text-muted transition-colors hover:text-fg"
                      >
                        {t(l.label, l.vars)}
                        {external && <ArrowUpRight aria-hidden size={13} className="opacity-0 transition-opacity group-hover:opacity-100" />}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ))}
        </div>

        <div className="flex flex-col gap-6 border-t border-line py-8 md:flex-row md:items-start md:justify-between">
          <p className="max-w-[46rem] text-xs leading-relaxed text-dim">{t("footer.legal")}</p>
          <div className="flex shrink-0 items-center gap-4 text-xs text-dim">
            <span>© 2026 xayezreps</span>
            <a
              href="#"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-card px-3.5 font-medium text-muted transition-colors hover:border-line-strong hover:text-fg"
            >
              <ArrowUp aria-hidden size={13} />
              {t("footer.top")}
            </a>
          </div>
        </div>
      </div>

      <div aria-hidden="true" className="relative -mt-4 select-none overflow-hidden sm:-mt-14">
        <p className="mx-auto max-w-7xl translate-y-[22%] whitespace-nowrap px-4 text-center text-[clamp(4.5rem,20vw,17.5rem)] leading-[0.85] tracking-[-0.06em] sm:px-6 lg:px-8">
          <span className="bg-[linear-gradient(180deg,rgb(255_255_255/0.2),rgb(255_255_255/0.02)_85%)] bg-clip-text text-transparent">
            <span className="fancy pr-[0.04em] text-[1.1em]">xayez</span>
            <span className="font-semibold">reps</span>
          </span>
        </p>
      </div>
    </footer>
  );
}
