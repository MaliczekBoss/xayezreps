"use client";

import { useEffect } from "react";
import type { DictKey } from "@/lib/dict";
import { notify } from "@/lib/notify";
import { islandPromos, site } from "@/lib/site";
import { formatNow } from "@/lib/use-format";

const STORE_KEY = "xayez-island-promo-v1";
const SESSION_KEY = "xayez-island-promo-shown";
const FIRST_DELAY_MS = 25_000;
const EVERY_MS = 3 * 60_000;
const MAX_PER_VISIT = 3;
const HIDE_AFTER_CLOSE_MS = 24 * 60 * 60_000;
const HIDE_AFTER_CLICK_MS = 7 * 24 * 60 * 60_000;
const SHOW_FOR_MS = 10_000;

type Saved = { hiddenUntil: number; next: number };

function read(): Saved {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) ?? "null");
    if (s && typeof s.hiddenUntil === "number" && typeof s.next === "number") return s;
  } catch {}
  return { hiddenUntil: 0, next: 0 };
}

function write(s: Saved) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  } catch {}
}

function shownThisVisit() {
  try {
    return Number(sessionStorage.getItem(SESSION_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function IslandPromos() {
  useEffect(() => {
    const show = () => {
      if (location.pathname.startsWith("/admin")) return;
      const saved = read();
      if (Date.now() < saved.hiddenUntil || document.visibilityState !== "visible") return;
      if (shownThisVisit() >= MAX_PER_VISIT) return;
      if (document.querySelector("dialog[open]")) return;

      const promo = islandPromos[saved.next % islandPromos.length];
      write({ ...saved, next: saved.next + 1 });
      try {
        sessionStorage.setItem(SESSION_KEY, String(shownThisVisit() + 1));
      } catch {}

      const { t } = formatNow();
      notify({
        tone: "brand",
        image: promo.logo,
        logo: true,
        title: t(`island.${promo.id}Title` as DictKey),
        text: t(`island.${promo.id}Text` as DictKey, { code: site.promo.code }),
        duration: SHOW_FOR_MS,
        action: {
          label: t("island.try", { agent: promo.name }),
          href: promo.url,
          external: true,
          onClick: () => write({ ...read(), hiddenUntil: Date.now() + HIDE_AFTER_CLICK_MS }),
        },
        onDismiss: () => write({ ...read(), hiddenUntil: Date.now() + HIDE_AFTER_CLOSE_MS }),
      });
    };

    const first = window.setTimeout(show, FIRST_DELAY_MS);
    const every = window.setInterval(show, EVERY_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(every);
    };
  }, []);

  return null;
}
