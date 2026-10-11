"use client";

import Link from "next/link";
import type { DictKey } from "@/lib/dict";
import { site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";
import { CopyCode } from "../copy-code";
import { PageHeader } from "../page";

// Kroki są kolejnością zamawiania, więc mają numery; każdy prowadzi do narzędzia, które w nim pomaga
const steps: { title: DictKey; text: DictKey; link?: { href: string; label: DictKey } }[] = [
  { title: "guide.s1t", text: "guide.s1" },
  { title: "guide.s2t", text: "guide.s2", link: { href: site.routes.linkConverter, label: "tools.converter" } },
  { title: "guide.s3t", text: "guide.s3" },
  { title: "guide.s4t", text: "guide.s4", link: { href: site.routes.qcFinder, label: "tools.qc" } },
  { title: "guide.s5t", text: "guide.s5", link: { href: site.routes.shipCalculator, label: "tools.calc" } },
  { title: "guide.s6t", text: "guide.s6", link: { href: site.routes.tracking, label: "tools.tracking" } },
];

const tips: DictKey[] = ["guide.tip1", "guide.tip2", "guide.tip3"];

export function Guide() {
  const { t } = useFormat();
  const code = site.promo.code;

  return (
    <>
      <PageHeader crumbs={[{ label: t("nav.guide") }]} title={[t("guide.title1"), t("guide.title2")]} lead={t("guide.lead")} />

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
        <ol className="border-t border-line">
          {steps.map((s, i) => (
            <li key={s.title} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 border-b border-line py-7 sm:grid-cols-[4rem_minmax(0,1fr)]">
              <span aria-hidden="true" className="fancy text-[2.5rem] leading-none text-muted sm:text-[3rem]">
                {i + 1}
              </span>
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.02em]">{t(s.title)}</h2>
                <p className="mt-2 max-w-[38rem] leading-relaxed text-muted">{t(s.text, { code })}</p>
                {i === 0 && (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <a
                      href={site.partner.signupUrl}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      className="inline-flex h-11 items-center rounded-xl bg-fg px-5 text-sm font-medium text-bg hover:bg-white"
                    >
                      {t("guide.cta", { agent: site.partner.name })}
                      <span className="sr-only">, {t("newTab")}</span>
                    </a>
                    <CopyCode code={code} label={t("guide.code")} />
                  </div>
                )}
                {s.link && (
                  <Link href={s.link.href} className="mt-3 inline-block text-sm font-medium text-fg underline decoration-line-strong underline-offset-4 hover:decoration-fg">
                    {t(s.link.label)}
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ol>

        <aside aria-labelledby="guide-tips" className="lg:sticky lg:top-28 lg:self-start">
          <h2 id="guide-tips" className="text-lg font-semibold">
            {t("guide.tipsTitle")}
          </h2>
          <ul className="mt-4 space-y-4 border-t border-line pt-4">
            {tips.map((tip) => (
              <li key={tip} className="text-sm leading-relaxed text-muted">
                {t(tip)}
              </li>
            ))}
          </ul>
          <p className="mt-6 border-t border-line pt-4 text-sm text-muted">
            {t("guide.help")}{" "}
            <a href={site.socials.discord} target="_blank" rel="noopener noreferrer" className="font-semibold text-fg underline decoration-line-strong underline-offset-4 hover:decoration-fg">
              Discord
            </a>
          </p>
        </aside>
      </div>
    </>
  );
}
