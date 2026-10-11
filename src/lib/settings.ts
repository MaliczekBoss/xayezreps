"use client";

import { useSyncExternalStore } from "react";
import { agentsById, type AgentId } from "./agents";

export const languages = [
  { code: "en", label: "English", locale: "en-US", flag: "us" },
  { code: "pl", label: "Polski", locale: "pl-PL", flag: "pl" },
  { code: "de", label: "Deutsch", locale: "de-DE", flag: "de" },
  { code: "fr", label: "Français", locale: "fr-FR", flag: "fr" },
  { code: "es", label: "Español", locale: "es-ES", flag: "es" },
  { code: "it", label: "Italiano", locale: "it-IT", flag: "it" },
  { code: "zh", label: "中文", locale: "zh-CN", flag: "cn" },
] as const;

export type Lang = (typeof languages)[number]["code"];

export const currencies = ["PLN", "USD", "EUR", "CNY"] as const;

export type Currency = (typeof currencies)[number];

export type Settings = { agent: AgentId; lang: Lang; currency: Currency };

const STORAGE_KEY = "xayez-settings-v1";
export const DEFAULT_SETTINGS: Settings = { agent: "usfans", lang: "pl", currency: "PLN" };

let state: Settings = DEFAULT_SETTINGS;
let loaded = false;
const listeners = new Set<() => void>();

function sanitize(raw: unknown): Settings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Settings>;
  return {
    agent: r.agent && agentsById.has(r.agent) ? r.agent : DEFAULT_SETTINGS.agent,
    lang: languages.some((l) => l.code === r.lang) ? (r.lang as Lang) : DEFAULT_SETTINGS.lang,
    currency: currencies.includes(r.currency as Currency) ? (r.currency as Currency) : DEFAULT_SETTINGS.currency,
  };
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) state = sanitize(JSON.parse(raw));
  } catch {}
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    try {
      state = sanitize(e.newValue ? JSON.parse(e.newValue) : null);
    } catch {
      state = DEFAULT_SETTINGS;
    }
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Aktualne ustawienia poza Reactem, np. w powiadomieniach paczki */
export function getSettings() {
  load();
  return state;
}

export function useSettings() {
  return useSyncExternalStore(subscribe, getSettings, () => DEFAULT_SETTINGS);
}

export function updateSettings(patch: Partial<Settings>) {
  state = sanitize({ ...getSettings(), ...patch });
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
  listeners.forEach((l) => l());
}

export const localeOf = (lang: Lang) => languages.find((l) => l.code === lang)?.locale ?? "pl-PL";
