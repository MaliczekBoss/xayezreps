"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Truck } from "lucide-react";
import { pricing, site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";
import { PageHeader } from "../page";
import { LinkForm } from "./link-form";

const NUMBER = /^[A-Z0-9-]{8,40}$/;

type Carrier = { name: string; url: (n: string) => string };

// Najczęstsi przewoźnicy paczek z Chin do Polski, rozpoznawani po formacie numeru
const CARRIERS: { test: RegExp; carrier: Carrier }[] = [
  { test: /^[A-Z]{2}\d{9}PL$/, carrier: { name: "Poczta Polska", url: (n) => `https://emonitoring.poczta-polska.pl/?numer=${n}` } },
  { test: /^\d{24}$/, carrier: { name: "InPost", url: (n) => `https://inpost.pl/sledzenie-przesylek?number=${n}` } },
  { test: /^1Z[0-9A-Z]{16}$/, carrier: { name: "UPS", url: (n) => `https://www.ups.com/track?loc=pl_PL&tracknum=${n}` } },
  { test: /^(JJD\d{10,}|JVGL\d{8,}|\d{10})$/, carrier: { name: "DHL", url: (n) => `https://www.dhl.com/pl-pl/home/sledzenie.html?tracking-id=${n}` } },
  { test: /^\d{13}[A-Z]$/, carrier: { name: "DPD", url: (n) => `https://tracktrace.dpd.com.pl/parcelDetails?p1=${n}` } },
  { test: /^YT\d{16}$/, carrier: { name: "YunExpress", url: (n) => `https://www.yuntrack.com/parcelTracking?id=${n}` } },
  { test: /^[A-Z]{2}\d{9}CN$/, carrier: { name: "China Post", url: (n) => `https://t.17track.net/pl#nums=${n}` } },
];

const detectCarrier = (n: string) => CARRIERS.find((c) => c.test.test(n))?.carrier ?? null;

const EXTERNAL: Carrier[] = [
  { name: "17TRACK", url: (n) => `https://t.17track.net/pl#nums=${n}` },
  { name: "Parcelsapp", url: (n) => `https://parcelsapp.com/pl/tracking/${n}` },
];

export function Tracker() {
  const { t } = useFormat();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const number = (params.get("number") ?? "").trim().toUpperCase();
  const valid = NUMBER.test(number);

  return (
    <>
      <PageHeader crumbs={[{ label: t("nav.tools"), href: site.routes.tools }, { label: t("tools.tracking") }]} title={[t("trk.title1"), t("trk.title2")]} lead={t("trk.lead")} />

      <LinkForm
        key={`form-${number}`}
        id="trk-number"
        label={t("trk.label")}
        placeholder={t("trk.placeholder")}
        submitLabel={t("trk.submit")}
        defaultValue={number}
        inputMode="text"
        icon={<Truck aria-hidden size={18} />}
        validate={(v) => (NUMBER.test(v.replace(/\s+/g, "").toUpperCase()) ? null : t("trk.invalid"))}
        onSubmit={(v) => router.replace(`${pathname}?number=${encodeURIComponent(v.replace(/\s+/g, "").toUpperCase())}`, { scroll: false })}
      />

      {number && !valid && <p className="mt-4 pl-4 text-sm text-amber-300">{t("trk.invalid")}</p>}
      {valid && <TrackResult key={number} number={number} />}
      {!number && <TrackingGuide />}
    </>
  );
}

/**
 * Wynik dla numeru: rozpoznany przewoźnik i linki do śledzenia u niego, w 17TRACK i Parcelsapp.
 * Historii przesyłki nie pobieramy – dawało ją tylko API starej strony, które już nie działa.
 */
function TrackResult({ number }: { number: string }) {
  const { t } = useFormat();
  const carrier = detectCarrier(number);
  const links = [...(carrier ? [carrier] : []), ...EXTERNAL];

  return (
    <div className="mt-10">
      <dl className="grid grid-cols-2 gap-6 border-y border-line py-5 text-sm sm:flex sm:gap-12">
        <div className="min-w-0">
          <dt className="text-muted">{t("trk.number")}</dt>
          <dd className="mt-0.5 truncate font-semibold tabular">{number}</dd>
        </div>
        <div>
          <dt className="text-muted">{t("trk.carrier")}</dt>
          <dd className="mt-0.5 font-semibold">{carrier?.name ?? t("trk.unknownCarrier")}</dd>
        </div>
      </dl>

      <div className="mt-8">
        <p className="max-w-[40rem] text-muted">{t("trk.noData")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {links.map((l, i) => (
            <a
              key={l.name}
              href={l.url(encodeURIComponent(number))}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium transition-colors ${
                i === 0 ? "bg-fg text-bg hover:bg-white" : "border border-line bg-card text-fg hover:border-line-strong"
              }`}
            >
              {l.name}
              <span className="sr-only">, {t("newTab")}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// Przykładowe formaty numerów, które rozpoznajemy (do tabeli pod polem)
const FORMATS: [string, string][] = [
  ["China Post", "LP123456789CN"],
  ["Poczta Polska", "RR123456789PL"],
  ["InPost", "24 cyfry"],
  ["DPD", "1234567890123U"],
  ["DHL", "JJD… albo 10 cyfr"],
  ["UPS", "1Z…"],
  ["YunExpress", "YT1234567890123456"],
];

/** Pusty stan: jak wygląda droga paczki i jakie numery rozpoznajemy */
function TrackingGuide() {
  const f = useFormat();
  const { t } = f;
  const steps: [string, string][] = [
    [t("trk.s1t"), t("trk.s1")],
    [t("trk.s2t"), t("trk.s2")],
    [t("trk.s3t"), t("trk.s3")],
    [t("trk.s4t"), t("trk.s4")],
  ];
  return (
    <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_21rem]">
      <section aria-labelledby="trk-route">
        <h2 id="trk-route" className="text-lg font-semibold">
          {t("trk.routeTitle")}
        </h2>
        <ol className="mt-5">
          {steps.map(([title, text], i) => (
            <li key={title} className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-x-4 pb-7 last:pb-0">
              {i < steps.length - 1 && <span aria-hidden="true" className="absolute left-4 top-8 h-[calc(100%-2rem)] w-px -translate-x-1/2 bg-line-strong" />}
              <span className="relative grid size-8 place-items-center rounded-full border border-line-strong bg-card text-sm font-semibold tabular">{i + 1}</span>
              <div className="pt-1">
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 max-w-[36rem] text-sm leading-relaxed text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ol>
        <h3 className="mt-8 text-sm font-semibold">{t("trk.linesTitle")}</h3>
        <ul className="mt-3 max-w-md divide-y divide-line border-y border-line text-sm">
          {pricing.lines.map((line) => (
            <li key={line.id} className="flex justify-between gap-4 py-2.5">
              <span>{line.name}</span>
              <span className="text-muted tabular">{f.days(line.days)}</span>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="trk-formats">
        <h2 id="trk-formats" className="text-sm font-semibold">
          {t("trk.formatsTitle")}
        </h2>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th scope="col" className="py-2 font-medium">
                {t("trk.carrier")}
              </th>
              <th scope="col" className="py-2 font-medium">
                {t("trk.formatCol")}
              </th>
            </tr>
          </thead>
          <tbody>
            {FORMATS.map(([carrier, format]) => (
              <tr key={carrier} className="border-b border-line/70">
                <td className="py-2 pr-3">{carrier}</td>
                <td className="py-2 font-mono text-[12.5px] text-muted">{format}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
