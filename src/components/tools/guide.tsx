"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUpRight, Check, Copy, X } from "lucide-react";
import { sourceUrl, type ProductSource } from "@/lib/agents";
import { copyWithNotice } from "@/lib/clipboard";
import type { DictKey } from "@/lib/dict";
import { shippingCost, withPackaging } from "@/lib/haul";
import { pricing, site } from "@/lib/site";
import { useFormat, type Format } from "@/lib/use-format";
import { CopyCode } from "../copy-code";
import { PageHeader } from "../page";
import { ProductImage } from "../product-image";

export type GuideExample = {
  id: string;
  name: string;
  image: string;
  pricePln: number;
  weightGrams: number;
  qc: number;
  qcCover: string;
  source: ProductSource;
};

const TO_WAREHOUSE = { from: 3, to: 7 };

type Step = { title: DictKey; text: DictKey; tip?: DictKey; tool?: { href: string; label: DictKey } };

const STEPS: Step[] = [
  { title: "guide.s1t", text: "guide.s1" },
  { title: "guide.s2t", text: "guide.s2", tool: { href: site.routes.linkConverter, label: "tools.converter" } },
  { title: "guide.s3t", text: "guide.s3", tip: "guide.tip1" },
  { title: "guide.s4t", text: "guide.s4", tip: "guide.s4tip", tool: { href: site.routes.qcFinder, label: "tools.qc" } },
  { title: "guide.s5t", text: "guide.s5", tip: "guide.tip2", tool: { href: site.routes.shipCalculator, label: "tools.calc" } },
  { title: "guide.s6t", text: "guide.s6", tip: "guide.s6tip", tool: { href: site.routes.tracking, label: "tools.tracking" } },
];

const GLOSSARY: [DictKey, DictKey][] = [
  ["guide.g1t", "guide.g1"],
  ["guide.g2t", "guide.g2"],
  ["guide.g3t", "guide.g3"],
  ["guide.g4t", "guide.g4"],
  ["guide.g5t", "guide.g5"],
  ["guide.g6t", "guide.g6"],
  ["guide.g7t", "guide.g7"],
  ["guide.g8t", "guide.g8"],
];

export function Guide({ example }: { example: GuideExample | null }) {
  const f = useFormat();
  const { t } = f;
  const code = site.promo.code;
  const [active, setActive] = useState(0);
  const sections = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step));
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    sections.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scenes: ReactNode[] = [
    <SignupScene key="s1" f={f} />,
    example ? <LinkScene key="s2" f={f} example={example} /> : null,
    example ? <CartScene key="s3" f={f} example={example} /> : null,
    example ? <QcScene key="s4" f={f} example={example} /> : null,
    example ? <ShippingScene key="s5" f={f} example={example} /> : null,
    <TrackingScene key="s6" f={f} />,
  ];

  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-x-14 gap-y-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <PageHeader crumbs={[{ label: t("nav.guide") }]} title={[t("guide.title1"), t("guide.title2")]} lead={t("guide.lead")}>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a
              href={site.partner.signupUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-fg px-5 text-sm font-medium text-bg transition-colors hover:bg-white"
            >
              {t("guide.cta", { agent: site.partner.name })}
              <ArrowUpRight aria-hidden size={15} />
              <span className="sr-only">, {t("newTab")}</span>
            </a>
            <CopyCode code={code} label={t("guide.code")} />
          </div>
        </PageHeader>
        {example && (
          <div className="lg:mt-10">
            <Receipt f={f} example={example} />
          </div>
        )}
      </div>

      <div className="mt-14 grid grid-cols-[minmax(0,1fr)] gap-x-16 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <nav aria-label={t("guide.stepsNav")} className="hidden lg:block">
          <ol className="sticky top-28 space-y-1">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative">
                {i < STEPS.length - 1 && (
                  <span aria-hidden="true" className="absolute left-[15px] top-8 h-[calc(100%-1.25rem)] w-px bg-line">
                    <span className="block w-px bg-fg transition-[height] duration-500 ease-out" style={{ height: i < active ? "100%" : "0%" }} />
                  </span>
                )}
                <a
                  href={`#krok-${i + 1}`}
                  aria-current={i === active ? "step" : undefined}
                  className={`flex items-center gap-3 rounded-lg py-2 pr-2 text-sm transition-colors ${i === active ? "text-fg" : "text-muted hover:text-fg"}`}
                >
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-full border text-[13px] font-semibold tabular transition-colors ${
                      i < active ? "border-fg bg-fg text-bg" : i === active ? "border-fg text-fg" : "border-line-strong text-muted"
                    }`}
                  >
                    {i < active ? <Check aria-hidden size={14} strokeWidth={3} /> : i + 1}
                  </span>
                  <span className="font-medium">{t(s.title)}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <ol className="min-w-0">
          {STEPS.map((s, i) => (
            <li
              key={s.title}
              id={`krok-${i + 1}`}
              data-step={i}
              ref={(el) => {
                sections.current[i] = el;
              }}
              className="scroll-mt-28 border-t border-line py-10 first:border-t-0 first:pt-0 sm:py-12"
            >
              <div className="grid grid-cols-[minmax(0,1fr)] gap-8 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
                <div>
                  <p className="fancy text-[2.75rem] leading-none text-dim" aria-hidden="true">
                    {i + 1}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em]">{t(s.title)}</h2>
                  <p className="mt-3 max-w-[36rem] leading-relaxed text-muted">{t(s.text, { code })}</p>
                  {s.tip && (
                    <p className="mt-5 max-w-[36rem] border-l-2 border-line-strong pl-4 text-sm leading-relaxed text-muted">{t(s.tip)}</p>
                  )}
                  {s.tool && (
                    <Link
                      href={s.tool.href}
                      className="mt-5 inline-flex h-10 items-center gap-1.5 rounded-xl border border-line bg-card px-4 text-sm font-medium transition-colors hover:border-line-strong"
                    >
                      {t(s.tool.label)}
                      <ArrowUpRight aria-hidden size={14} className="text-muted" />
                    </Link>
                  )}
                </div>
                {scenes[i]}
              </div>
            </li>
          ))}
        </ol>
      </div>

      <section aria-labelledby="slowniczek" className="mt-16 border-t border-line pt-12">
        <h2 id="slowniczek" className="text-2xl font-semibold tracking-[-0.025em]">
          {t("guide.glossTitle")}
        </h2>
        <p className="mt-2 max-w-[36rem] text-muted">{t("guide.glossLead")}</p>
        <dl className="mt-8 grid gap-x-12 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
          {GLOSSARY.map(([term, text]) => (
            <div key={term}>
              <dt className="fancy text-[1.75rem] leading-none">{t(term)}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-muted">{t(text)}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-12 text-sm text-muted">
          {t("guide.help")}{" "}
          <a href={site.socials.discord} target="_blank" rel="noopener noreferrer" className="font-semibold text-fg underline decoration-line-strong underline-offset-4 hover:decoration-fg">
            Discord
          </a>
        </p>
      </section>
    </>
  );
}

function Receipt({ f, example }: { f: Format; example: GuideExample }) {
  const { t } = f;
  const line = pricing.lines[0];
  const grams = withPackaging(example.weightGrams);
  const ship = shippingCost(grams, line.id);
  const total = example.pricePln + pricing.domesticPlnPerItem + ship;
  const rows: [string, number][] = [
    [t("guide.rItem"), example.pricePln],
    [t("guide.rDomestic"), pricing.domesticPlnPerItem],
    [t("guide.rShip", { line: line.name, weight: f.weight(grams) }), ship],
  ];
  return (
    <aside aria-labelledby="paragon" className="relative rounded-2xl border border-line bg-card p-5 pb-6">
      <div className="flex items-center gap-4">
        <span className="relative size-20 shrink-0">
          <ProductImage src={example.image} sizes="5rem" />
        </span>
        <div className="min-w-0">
          <h2 id="paragon" className="font-semibold">
            {t("guide.rTitle")}
          </h2>
          <Link href={site.routes.product(example.id)} className="mt-0.5 line-clamp-2 text-sm text-muted underline-offset-4 hover:text-fg hover:underline">
            {example.name}
          </Link>
        </div>
      </div>
      <dl className="mt-5 space-y-2.5 border-t border-dashed border-line-strong pt-4 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4">
            <dt className="text-muted">{label}</dt>
            <dd className="shrink-0 font-mono tabular">{f.money(value)}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-dashed border-line-strong pt-4">
        <span className="font-semibold">{t("guide.rTotal")}</span>
        <span className="font-mono text-2xl font-semibold tabular">{f.money(total)}</span>
      </div>
      <p className="mt-2 text-sm text-muted">{t("guide.rTime", { from: TO_WAREHOUSE.from + line.days.from, to: TO_WAREHOUSE.to + line.days.to })}</p>
      <p className="mt-4 rounded-lg bg-bg px-3 py-2 text-[13px] text-muted">{t("guide.rCoupon", { code: site.promo.code, coupon: site.promo.coupon })}</p>
    </aside>
  );
}

const scene = "rounded-2xl border border-line bg-card p-4";
const fakeField = "flex h-10 items-center rounded-lg border border-line bg-bg px-3 text-sm";

function SignupScene({ f }: { f: Format }) {
  const { t } = f;
  const code = site.promo.code;
  return (
    <div className={scene} aria-hidden="true">
      <Image src="/agents/usfans-wordmark.png" alt="" width={221} height={46} className="h-4 w-auto" />
      <p className="mt-4 text-xs text-muted">{t("guide.mEmail")}</p>
      <div className={`${fakeField} mt-1.5 text-dim`}>ty@mail.pl</div>
      <p className="mt-3 text-xs text-muted">{t("guide.mCode")}</p>
      <div className={`${fakeField} mt-1.5 justify-between border-fg/40`}>
        <span className="font-mono font-semibold">{code}</span>
        <Check size={15} strokeWidth={3} className="text-gl" />
      </div>
      <div className="mt-4 grid h-10 place-items-center rounded-lg bg-fg text-sm font-medium text-bg">{t("guide.mSignup")}</div>
    </div>
  );
}

function LinkScene({ f, example }: { f: Format; example: GuideExample }) {
  const { t } = f;
  const from = sourceUrl(example.source);
  const to = f.buyUrl(example.source);
  const short = (u: string) => u.replace(/^https?:\/\/(www\.)?/, "");
  return (
    <div className={scene}>
      <p className="text-xs text-muted">{t("guide.mFrom")}</p>
      <p className="mt-1.5 truncate rounded-lg border border-line bg-bg px-3 py-2.5 font-mono text-[12.5px] text-muted">{short(from)}</p>
      <ArrowDown aria-hidden size={16} className="mx-auto my-2 text-dim" />
      <p className="text-xs text-muted">{t("guide.mTo", { agent: f.agent.name })}</p>
      <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-fg/40 bg-bg py-1.5 pl-3 pr-1.5">
        <span className="min-w-0 flex-1 truncate font-mono text-[12.5px]">{short(to)}</span>
        <button
          type="button"
          onClick={() => copyWithNotice(to, { title: t("n.copiedLink"), text: to, image: f.agent.logo })}
          className="grid size-8 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-card hover:text-fg"
        >
          <Copy aria-hidden size={14} />
          <span className="sr-only">{t("search.copy")}</span>
        </button>
      </div>
    </div>
  );
}

function CartScene({ f, example }: { f: Format; example: GuideExample }) {
  const { t } = f;
  const sizes = ["40", "41", "42", "43", "44"];
  return (
    <div className={scene} aria-hidden="true">
      <div className="flex gap-3">
        <span className="relative size-20 shrink-0">
          <ProductImage src={example.image} sizes="5rem" />
        </span>
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-medium">{example.name}</p>
          <p className="mt-1 font-mono text-sm">¥{Math.round(example.pricePln * f.rates.CNY)}</p>
        </div>
      </div>
      <p className="mt-4 text-xs text-muted">{t("guide.mSize")}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {sizes.map((s) => (
          <span key={s} className={`grid h-8 min-w-10 place-items-center rounded-md border px-2 font-mono text-[13px] ${s === "42" ? "border-fg text-fg" : "border-line text-muted"}`}>
            {s}
          </span>
        ))}
      </div>
      <div className="mt-4 grid h-10 place-items-center rounded-lg bg-fg text-sm font-medium text-bg">{t("guide.mAdd")}</div>
    </div>
  );
}

function QcScene({ f, example }: { f: Format; example: GuideExample }) {
  const { t } = f;
  const [photos, setPhotos] = useState<string[]>([example.qcCover]);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/qc?url=${encodeURIComponent(sourceUrl(example.source))}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { photos?: string[] }) => d.photos?.length && setPhotos(d.photos.slice(0, 4)))
      .catch(() => {});
    return () => ctrl.abort();
  }, [example.source]);

  return (
    <div className={scene}>
      <p className="text-xs text-muted">{t("guide.mQc", { n: example.qc })}</p>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {photos.map((src) => (
          <span key={src} className="relative aspect-square overflow-hidden rounded-lg bg-bg">
            <ProductImage src={src} sizes="11rem" />
          </span>
        ))}
      </div>
      <div aria-hidden="true" className="mt-3 grid grid-cols-2 gap-1.5 text-[13px] font-medium">
        <span className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-gl/15 text-emerald-300">
          <Check size={14} strokeWidth={3} />
          {t("guide.mGl")}
        </span>
        <span className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-red-500/10 text-red-300">
          <X size={14} strokeWidth={3} />
          {t("guide.mRl")}
        </span>
      </div>
    </div>
  );
}

function ShippingScene({ f, example }: { f: Format; example: GuideExample }) {
  const { t } = f;
  const grams = withPackaging(example.weightGrams);
  return (
    <div className={scene}>
      <p className="text-xs text-muted">{t("guide.mLines", { weight: f.weight(grams) })}</p>
      <ul className="mt-2 divide-y divide-line">
        {pricing.lines.map((line) => (
          <li key={line.id} className="flex items-center justify-between gap-3 py-3">
            <span>
              <span className="block text-sm font-medium">{line.name}</span>
              <span className="block text-xs text-muted">{f.days(line.days)}</span>
            </span>
            <span className="font-mono text-sm tabular">{f.money(shippingCost(grams, line.id))}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TrackingScene({ f }: { f: Format }) {
  const { t } = f;
  const events: [DictKey, number][] = [
    ["guide.t1", 0],
    ["guide.t2", 3],
    ["guide.t3", 8],
    ["guide.t4", 14],
  ];
  return (
    <div className={scene} aria-hidden="true">
      <ol>
        {events.map(([label, day], i) => (
          <li key={label} className="relative flex gap-3 pb-4 last:pb-0">
            {i < events.length - 1 && <span className="absolute left-[5px] top-4 h-full w-px bg-line-strong" />}
            <span className={`relative mt-1.5 size-[11px] shrink-0 rounded-full border-2 ${i === events.length - 1 ? "border-gl bg-gl" : "border-line-strong bg-card"}`} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm">{t(label)}</span>
              <span className="block text-xs text-muted">{t("guide.tDay", { n: day })}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
