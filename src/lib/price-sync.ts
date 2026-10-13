"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Find } from "./finds";
import { cnyToPln } from "./money";
import { useRates } from "./rates";

// Ceny widocznych ofert zsynchronizowane z agentem: każda pokazana karta zgłasza swoje id, a zgłoszenia z krótkiej
// chwili idą razem do /api/prices. Serwer odświeża dawno niesprawdzane ceny u agenta i zapisuje je w bazie,
// a karty na ekranie podmieniają cenę bez przeładowania strony.

const BATCH = 40;
const WAIT_MS = 350;

const cny = new Map<string, number>();
const asked = new Set<string>();
const queue = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;
let timer: number | undefined;

function flush() {
  timer = undefined;
  const ids = [...queue].slice(0, BATCH);
  ids.forEach((id) => queue.delete(id));
  if (!ids.length) return;
  fetch("/api/prices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) })
    .then((r) => (r.ok ? r.json() : null))
    .then((d: { prices?: Record<string, number> } | null) => {
      let changed = false;
      for (const [id, value] of Object.entries(d?.prices ?? {})) {
        if (typeof value === "number" && value > 0 && cny.get(id) !== value) {
          cny.set(id, value);
          changed = true;
        }
      }
      if (changed) {
        version++;
        listeners.forEach((l) => l());
      }
    })
    .catch(() => {})
    .finally(() => {
      if (queue.size) schedule();
    });
}

function schedule() {
  if (timer === undefined) timer = window.setTimeout(flush, WAIT_MS);
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Cena oferty w złotówkach: z serwera, a po synchronizacji z agentem – aktualna (tym samym kursem co strona produktu) */
export function useLivePricePln(find: Pick<Find, "id" | "pricePln">): number {
  const rates = useRates();
  useSyncExternalStore(subscribe, () => version, () => 0);
  useEffect(() => {
    if (asked.has(find.id)) return;
    asked.add(find.id);
    queue.add(find.id);
    schedule();
  }, [find.id]);
  const value = cny.get(find.id);
  return value && rates.CNY > 0 ? Math.round(cnyToPln(value, rates)) : find.pricePln;
}
