"use client";

import { useSyncExternalStore } from "react";
import type { Find } from "./finds";
import { notify } from "./notify";
import { formatNow } from "./use-format";

export type Favorites = Record<string, number>;

const STORAGE_KEY = "xayez-favorites-v1";
const EMPTY: Favorites = {};
const MAX = 300;

let state: Favorites = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function sanitize(raw: unknown): Favorites {
  if (!raw || typeof raw !== "object") return EMPTY;
  const out: Favorites = {};
  for (const [id, at] of Object.entries(raw as Record<string, unknown>)) {
    if (/^[\w-]{1,40}$/.test(id) && typeof at === "number") out[id] = at;
  }
  return out;
}

function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) state = sanitize(JSON.parse(raw));
  } catch {}
}

function commit(next: Favorites) {
  state = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    try {
      state = sanitize(e.newValue ? JSON.parse(e.newValue) : null);
    } catch {
      state = EMPTY;
    }
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const getSnapshot = () => {
  load();
  return state;
};

export function useFavorites() {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

export const favoriteActions = {
  toggle(find: Pick<Find, "id" | "name" | "image">) {
    const { t } = formatNow();
    const next = { ...state };
    if (next[find.id]) {
      delete next[find.id];
      commit(next);
      notify({ tone: "neutral", icon: "heart", title: t("fav.removed"), text: find.name });
      return;
    }
    next[find.id] = Date.now();
    const ids = Object.keys(next).sort((a, b) => next[b] - next[a]);
    for (const id of ids.slice(MAX)) delete next[id];
    commit(next);
    notify({ tone: "success", image: find.image, title: t("fav.added"), text: find.name, action: { label: t("fav.see"), href: "/favorites" } });
  },
  clear() {
    commit({});
  },
};
