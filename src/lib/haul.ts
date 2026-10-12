"use client";

import { useSyncExternalStore } from "react";
import type { Find } from "./finds";
import { notify } from "./notify";
import { pricing, type ShippingLineId } from "./site";
import { formatNow } from "./use-format";

/** Kopia danych produktu w paczce – paczka działa też po zmianach w katalogu */
export type HaulFind = Pick<Find, "id" | "name" | "image" | "pricePln" | "weightGrams" | "category" | "source">;

export type HaulItem = { qty: number; find: HaulFind };

export type HaulState = {
  items: Record<string, HaulItem>;
  line: ShippingLineId;
};

const STORAGE_KEY = "xayez-haul-v3";
const EMPTY: HaulState = { items: {}, line: "standard" };
const MAX_QTY = 9;

let state: HaulState = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function isFind(f: unknown): f is HaulFind {
  if (!f || typeof f !== "object") return false;
  const o = f as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    typeof o.image === "string" &&
    typeof o.pricePln === "number" &&
    typeof o.weightGrams === "number" &&
    !!o.source &&
    typeof o.source === "object"
  );
}

function sanitize(raw: unknown): HaulState {
  if (!raw || typeof raw !== "object") return EMPTY;
  const r = raw as Partial<HaulState>;
  const items: Record<string, HaulItem> = {};
  for (const [id, item] of Object.entries(r.items ?? {})) {
    if (item && Number.isInteger(item.qty) && item.qty > 0 && isFind(item.find)) {
      items[id] = { qty: Math.min(item.qty, MAX_QTY), find: item.find };
    }
  }
  const line = pricing.lines.some((l) => l.id === r.line) ? (r.line as ShippingLineId) : EMPTY.line;
  return { items, line };
}

function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) state = sanitize(JSON.parse(raw));
  } catch {
    // Brak dostępu do localStorage (tryb prywatny itp.) – paczka działa tylko w tej karcie
  }
}

function commit(next: HaulState) {
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

function getSnapshot() {
  load();
  return state;
}

function getServerSnapshot() {
  return EMPTY;
}

export function useHaul() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

const toHaulFind = (f: HaulFind): HaulFind => ({
  id: f.id,
  name: f.name,
  image: f.image,
  pricePln: f.pricePln,
  weightGrams: f.weightGrams,
  category: f.category,
  source: f.source,
});

/** Przycisk w wyspie: ile rzeczy i ile waży paczka */
function haulAction() {
  const f = formatNow();
  const s = summarize(state);
  return { label: `${f.pieces(s.count)}, ${f.weight(s.shippingGrams, "kg")}`, href: "/tools/ship" };
}

function setItem(find: HaulFind, qty: number) {
  const items = { ...state.items };
  if (qty <= 0) delete items[find.id];
  else items[find.id] = { qty: Math.min(qty, MAX_QTY), find: toHaulFind(find) };
  commit({ ...state, items });
}

export const haulActions = {
  add(find: HaulFind) {
    const qty = Math.min((state.items[find.id]?.qty ?? 0) + 1, MAX_QTY);
    setItem(find, qty);
    const f = formatNow();
    notify({
      tone: "brand",
      title: qty > 1 ? f.t("n.addedQty", { n: qty }) : f.t("n.added"),
      text: find.name,
      image: find.image,
      action: haulAction(),
    });
  },
  decrement(id: string) {
    const item = state.items[id];
    if (!item) return;
    if (item.qty <= 1) {
      haulActions.remove(id);
      return;
    }
    setItem(item.find, item.qty - 1);
    const f = formatNow();
    notify({
      tone: "neutral",
      title: f.t("n.decremented", { n: item.qty - 1 }),
      text: item.find.name,
      image: item.find.image,
      action: haulAction(),
    });
  },
  remove(id: string) {
    const item = state.items[id];
    if (!item) return;
    setItem(item.find, 0);
    const f = formatNow();
    notify({
      tone: "neutral",
      title: f.t("n.removed"),
      text: item.find.name,
      image: item.find.image,
      duration: 5000,
      action: {
        label: f.t("n.undo"),
        onClick: () => {
          setItem(item.find, item.qty);
          notify({ tone: "brand", title: formatNow().t("n.restored"), text: item.find.name, image: item.find.image });
        },
      },
    });
  },
  /** Kilka rzeczy naraz (np. cały outfit) – jedno powiadomienie zamiast kilku */
  addMany(finds: HaulFind[], title: string) {
    if (finds.length === 0) return;
    const items = { ...state.items };
    for (const find of finds) items[find.id] = { qty: Math.min((items[find.id]?.qty ?? 0) + 1, MAX_QTY), find: toHaulFind(find) };
    commit({ ...state, items });
    const f = formatNow();
    notify({ tone: "brand", title, text: f.pieces(finds.length), image: finds[0].image, action: haulAction() });
  },
  toggle(find: HaulFind) {
    if (state.items[find.id]) haulActions.remove(find.id);
    else haulActions.add(find);
  },
  setLine(line: ShippingLineId) {
    if (state.line === line) return;
    commit({ ...state, line });
    const f = formatNow();
    const info = pricing.lines.find((l) => l.id === line) ?? pricing.lines[0];
    const s = summarize(state);
    notify({
      tone: "brand",
      icon: "truck",
      title: f.t("n.line", { name: info.name }),
      text: s.count > 0 ? f.t("n.lineText", { days: f.days(info.days), cost: f.money(s.shippingPln) }) : f.days(info.days),
    });
  },
  clear() {
    const previous = state;
    const count = summarize(previous).count;
    if (count === 0) return;
    commit({ ...state, items: {} });
    const f = formatNow();
    notify({
      tone: "neutral",
      icon: "remove",
      title: f.t("n.cleared"),
      text: f.t("n.clearedText", { pieces: f.pieces(count) }),
      duration: 6000,
      action: {
        label: f.t("n.undo"),
        onClick: () => {
          commit(previous);
          notify({ tone: "brand", icon: "undo", title: formatNow().t("n.haulRestored"), action: haulAction() });
        },
      },
    });
  },
};

export const MAX_ITEM_QTY = MAX_QTY;

export type HaulLine = { find: HaulFind; qty: number };

export type HaulSummary = {
  lines: HaulLine[];
  line: (typeof pricing.lines)[number];
  count: number;
  itemsGrams: number;
  packagingGrams: number;
  shippingGrams: number;
  productsPln: number;
  domesticPln: number;
  shippingPln: number;
  totalPln: number;
};

/** Waga z kartonem i wypełnieniem */
export function withPackaging(itemsGrams: number) {
  if (itemsGrams === 0) return 0;
  return itemsGrams + Math.max(pricing.packagingMinGrams, Math.round(itemsGrams * pricing.packagingRatio));
}

/** Koszt wysyłki dla danej wagi i linii, w złotówkach */
export function shippingCost(grams: number, lineId: ShippingLineId) {
  const line = pricing.lines.find((l) => l.id === lineId) ?? pricing.lines[0];
  const steps = Math.ceil(grams / pricing.stepGrams);
  return steps === 0 ? 0 : line.firstStepPln + (steps - 1) * line.nextStepPln;
}

export function summarize(haul: HaulState): HaulSummary {
  const lines: HaulLine[] = Object.values(haul.items).map((i) => ({ find: i.find, qty: i.qty }));

  const count = lines.reduce((n, l) => n + l.qty, 0);
  const itemsGrams = lines.reduce((g, l) => g + l.find.weightGrams * l.qty, 0);
  const productsPln = lines.reduce((c, l) => c + l.find.pricePln * l.qty, 0);

  const shippingGrams = withPackaging(itemsGrams);
  const packagingGrams = shippingGrams - itemsGrams;

  const line = pricing.lines.find((l) => l.id === haul.line) ?? pricing.lines[0];
  const shippingPln = shippingCost(shippingGrams, line.id);
  const domesticPln = count * pricing.domesticPlnPerItem;

  return {
    lines,
    line,
    count,
    itemsGrams,
    packagingGrams,
    shippingGrams,
    productsPln,
    domesticPln,
    shippingPln,
    totalPln: productsPln + domesticPln + shippingPln,
  };
}
