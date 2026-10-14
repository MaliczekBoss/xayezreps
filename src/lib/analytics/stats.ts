import "server-only";

import { isSource, sources, type SourceId } from "./shared";
import { run, storageKind, toCounts, type Cmd } from "./store";

const TZ = "Europe/Warsaw";
const KEEP_S = 100 * 24 * 60 * 60;
const MINUTE_KEEP_S = 2 * 60 * 60;
export const LIVE_MS = 30 * 60 * 1000;

const parts = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function stamp(ms: number) {
  const p = Object.fromEntries(parts.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  const day = `${p.year}${p.month}${p.day}`;
  return { day, hour: `${day}${p.hour}`, minute: `${day}${p.hour}${p.minute}`, hourOfDay: Number(p.hour) };
}

function shiftDay(day: string, n: number) {
  const d = new Date(Date.UTC(Number(day.slice(0, 4)), Number(day.slice(4, 6)) - 1, Number(day.slice(6, 8)) + n));
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
}

const hoursOf = (day: string) => Array.from({ length: 24 }, (_, h) => `${day}${String(h).padStart(2, "0")}`);

export const VIEWS_KEY = "xs:views";

export type TrackEvent =
  | { t: "pv"; path: string; sid: string; src: SourceId; isNew: boolean; n: number; dur: number; product?: string }
  | { t: "ping"; sid: string; src: SourceId; dur: number }
  | { t: "out"; sid: string; src: SourceId; agent: string };

export type Visitor = { id: string; country: string; device: "mobile" | "tablet" | "desktop" };

export async function record(e: TrackEvent, v: Visitor, now = Date.now()) {
  const { day, hour, minute } = stamp(now);
  const H = `xs:h:${hour}`;
  const D = `xs:d:${day}`;
  const cmds: Cmd[] = [];
  const touched = new Set<string>();
  const incr = (key: string, field: string, by = 1) => {
    cmds.push({ op: "HINCRBY", keys: [key], args: [field, by] });
    touched.add(key);
  };

  if (e.t === "pv") {
    incr(H, "pv");
    incr(D, "pv");
    incr(`xs:pg:${day}`, e.path);
    if (e.product) {
      const first = cmds.push({ op: "SADD", keys: [`xs:vv:${day}`], args: [`${v.id}|${e.product}`] }) - 1;
      cmds.push({ op: "EXPIRE", keys: [`xs:vv:${day}`], args: [2 * 86400] });
      cmds.push({ op: "HINCRBY", keys: [VIEWS_KEY], args: [e.product, 1], when: first });
    }
    if (e.isNew) {
      incr(H, "s");
      incr(D, "s");
    }
    const seen = cmds.push({ op: "SADD", keys: [`xs:seen:${day}`], args: [v.id] }) - 1;
    cmds.push({ op: "EXPIRE", keys: [`xs:seen:${day}`], args: [2 * 86400] });
    for (const [kind, field] of [["ref", e.src], ["geo", v.country], ["dev", v.device]] as const) {
      cmds.push({ op: "HINCRBY", keys: [`xs:${kind}:${day}`], args: [field, 1], when: seen });
      touched.add(`xs:${kind}:${day}`);
    }
    if (e.n === 2) {
      incr(H, "ms");
      incr(D, "ms");
    }
    for (const key of [`xs:uh:${hour}`, `xs:ud:${day}`]) {
      cmds.push({ op: "PFADD", keys: [key], args: [v.id] });
      touched.add(key);
    }
    cmds.push({ op: "HINCRBY", keys: [`xs:m:${minute}`], args: ["pv", 1] }, { op: "EXPIRE", keys: [`xs:m:${minute}`], args: [MINUTE_KEEP_S] });
  }
  if (e.t === "out") {
    incr(H, "out");
    incr(D, "out");
    incr(`xs:ag:${day}`, e.agent);
  }
  if ((e.t === "pv" || e.t === "ping") && e.dur > 0) {
    incr(H, "dur", e.dur);
    incr(D, "dur", e.dur);
  }

  cmds.push({ op: "ZADD", keys: ["xs:live"], args: [now, `${e.src}|${e.sid}`] });
  for (const key of touched) cmds.push({ op: "EXPIRE", keys: [key], args: [KEEP_S] });
  await run(cmds);
}

export type Range = "today" | "yesterday" | "7d" | "30d";
export const ranges: Range[] = ["today", "yesterday", "7d", "30d"];

type Totals = { uv: number; pv: number; s: number; ms: number; dur: number; out: number };
export type Bucket = Totals & { key: string; future: boolean };

export type StatsReport = {
  range: Range;
  storage: "redis" | "memory";
  granularity: "hour" | "day";
  current: Bucket[];
  previous: Bucket[];
  totals: Totals;
  previousTotals: Totals;
  live: { count: number; sources: [SourceId, number][]; perMinute: number[] };
  breakdown: { pages: [string, number][]; sources: [string, number][]; countries: [string, number][]; devices: [string, number][]; agents: [string, number][] };
  updatedAt: number;
};

const empty = (): Totals => ({ uv: 0, pv: 0, s: 0, ms: 0, dur: 0, out: 0 });

export async function readStats(range: Range, now = Date.now()): Promise<StatsReport> {
  const today = stamp(now);
  const byHour = range === "today" || range === "yesterday";
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 1;
  const endDay = range === "yesterday" ? shiftDay(today.day, -1) : today.day;

  const curDays = Array.from({ length: days }, (_, i) => shiftDay(endDay, i - days + 1));
  const prevDays = curDays.map((d) => shiftDay(d, -days));
  const curKeys = byHour ? hoursOf(endDay) : curDays;
  const prevKeys = byHour ? hoursOf(shiftDay(endDay, -1)) : prevDays;

  const cutoff = range === "today" ? today.hourOfDay : curKeys.length - 1;
  const statKey = (k: string) => (byHour ? `xs:h:${k}` : `xs:d:${k}`);
  const uvKey = (k: string) => (byHour ? `xs:uh:${k}` : `xs:ud:${k}`);
  const minutes = Array.from({ length: 30 }, (_, i) => stamp(now - (29 - i) * 60_000).minute);

  const cmds: Cmd[] = [];
  const push = (c: Cmd) => cmds.push(c) - 1;
  const curIdx = curKeys.map((k) => [push({ op: "HGETALL", keys: [statKey(k)] }), push({ op: "PFCOUNT", keys: [uvKey(k)] })]);
  const prevIdx = prevKeys.map((k) => [push({ op: "HGETALL", keys: [statKey(k)] }), push({ op: "PFCOUNT", keys: [uvKey(k)] })]);
  const uvCur = push({ op: "PFCOUNT", keys: curKeys.slice(0, cutoff + 1).map(uvKey) });
  const uvPrev = push({ op: "PFCOUNT", keys: prevKeys.slice(0, cutoff + 1).map(uvKey) });
  const breakdownIdx = curDays.map((d) => ["ref", "geo", "dev", "pg", "ag"].map((kind) => push({ op: "HGETALL", keys: [`xs:${kind}:${d}`] })));
  push({ op: "ZREMRANGEBYSCORE", keys: ["xs:live"], args: ["-inf", now - LIVE_MS] });
  const liveIdx = push({ op: "ZRANGE", keys: ["xs:live"], args: [0, -1] });
  const minuteIdx = minutes.map((m) => push({ op: "HGETALL", keys: [`xs:m:${m}`] }));

  const r = await run(cmds);

  const bucket = (key: string, [hi, ui]: number[], future: boolean): Bucket => {
    const c = toCounts(r[hi]);
    return { key, future, uv: Number(r[ui]) || 0, pv: c.pv ?? 0, s: c.s ?? 0, ms: c.ms ?? 0, dur: c.dur ?? 0, out: c.out ?? 0 };
  };
  const current = curKeys.map((k, i) => bucket(k, curIdx[i], i > cutoff));
  const previous = prevKeys.map((k, i) => bucket(k, prevIdx[i], false));

  const sum = (list: Bucket[], uv: number) =>
    list.slice(0, cutoff + 1).reduce((t, b) => ({ ...t, pv: t.pv + b.pv, s: t.s + b.s, ms: t.ms + b.ms, dur: t.dur + b.dur, out: t.out + b.out }), { ...empty(), uv });

  const merged = (kind: number) => {
    const all: Record<string, number> = {};
    for (const idx of breakdownIdx) for (const [k, v] of Object.entries(toCounts(r[idx[kind]]))) all[k] = (all[k] ?? 0) + v;
    return Object.entries(all).sort((a, b) => b[1] - a[1]);
  };

  const liveMembers = (Array.isArray(r[liveIdx]) ? r[liveIdx] : []) as string[];
  const liveBySource: Partial<Record<SourceId, number>> = {};
  for (const m of liveMembers) {
    const src = m.split("|")[0];
    const id: SourceId = isSource(src) ? src : "other";
    liveBySource[id] = (liveBySource[id] ?? 0) + 1;
  }

  return {
    range,
    storage: storageKind(),
    granularity: byHour ? "hour" : "day",
    current,
    previous,
    totals: sum(current, Number(r[uvCur]) || 0),
    previousTotals: sum(previous, Number(r[uvPrev]) || 0),
    live: {
      count: liveMembers.length,
      sources: (Object.entries(liveBySource) as [SourceId, number][]).sort((a, b) => b[1] - a[1]),
      perMinute: minuteIdx.map((i) => toCounts(r[i]).pv ?? 0),
    },
    breakdown: { sources: merged(0), countries: merged(1), devices: merged(2), pages: merged(3).slice(0, 12), agents: merged(4) },
    updatedAt: now,
  };
}

export const sourceLabel = (id: string) => (isSource(id) ? sources[id].label : id);
