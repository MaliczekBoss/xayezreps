// Reguły statystyk wspólne dla przeglądarki i serwera: źródła ruchu, ścieżki, agenci.

export type SourceId =
  | "google"
  | "bing"
  | "duckduckgo"
  | "facebook"
  | "instagram"
  | "tiktok"
  | "discord"
  | "youtube"
  | "reddit"
  | "x"
  | "telegram"
  | "direct"
  | "other";

export const sources: Record<SourceId, { label: string; color: string; mark: string }> = {
  google: { label: "Google", color: "#ffffff", mark: "G" },
  bing: { label: "Bing", color: "#2b7de9", mark: "b" },
  duckduckgo: { label: "DuckDuckGo", color: "#de5833", mark: "D" },
  facebook: { label: "Facebook", color: "#1877f2", mark: "f" },
  instagram: { label: "Instagram", color: "#e1306c", mark: "I" },
  tiktok: { label: "TikTok", color: "#25f4ee", mark: "T" },
  discord: { label: "Discord", color: "#5865f2", mark: "D" },
  youtube: { label: "YouTube", color: "#ff0000", mark: "▶" },
  reddit: { label: "Reddit", color: "#ff4500", mark: "r" },
  x: { label: "X", color: "#e7e9ea", mark: "X" },
  telegram: { label: "Telegram", color: "#2aabee", mark: "t" },
  direct: { label: "Bezpośrednio", color: "#8f8f94", mark: "→" },
  other: { label: "Inne strony", color: "#5f5f66", mark: "…" },
};

export const isSource = (v: unknown): v is SourceId => typeof v === "string" && v in sources;

const HOSTS: [SourceId, RegExp][] = [
  ["google", /(^|\.)google\.[a-z.]+$/],
  ["bing", /(^|\.)bing\.com$/],
  ["duckduckgo", /(^|\.)duckduckgo\.com$/],
  ["facebook", /(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$/],
  ["instagram", /(^|\.)instagram\.com$/],
  ["tiktok", /(^|\.)tiktok\.com$/],
  ["discord", /(^|\.)(discord\.com|discord\.gg|discordapp\.com)$/],
  ["youtube", /(^|\.)(youtube\.com|youtu\.be)$/],
  ["reddit", /(^|\.)reddit\.com$/],
  ["x", /(^|\.)(twitter\.com|x\.com|t\.co)$/],
  ["telegram", /(^|\.)(t\.me|telegram\.org)$/],
];

/** Skąd przyszła sesja: najpierw utm_source, potem domena z document.referrer */
export function classifySource(referrer: string, utm: string | null, ownHost: string): SourceId {
  const tag = utm?.trim().toLowerCase();
  if (tag) {
    if (isSource(tag)) return tag;
    const fromTag = HOSTS.find(([id]) => tag.includes(id))?.[0];
    if (fromTag) return fromTag;
    if (tag === "fb" || tag === "ig") return tag === "fb" ? "facebook" : "instagram";
  }
  if (!referrer) return "direct";
  let host = "";
  try {
    host = new URL(referrer).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "direct";
  }
  if (!host || host === ownHost.replace(/^www\./, "")) return "direct";
  return HOSTS.find(([, re]) => re.test(host))?.[0] ?? "other";
}

// Ścieżki, które liczymy osobno; wszystko inne trafia do „/inne”, żeby nikt nie zaśmiecił statystyk
const PATHS = /^\/(?:finds|tools(?:\/(?:link|qc|tracking|ship|photo))?|sellers(?:\/[a-z0-9-]{1,60})?|tutorial|product\/[a-z0-9-]{1,40})?$/i;

export function normalizePath(path: string) {
  const clean = (path.split(/[?#]/)[0] || "/").replace(/\/+$/, "") || "/";
  return PATHS.test(clean) ? clean.toLowerCase() : "/inne";
}

export const AGENT_HOSTS: [string, RegExp][] = [
  ["usfans", /(^|\.)usfans\.com$/],
  ["kakobuy", /(^|\.)kakobuy\.com$/],
  ["litbuy", /(^|\.)litbuy\.com$/],
  ["oopbuy", /(^|\.)oopbuy\.com$/],
];

export const SESSION_ID = /^[a-z0-9]{8,24}$/;
