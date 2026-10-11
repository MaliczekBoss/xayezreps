"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Camera, Copy, Link2 } from "lucide-react";
import { agents, parseSource, platformLabel, sourceUrl } from "@/lib/agents";
import { copyWithNotice } from "@/lib/clipboard";
import { site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";
import { PageHeader } from "../page";
import { LinkForm } from "./link-form";

const action =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-card px-3.5 text-[0.8125rem] font-medium text-fg transition-colors hover:border-line-strong";

export function LinkConverter() {
  const { t, agent } = useFormat();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const url = params.get("url") ?? "";
  const source = url ? parseSource(url) : null;

  // Wybrany agent na górze listy
  const ordered = [...agents].sort((a, b) => Number(b.id === agent.id) - Number(a.id === agent.id));

  const copy = (link: string, name: string) => copyWithNotice(link, { title: t("conv.copied", { agent: name }), text: t("conv.copiedText") });

  return (
    <>
      <PageHeader crumbs={[{ label: t("nav.tools"), href: site.routes.tools }, { label: t("tools.converter") }]} title={[t("conv.title1"), t("conv.title2")]} lead={t("conv.lead")} />

      <LinkForm
        key={url}
        id="conv-url"
        label={t("conv.placeholder")}
        placeholder={t("conv.placeholder")}
        submitLabel={t("conv.submit")}
        defaultValue={url}
        icon={<Link2 aria-hidden size={18} />}
        validate={(v) => (parseSource(v) ? null : t("conv.invalid"))}
        onSubmit={(v) => router.replace(`${pathname}?url=${encodeURIComponent(v)}`, { scroll: false })}
      />

      {url && !source && <p className="mt-4 pl-4 text-sm text-amber-300">{t("conv.invalid")}</p>}

      {!source ? (
        !url && <p className="mt-8 text-muted">{t("conv.empty")}</p>
      ) : (
        <div className="mt-10">
          <p className="text-sm text-muted">{t("conv.detected", { platform: platformLabel[source.platform], id: source.id })}</p>

          <ul className="mt-4 divide-y divide-line border-y border-line">
            {ordered.map((a) => {
              const link = a.productUrl(source);
              return (
                <li key={a.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:gap-5">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="relative size-10 shrink-0 overflow-hidden rounded-lg border border-line bg-bg">
                      <Image src={a.logo} alt="" fill sizes="2.5rem" className="object-contain p-1" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {a.name}
                        {a.id === agent.id && <span className="ml-2 rounded-[5px] bg-gl px-[7px] py-[3px] text-[10px] font-bold text-white">{t("conv.default")}</span>}
                      </p>
                      <p className="truncate text-sm text-dim">{link.replace(/^https:\/\/(www\.)?/, "")}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2 pl-[3.25rem] sm:pl-0">
                    <button type="button" onClick={() => copy(link, a.name)} className={action}>
                      <Copy aria-hidden size={14} />
                      {t("conv.copy")}
                    </button>
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      className={`${action} ${a.id === agent.id ? "border-fg bg-fg text-bg hover:bg-white" : ""}`}
                    >
                      {t("conv.open")}
                      <span className="sr-only">
                        {a.name}, {t("newTab")}
                      </span>
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm">
            <a href={sourceUrl(source)} target="_blank" rel="noopener noreferrer" className="text-muted underline decoration-line-strong underline-offset-4 hover:text-fg">
              {t("conv.original")} ({platformLabel[source.platform]})
            </a>
            <Link
              href={`${site.routes.qcFinder}?url=${encodeURIComponent(sourceUrl(source))}`}
              className="inline-flex items-center gap-1.5 text-fg underline decoration-line-strong underline-offset-4 hover:decoration-fg"
            >
              <Camera aria-hidden size={15} />
              {t("conv.qc")}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
