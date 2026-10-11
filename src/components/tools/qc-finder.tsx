"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Camera } from "lucide-react";
import { parseSource, platformLabel, sourceUrl, type ProductSource } from "@/lib/agents";
import { cnyToPln } from "@/lib/money";
import { site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";
import { PageHeader } from "../page";
import { QcGallery } from "../qc-gallery";
import { LinkForm } from "./link-form";

type Item = {
  title: string;
  priceCny: number;
  domesticShipCny: number;
  images: string[];
  seller: string | null;
  priceRangeCny: [number, number];
};

type State = { status: "idle" | "loading" | "missing" } | { status: "ready"; item: Item };

export function QcFinder() {
  const f = useFormat();
  const { t } = f;
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const url = params.get("url") ?? "";
  const source = url ? parseSource(url) : null;
  const key = source ? `${source.platform}:${source.id}` : "";

  return (
    <>
      <PageHeader crumbs={[{ label: t("nav.tools"), href: site.routes.tools }, { label: t("tools.qc") }]} title={[t("qcf.title1"), t("qcf.title2")]} lead={t("qcf.lead")} />

      <LinkForm
        key={url}
        id="qc-url"
        label={t("qcf.placeholder")}
        placeholder={t("qcf.placeholder")}
        submitLabel={t("qcf.search")}
        defaultValue={url}
        icon={<Camera aria-hidden size={18} />}
        validate={(v) => (parseSource(v) ? null : t("conv.invalid"))}
        onSubmit={(v) => router.replace(`${pathname}?url=${encodeURIComponent(v)}`, { scroll: false })}
      />

      {url && !source && <p className="mt-4 pl-4 text-sm text-amber-300">{t("conv.invalid")}</p>}
      {!url && <p className="mt-8 max-w-[40rem] text-muted">{t("qcf.empty")}</p>}

      {source && <QcResult key={key} source={source} f={f} />}
    </>
  );
}

function QcResult({ source, f }: { source: ProductSource; f: ReturnType<typeof useFormat> }) {
  const { t } = f;
  const [state, setState] = useState<State>({ status: "loading" });
  const link = sourceUrl(source);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/item?url=${encodeURIComponent(link)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setState(d?.item ? { status: "ready", item: d.item } : { status: "missing" }))
      .catch((e: unknown) => {
        if ((e as Error).name !== "AbortError") setState({ status: "missing" });
      });
    return () => ctrl.abort();
  }, [link]);

  const item = state.status === "ready" ? state.item : null;
  const [low, high] = item?.priceRangeCny ?? [0, 0];
  const yuan = item ? (low === high ? `¥${low}` : `¥${low}–${high}`) : "";

  return (
    <div className="mt-10">
      {state.status === "loading" && (
        <div aria-hidden="true" className="flex animate-pulse items-center gap-4 border-y border-line py-5">
          <div className="size-20 rounded-xl bg-card" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/3 rounded bg-card" />
            <div className="h-4 w-1/3 rounded bg-card" />
          </div>
        </div>
      )}

      {item && (
        <div className="flex flex-col gap-5 border-y border-line py-5 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            {item.images[0] && (
              <span className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-card">
                <Image src={item.images[0]} alt="" fill sizes="5rem" unoptimized className="object-cover" />
              </span>
            )}
            <div className="min-w-0">
              <p className="line-clamp-2 font-semibold">{item.title}</p>
              <p className="mt-1 text-sm text-muted">
                {platformLabel[source.platform]}
                {item.seller && ` / ${item.seller}`}
              </p>
            </div>
          </div>
          <dl className="flex shrink-0 gap-8 text-sm">
            <div>
              <dt className="text-muted">{t("qcf.price")}</dt>
              <dd className="mt-0.5 font-semibold tabular">
                {yuan} <span className="font-normal text-muted">≈ {f.money(cnyToPln(low, f.rates))}</span>
              </dd>
            </div>
            {item.domesticShipCny > 0 && (
              <div>
                <dt className="text-muted">{t("qcf.domestic")}</dt>
                <dd className="mt-0.5 font-semibold tabular">¥{item.domesticShipCny}</dd>
              </div>
            )}
          </dl>
          <a
            href={f.buyUrl(source)}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-bright"
          >
            {t("card.buy", { agent: f.agent.name })}
            <span className="sr-only">{t("newTab")}</span>
          </a>
        </div>
      )}

      {state.status === "missing" && <p className="border-y border-line py-5 text-sm text-muted">{t("qcf.noItem")}</p>}

      <section aria-labelledby="qcf-photos" className="mt-12">
        <QcGallery productUrl={link} titleId="qcf-photos" />
      </section>
    </div>
  );
}
