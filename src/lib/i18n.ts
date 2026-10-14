"use client";

import { dictionaries, type DictKey, type Plural } from "./dict";
import { getSettings, localeOf, useSettings, type Lang } from "./settings";

type Vars = Record<string, string | number>;

const fill = (text: string, vars?: Vars) =>
  vars ? text.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`)) : text;

export function translate(lang: Lang, key: DictKey, vars?: Vars): string {
  const entry = dictionaries[lang][key] ?? dictionaries.en[key] ?? dictionaries.pl[key];
  if (typeof entry === "string") return fill(entry, vars);
  const n = Number(vars?.n ?? 0);
  const rule = new Intl.PluralRules(localeOf(lang)).select(n) as keyof Plural;
  return fill(entry[rule] ?? entry.other, vars);
}

export const tNow = (key: DictKey, vars?: Vars) => translate(getSettings().lang, key, vars);

export function useT() {
  const { lang } = useSettings();
  return (key: DictKey, vars?: Vars) => translate(lang, key, vars);
}

export function categoryKey(category: string): DictKey | null {
  const key = `cat.${category}` as DictKey;
  return key in dictionaries.pl ? key : null;
}
