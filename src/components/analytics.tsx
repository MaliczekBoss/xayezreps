"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { AGENT_HOSTS, classifySource, type SourceId } from "@/lib/analytics/shared";

const SESSION_KEY = "xayez-session-v1";
export const NO_TRACK_KEY = "xayez-notrack";
const IDLE_MS = 30 * 60 * 1000;

type Session = { id: string; last: number; src: SourceId; n: number };

function skip(pathname: string) {
  try {
    if (localStorage.getItem(NO_TRACK_KEY) === "1") return true;
  } catch {}
  return pathname.startsWith("/admin") || navigator.webdriver;
}

function send(data: Record<string, unknown>) {
  const body = JSON.stringify(data);
  if (!navigator.sendBeacon?.("/api/track", new Blob([body], { type: "text/plain" }))) {
    fetch("/api/track", { method: "POST", body, keepalive: true }).catch(() => {});
  }
}

/** Sesja trwa, dopóki między odsłonami nie minie 30 minut */
function touchSession(): { session: Session; isNew: boolean } {
  const now = Date.now();
  let saved: Session | null = null;
  try {
    saved = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null");
  } catch {}
  const isNew = !saved || now - saved.last > IDLE_MS;
  const session: Session = isNew
    ? {
        id: Math.random().toString(36).slice(2, 12) + now.toString(36).slice(-6),
        last: now,
        src: classifySource(document.referrer, new URLSearchParams(location.search).get("utm_source"), location.hostname),
        n: 0,
      }
    : { ...saved!, last: now };
  session.n += 1;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {}
  return { session, isNew };
}

type Active = { since: number; pending: number };

/** Czas, w którym karta była widoczna, od ostatniego zgłoszenia (w sekundach) */
function takeDuration(a: Active) {
  const now = Date.now();
  if (a.since) a.pending += now - a.since;
  a.since = document.visibilityState === "visible" ? now : 0;
  const seconds = Math.round(a.pending / 1000);
  a.pending = 0;
  return seconds;
}

/** Licznik odwiedzin bez ciasteczek: odsłony, czas aktywności na stronie i kliknięcia do agentów */
export function Analytics() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);
  const active = useRef<Active>({ since: 0, pending: 0 });

  useEffect(() => {
    if (skip(pathname) || lastPath.current === pathname) return;
    lastPath.current = pathname;
    const { session, isNew } = touchSession();
    const dur = takeDuration(active.current);
    send({ t: "pv", p: pathname, sid: session.id, src: session.src, new: isNew, n: session.n, dur: isNew ? 0 : dur });
  }, [pathname]);

  useEffect(() => {
    const a = active.current;
    a.since = document.visibilityState === "visible" ? Date.now() : 0;

    const current = (): Session | null => {
      try {
        return JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null");
      } catch {
        return null;
      }
    };

    const onHide = () => {
      if (skip(location.pathname)) return;
      if (document.visibilityState === "hidden") {
        const s = current();
        const dur = takeDuration(a);
        if (s && dur > 0) send({ t: "ping", sid: s.id, src: s.src, dur });
      } else {
        a.since = Date.now();
      }
    };

    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || skip(location.pathname)) return;
      let host = "";
      try {
        host = new URL(link.href).hostname;
      } catch {
        return;
      }
      const agent = AGENT_HOSTS.find(([, re]) => re.test(host))?.[0];
      const s = current();
      if (agent && s) send({ t: "out", sid: s.id, src: s.src, a: agent });
    };

    document.addEventListener("visibilitychange", onHide);
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  return null;
}
