"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Truck } from "lucide-react";
import { site } from "@/lib/site";
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

type TrackEvent = { time: string | null; text: string; place: string | null };

const TEXT_KEYS = ["description", "desc", "status", "event", "message", "info", "details", "context", "statusdescription", "checkpoint_status"];
const TIME_KEYS = ["time", "date", "datetime", "timestamp", "time_iso", "eventtime", "checkpoint_time", "created_at"];
const PLACE_KEYS = ["location", "place", "city", "address", "country"];

function pick(obj: Record<string, unknown>, keys: string[]) {
  for (const [k, v] of Object.entries(obj)) {
    if (keys.includes(k.toLowerCase()) && (typeof v === "string" || typeof v === "number") && String(v).trim()) return String(v).trim();
  }
  return null;
}

/** Odpowiedź API śledzenia nie ma stałego formatu: szukamy pierwszej listy zdarzeń z opisem */
function findEvents(data: unknown): TrackEvent[] {
  const queue: unknown[] = [data];
  for (let guard = 0; queue.length && guard < 300; guard++) {
    const v = queue.shift();
    if (Array.isArray(v)) {
      const objects = v.filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === "object" && !Array.isArray(x));
      const events = objects
        .map((o) => ({ text: pick(o, TEXT_KEYS), time: pick(o, TIME_KEYS), place: pick(o, PLACE_KEYS) }))
        .filter((e): e is TrackEvent => Boolean(e.text));
      if (events.length) return events;
      queue.push(...v);
    } else if (v && typeof v === "object") {
      queue.push(...Object.values(v));
    }
  }
  return [];
}

type State = { status: "loading" } | { status: "done"; events: TrackEvent[] };

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
    </>
  );
}

function TrackResult({ number }: { number: string }) {
  const { t, locale } = useFormat();
  const [state, setState] = useState<State>({ status: "loading" });
  const carrier = detectCarrier(number);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/tracking?number=${encodeURIComponent(number)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setState({ status: "done", events: d?.data ? findEvents(d.data) : [] }))
      .catch((e: unknown) => {
        if ((e as Error).name !== "AbortError") setState({ status: "done", events: [] });
      });
    return () => ctrl.abort();
  }, [number]);

  const fmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const when = (raw: string | null) => {
    if (!raw) return null;
    const n = Number(raw);
    const d = new Date(Number.isFinite(n) && raw.length >= 10 ? (raw.length === 10 ? n * 1000 : n) : raw);
    return Number.isNaN(d.getTime()) ? raw : fmt.format(d);
  };

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

      {state.status === "loading" && (
        <p className="mt-6 text-sm text-muted" aria-live="polite">
          {t("trk.loading")}
        </p>
      )}

      {state.status === "done" && state.events.length > 0 && (
        <section aria-labelledby="trk-history" className="mt-8">
          <h2 id="trk-history" className="text-lg font-semibold">
            {t("trk.history")}
          </h2>
          <ol className="mt-4">
            {state.events.map((e, i) => (
              <li key={i} className="relative border-l border-line pb-6 pl-6 last:pb-0">
                <span aria-hidden="true" className={`absolute -left-[5px] top-1.5 size-[9px] rounded-full ${i === 0 ? "bg-gl" : "bg-line-strong"}`} />
                <p className={i === 0 ? "font-semibold" : "text-muted"}>{e.text}</p>
                <p className="mt-0.5 text-sm text-dim">{[when(e.time), e.place].filter(Boolean).join(", ")}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {state.status === "done" && (
        <div className="mt-8">
          {state.events.length === 0 && <p className="max-w-[40rem] text-muted">{t("trk.noData")}</p>}
          {state.events.length > 0 && <p className="text-sm text-muted">{t("trk.external")}</p>}
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
      )}
    </div>
  );
}
