"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type PointerEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, RotateCw, TriangleAlert } from "lucide-react";
import { NO_TRACK_KEY } from "@/components/analytics";
import { agentsById, type AgentId } from "@/lib/agents";
import { isSource, sources } from "@/lib/analytics/shared";
import type { Bucket, Range, StatsReport } from "@/lib/analytics/stats";
import { AdminHeader } from "../admin-header";

const RANGES: { id: Range; label: string; period: string }[] = [
  { id: "today", label: "Dziś", period: "Dziś" },
  { id: "yesterday", label: "Wczoraj", period: "Wczoraj" },
  { id: "7d", label: "7 dni", period: "Ostatnie 7 dni" },
  { id: "30d", label: "30 dni", period: "Ostatnie 30 dni" },
];
const PREV_LABEL: Record<Range, string> = { today: "Wczoraj", yesterday: "Przedwczoraj", "7d": "Poprzednie 7 dni", "30d": "Poprzednie 30 dni" };
const REFRESH_MS = 30_000;

const nf = new Intl.NumberFormat("pl-PL");
const compact = new Intl.NumberFormat("pl-PL", { notation: "compact", maximumFractionDigits: 1 });
const countries = new Intl.DisplayNames(["pl"], { type: "region" });

const num = (n: number) => (n >= 10_000 ? compact.format(n) : nf.format(Math.round(n)));
const ratio = (a: number, b: number) => (b > 0 ? a / b : 0);
const duration = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return m ? `${m}m ${sec}s` : `${sec}s`;
};

type Metric = {
  label: string;
  value: (t: StatsReport["totals"]) => number;
  bucket: (b: Bucket) => number;
  format: (n: number) => string;
  lowerIsBetter?: boolean;
};

const metrics: Metric[] = [
  { label: "Unikalni odwiedzający", value: (t) => t.uv, bucket: (b) => b.uv, format: num },
  { label: "Sesje", value: (t) => t.s, bucket: (b) => b.s, format: num },
  { label: "Odsłony", value: (t) => t.pv, bucket: (b) => b.pv, format: num },
  { label: "Stron na sesję", value: (t) => ratio(t.pv, t.s), bucket: (b) => ratio(b.pv, b.s), format: (n) => n.toFixed(1).replace(".", ",") },
  {
    label: "Odrzucenia",
    value: (t) => (t.s ? Math.max(0, 1 - t.ms / t.s) * 100 : 0),
    bucket: (b) => (b.s ? Math.max(0, 1 - b.ms / b.s) * 100 : 0),
    format: (n) => `${n.toFixed(1).replace(".", ",")}%`,
    lowerIsBetter: true,
  },
  { label: "Średni czas sesji", value: (t) => ratio(t.dur, t.s), bucket: (b) => ratio(b.dur, b.s), format: duration },
  { label: "Kliknięcia do agentów", value: (t) => t.out, bucket: (b) => b.out, format: num },
];

export function StatsDashboard({ productNames }: { productNames: Record<string, string> }) {
  const [range, setRange] = useState<Range>("today");
  const [report, setReport] = useState<StatsReport | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const load = useCallback(
    (r: Range) =>
      fetch(`/api/admin/stats?range=${r}`, { cache: "no-store" })
        .then(async (res) => {
          if (res.status === 401) return router.replace("/admin/login");
          if (!res.ok) throw new Error(String(res.status));
          setReport(await res.json());
          setError(false);
        })
        .catch(() => setError(true))
        .finally(() => setLoading(false)),
    [router],
  );

  useEffect(() => {
    load(range);
    const timer = window.setInterval(() => document.visibilityState === "visible" && load(range), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [range, load]);

  const period = RANGES.find((r) => r.id === range)!;
  const time = report ? new Intl.DateTimeFormat("pl-PL", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(report.updatedAt) : "";

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
      <AdminHeader />

      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Okres" className="flex rounded-xl border border-line bg-card p-1">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={range === r.id}
              onClick={() => {
                setLoading(true);
                setRange(r.id);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${range === r.id ? "bg-fg text-bg" : "text-muted hover:text-fg"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            load(range);
          }}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-card px-3 text-sm text-muted transition-colors hover:border-line-strong hover:text-fg"
        >
          <RotateCw aria-hidden size={15} className={loading ? "animate-spin" : ""} />
          <span className="hidden sm:inline">{time ? `Zaktualizowano ${time}` : "Odśwież"}</span>
        </button>
        <div className="ml-auto inline-flex h-10 items-center gap-2.5 rounded-xl border border-line bg-card px-3.5 text-sm" aria-live="polite">
          <span aria-hidden="true" className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-gl opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2.5 rounded-full bg-gl" />
          </span>
          <span className="font-mono font-semibold tabular">{report ? num(report.live.count) : "–"}</span>
          <span className="text-muted">na stronie</span>
        </div>
      </div>

      {report?.storage === "memory" && (
        <p className="mt-4 flex gap-3 rounded-xl border border-amber-300/25 bg-amber-300/[0.06] px-4 py-3 text-sm text-amber-100/90">
          <TriangleAlert aria-hidden size={17} className="mt-0.5 shrink-0 text-amber-300" />
          <span>
            Statystyki zapisują się teraz tylko w pamięci serwera i znikną po restarcie. Na Vercelu wejdź w <b>Storage → Create Database → Upstash for Redis</b>, podłącz
            bazę do projektu i zrób Redeploy – od tego momentu wszystko zapisuje się na stałe.
          </span>
        </p>
      )}
      {error && <p className="mt-4 rounded-xl border border-line bg-card px-4 py-3 text-sm text-muted">Nie udało się pobrać statystyk. Spróbujemy ponownie za chwilę.</p>}

      <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-4">
        {metrics.map((m) => (
          <StatTile key={m.label} metric={m} report={report} period={period.period} />
        ))}
        <LiveTile report={report} />
      </div>

      <section aria-labelledby="chart-title" className="mt-5 rounded-xl border border-line bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="chart-title" className="font-semibold">
            Unikalni odwiedzający
          </h2>
          <div className="flex gap-4 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="h-0.5 w-4 rounded bg-fg" />
              {period.period}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="h-0.5 w-4 rounded bg-dim" />
              {PREV_LABEL[range]}
            </span>
          </div>
        </div>
        {report ? <LineChart report={report} /> : <div className="mt-4 h-64 animate-pulse rounded-lg bg-bg" />}
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Breakdown
          title="Najczęściej oglądane"
          rows={report?.breakdown.pages}
          render={(path) => <span className="truncate">{pageLabel(path, productNames)}</span>}
        />
        <Breakdown
          title="Źródła ruchu"
          rows={report?.breakdown.sources}
          render={(id) => (
            <span className="flex min-w-0 items-center gap-2.5">
              <SourceMark id={id} />
              <span className="truncate">{isSource(id) ? sources[id].label : id}</span>
            </span>
          )}
        />
        <Breakdown title="Kraje" rows={report?.breakdown.countries} render={(cc) => <span className="truncate">{cc === "XX" ? "Nieznany" : (countries.of(cc) ?? cc)}</span>} />
        <Breakdown
          title="Urządzenia"
          rows={report?.breakdown.devices}
          render={(d) => <span>{({ mobile: "Telefon", desktop: "Komputer", tablet: "Tablet" } as Record<string, string>)[d] ?? d}</span>}
        />
        <Breakdown
          title="Kliknięcia do agentów"
          rows={report?.breakdown.agents}
          empty="Nikt jeszcze nie kliknął linku do agenta w tym okresie."
          render={(id) => {
            const agent = agentsById.get(id as AgentId);
            return (
              <span className="flex min-w-0 items-center gap-2.5">
                {agent && (
                  <span className="relative size-5 shrink-0 overflow-hidden rounded bg-black">
                    <Image src={agent.logo} alt="" fill sizes="1.25rem" className="object-contain p-px" />
                  </span>
                )}
                <span className="truncate">{agent?.name ?? id}</span>
              </span>
            );
          }}
        />
        <TrackingToggle />
      </div>
    </div>
  );
}

function Change({ cur, prev, lowerIsBetter }: { cur: number; prev: number; lowerIsBetter?: boolean }) {
  if (!prev && !cur) return null;
  if (!prev) return <span className="rounded-md bg-gl/15 px-1.5 py-0.5 text-xs font-semibold text-gl">nowe</span>;
  const pct = ((cur - prev) / prev) * 100;
  if (!Number.isFinite(pct) || Math.abs(pct) < 0.05) return <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-xs font-semibold text-muted">0%</span>;
  const good = lowerIsBetter ? pct < 0 : pct > 0;
  const Icon = pct > 0 ? ArrowUp : ArrowDown;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold tabular ${good ? "bg-gl/15 text-gl" : "bg-red-500/15 text-red-400"}`}>
      <Icon aria-hidden size={12} strokeWidth={2.5} />
      {Math.abs(pct).toFixed(1).replace(".", ",")}%
    </span>
  );
}

function Bars({ values, future = [] }: { values: number[]; future?: boolean[] }) {
  const max = Math.max(...values, 0);
  return (
    <div aria-hidden="true" className="mt-4 flex h-12 items-end gap-[2px]">
      {values.map((v, i) => (
        <span
          key={i}
          className={`flex-1 rounded-t-[2px] ${future[i] ? "bg-line/60" : v > 0 ? "bg-fg/85" : "bg-line"}`}
          style={{ height: future[i] || !max || v === 0 ? "2px" : `${Math.max(6, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

function Tile({ label, badge, value, sub, children }: { label: string; badge?: ReactNode; value: string; sub: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-[13px] text-muted">{label}</p>
        {badge}
      </div>
      <p className="mt-1.5 font-mono text-[1.75rem] font-medium leading-tight tracking-[-0.02em] tabular">{value}</p>
      <div className="text-xs text-dim">{sub}</div>
      <div className="mt-auto">{children}</div>
    </div>
  );
}

function StatTile({ metric, report, period }: { metric: Metric; report: StatsReport | null; period: string }) {
  if (!report)
    return (
      <Tile label={metric.label} value="–" sub={period}>
        <Bars values={Array(24).fill(0)} />
      </Tile>
    );
  const cur = metric.value(report.totals);
  const prev = metric.value(report.previousTotals);
  return (
    <Tile label={metric.label} badge={<Change cur={cur} prev={prev} lowerIsBetter={metric.lowerIsBetter} />} value={metric.format(cur)} sub={period}>
      <Bars values={report.current.map(metric.bucket)} future={report.current.map((b) => b.future)} />
    </Tile>
  );
}

function LiveTile({ report }: { report: StatsReport | null }) {
  return (
    <Tile
      label="Na żywo · 30 min"
      badge={<span aria-hidden="true" className="mt-1 size-2 rounded-full bg-gl" />}
      value={report ? num(report.live.count) : "–"}
      sub={
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {report?.live.sources.slice(0, 4).map(([id, n]) => (
            <span key={id} className="inline-flex items-center gap-1 text-muted">
              <SourceMark id={id} small />
              <span className="tabular">{n}</span>
            </span>
          ))}
          {report && report.live.count === 0 && "Nikogo w tej chwili"}
        </span>
      }
    >
      <Bars values={report?.live.perMinute ?? Array(30).fill(0)} />
    </Tile>
  );
}

function SourceMark({ id, small = false }: { id: string; small?: boolean }) {
  const s = isSource(id) ? sources[id] : sources.other;
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full font-bold leading-none ${small ? "size-4 text-[9px]" : "size-5 text-[11px]"}`}
      style={{ background: s.color, color: ["#ffffff", "#e7e9ea", "#25f4ee"].includes(s.color) ? "#111112" : "#ffffff" }}
    >
      {s.mark}
    </span>
  );
}

const pad = { top: 12, right: 12, bottom: 28, left: 40 };

function LineChart({ report }: { report: StatsReport }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [hover, setHover] = useState<number | null>(null);
  const height = 260;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cur = report.current.map((b) => (b.future ? null : b.uv));
  const prev = report.previous.map((b) => b.uv);
  const n = Math.max(cur.length, 2);
  const { max, step: tickStep } = niceScale(Math.max(...prev, ...cur.map((v) => v ?? 0), 4));
  const x = (i: number) => pad.left + (i / (n - 1)) * (width - pad.left - pad.right);
  const y = (v: number) => pad.top + (1 - v / max) * (height - pad.top - pad.bottom);

  const line = (vals: (number | null)[]) =>
    vals.reduce<string>((d, v, i) => (v === null ? d : `${d}${d ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`), "");
  const lastCur = cur.reduce<number>((last, v, i) => (v === null ? last : i), 0);
  const area = `${line(cur)}L${x(lastCur).toFixed(1)},${y(0)}L${x(0)},${y(0)}Z`;

  const label = (key: string) =>
    report.granularity === "hour" ? `${key.slice(8, 10)}:00` : `${Number(key.slice(6, 8))}.${key.slice(4, 6)}`;
  const step = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((width - pad.left - pad.right) / 56))));
  const labelled = new Set(Array.from({ length: n }, (_, i) => i).filter((i) => i % step === 0));
  if (!labelled.has(n - 1)) {
    if (n - 1 - Math.max(...labelled) < step * 0.75) labelled.delete(Math.max(...labelled));
    labelled.add(n - 1);
  }
  const ticks = Array.from({ length: Math.round(max / tickStep) + 1 }, (_, i) => i * tickStep);

  const onMove = (e: PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - rect.left) / rect.width) * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, i)));
  };

  return (
    <div ref={box} className="relative mt-4">
      <svg width={width} height={height} role="img" aria-label="Wykres unikalnych odwiedzających" className="block max-w-full">
        <defs>
          <linearGradient id="uv-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ececee" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#ececee" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="#252528" strokeDasharray={t ? "3 4" : undefined} />
            <text x={pad.left - 8} y={y(t) + 4} textAnchor="end" className="fill-dim font-mono text-[11px]">
              {num(t)}
            </text>
          </g>
        ))}
        {report.current.map((b, i) =>
          labelled.has(i) ? (
            <text key={b.key} x={x(i)} y={height - 8} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} className="fill-dim text-[11px]">
              {label(b.key)}
            </text>
          ) : null,
        )}
        <path d={line(prev)} fill="none" stroke="#5f5f66" strokeWidth={1.5} strokeDasharray="4 4" />
        {cur.some((v) => v !== null) && <path d={area} fill="url(#uv-fill)" />}
        <path d={line(cur)} fill="none" stroke="#ececee" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={height - pad.bottom} stroke="#333338" />
            {cur[hover] !== null && <circle cx={x(hover)} cy={y(cur[hover]!)} r={4} fill="#ececee" />}
            <circle cx={x(hover)} cy={y(prev[hover] ?? 0)} r={3} fill="#5f5f66" />
          </g>
        )}
        <rect x={pad.left} y={0} width={Math.max(0, width - pad.left - pad.right)} height={height} fill="transparent" onPointerMove={onMove} onPointerLeave={() => setHover(null)} />
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute top-2 rounded-lg border border-line-strong bg-[#18181b] px-3 py-2 text-xs shadow-[0_12px_30px_-10px_rgb(0_0_0/0.9)]"
          style={{ left: Math.min(Math.max(x(hover) - 70, 0), width - 150) }}
        >
          <p className="text-muted">{label(report.current[hover].key)}</p>
          <p className="mt-1 flex justify-between gap-6">
            <span>Ten okres</span>
            <span className="font-mono tabular">{cur[hover] === null ? "–" : num(cur[hover]!)}</span>
          </p>
          <p className="flex justify-between gap-6 text-muted">
            <span>Poprzedni</span>
            <span className="font-mono tabular">{num(prev[hover] ?? 0)}</span>
          </p>
        </div>
      )}
    </div>
  );
}

function niceScale(v: number) {
  const rough = v / 4;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const n = rough / pow;
  const step = Math.max(1, (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow);
  return { step, max: Math.ceil(v / step) * step };
}

function pageLabel(path: string, names: Record<string, string>) {
  if (path === "/") return "Strona główna";
  const product = path.match(/^\/product\/(.+)$/);
  if (product) return names[product[1]] ?? path;
  const known: Record<string, string> = {
    "/finds": "Findy",
    "/tools": "Narzędzia",
    "/tools/link": "Konwerter linków",
    "/tools/qc": "QC Finder",
    "/tools/photo": "Szukaj po zdjęciu",
    "/outfits": "Outfity",
    "/favorites": "Ulubione",
    "/tools/tracking": "Śledzenie paczek",
    "/tools/ship": "Kalkulator wysyłki",
    "/sellers": "Sprzedawcy",
    "/tutorial": "Poradnik",
    "/inne": "Inne strony",
  };
  return known[path] ?? path;
}

function Breakdown({
  title,
  rows,
  render,
  empty = "Brak danych w tym okresie.",
}: {
  title: string;
  rows?: [string, number][];
  render: (key: string) => ReactNode;
  empty?: string;
}) {
  const top = useMemo(() => (rows ?? []).slice(0, 8), [rows]);
  const max = top[0]?.[1] ?? 0;
  const total = (rows ?? []).reduce((s, [, v]) => s + v, 0);

  return (
    <section className="rounded-xl border border-line bg-card p-4 sm:p-5">
      <h2 className="font-semibold">{title}</h2>
      {!rows ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-8 animate-pulse rounded-lg bg-bg" />
          ))}
        </div>
      ) : top.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-1">
          {top.map(([key, value]) => (
            <li key={key} className="relative flex items-center justify-between gap-4 overflow-hidden rounded-lg px-2.5 py-2 text-sm">
              <span aria-hidden="true" className="absolute inset-y-0 left-0 rounded-lg bg-white/[0.06]" style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
              <span className="relative flex min-w-0 items-center">{render(key)}</span>
              <span className="relative shrink-0 font-mono tabular">
                {num(value)}
                <span className="ml-2 inline-block w-11 text-right text-xs text-dim">{total ? `${Math.round((value / total) * 100)}%` : ""}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const readNoTrack = () => {
  try {
    return localStorage.getItem(NO_TRACK_KEY) === "1";
  } catch {
    return false;
  }
};
const noTrackListeners = new Set<() => void>();
const subscribeNoTrack = (fn: () => void) => {
  noTrackListeners.add(fn);
  window.addEventListener("storage", fn);
  return () => {
    noTrackListeners.delete(fn);
    window.removeEventListener("storage", fn);
  };
};

function TrackingToggle() {
  const off = useSyncExternalStore(subscribeNoTrack, readNoTrack, () => false);

  const toggle = () => {
    try {
      if (off) localStorage.removeItem(NO_TRACK_KEY);
      else localStorage.setItem(NO_TRACK_KEY, "1");
    } catch {}
    noTrackListeners.forEach((fn) => fn());
  };

  return (
    <section className="flex items-center justify-between gap-6 rounded-xl border border-line bg-card p-4 sm:p-5">
      <div>
        <h2 className="font-semibold">Nie licz moich wizyt</h2>
        <p className="mt-1 text-sm text-muted">Twoje wejścia z tej przeglądarki nie będą wliczane do statystyk. Panel admina nigdy nie jest liczony.</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={off}
        aria-label="Nie licz moich wizyt"
        onClick={toggle}
        className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors ${off ? "border-fg bg-fg" : "border-line-strong bg-bg"}`}
      >
        <span className={`absolute top-0.5 size-5 rounded-full transition-[left,background-color] ${off ? "left-6 bg-bg" : "left-0.5 bg-muted"}`} />
      </button>
    </section>
  );
}
