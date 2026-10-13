// Agenci zakupowi i budowanie linków do produktów.
// Formaty i kody polecające są takie jak w konwerterze na xayezreps.com.

export type Platform = "weidian" | "taobao" | "1688";

export type ProductSource = { platform: Platform; id: string };

export type AgentId = "usfans" | "kakobuy" | "litbuy" | "oopbuy";

export type Agent = {
  id: AgentId;
  name: string;
  logo: string;
  /** Link rejestracyjny z kodem polecającym */
  signupUrl: string;
  productUrl: (source: ProductSource) => string;
};

/** Oryginalny link do produktu w sklepie */
export const sourceUrl = ({ platform, id }: ProductSource) => {
  if (platform === "weidian") return `https://weidian.com/item.html?itemID=${id}`;
  if (platform === "taobao") return `https://item.taobao.com/item.htm?id=${id}`;
  return `https://detail.1688.com/offer/${id}.html`;
};

const USFANS_PLATFORM: Record<Platform, number> = { "1688": 1, taobao: 2, weidian: 3 };

export const agents: Agent[] = [
  {
    id: "usfans",
    name: "USFans",
    logo: "/agents/usfans.png",
    signupUrl: "https://www.usfans.com/register?ref=xayez",
    productUrl: (s) => `https://www.usfans.com/product/${USFANS_PLATFORM[s.platform]}/${s.id}?ref=xayez`,
  },
  {
    id: "kakobuy",
    name: "Kakobuy",
    logo: "/agents/kakobuy.png",
    signupUrl: "https://www.kakobuy.com/register/?affcode=xayezik",
    productUrl: (s) => `https://kakobuy.com/item/details?url=${encodeURIComponent(sourceUrl(s))}&affcode=xayezik`,
  },
  {
    id: "litbuy",
    name: "Litbuy",
    logo: "/agents/litbuy.png",
    signupUrl: "https://litbuy.com/register?inviteCode=TDKBOD8PW",
    productUrl: (s) => `https://litbuy.com/product/${s.platform}/${s.id}?inviteCode=TDKBOD8PW`,
  },
  {
    id: "oopbuy",
    name: "Oopbuy",
    logo: "/agents/oopbuy.png",
    signupUrl: "https://oopbuy.com/",
    productUrl: (s) => `https://oopbuy.com/product/${s.platform === "1688" ? "1688" : s.platform.toUpperCase()}/${s.id}`,
  },
];

export const agentsById = new Map(agents.map((a) => [a.id, a]));

export const getAgent = (id: string) => agentsById.get(id as AgentId) ?? agents[0];

export const platformLabel: Record<Platform, string> = { weidian: "Weidian", taobao: "Taobao", "1688": "1688" };

function toUrl(input: string) {
  try {
    return new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
  } catch {
    return null;
  }
}

const PLATFORM_ALIASES: Record<string, Platform> = {
  weidian: "weidian",
  wd: "weidian",
  "3": "weidian",
  taobao: "taobao",
  tb: "taobao",
  tmall: "taobao",
  "2": "taobao",
  "1688": "1688",
  ali: "1688",
  "1": "1688",
};

/**
 * Rozpoznaje produkt z linku Weidiana, Taobao, 1688 albo z linku agenta
 * (USFans, Kakobuy, Litbuy, Oopbuy, ACbuy, Mulebuy).
 */
export function parseSource(raw: string): ProductSource | null {
  const url = toUrl(raw.trim());
  if (!url) return null;
  const host = url.hostname.replace(/^www\./, "");
  const q = url.searchParams;

  if (host.endsWith("weidian.com")) {
    const id = q.get("itemID") ?? q.get("itemId") ?? q.get("itemid");
    return id && /^\d+$/.test(id) ? { platform: "weidian", id } : null;
  }
  if (host.endsWith("taobao.com") || host.endsWith("tmall.com")) {
    const id = q.get("id");
    return id && /^\d+$/.test(id) ? { platform: "taobao", id } : null;
  }
  if (host.endsWith("1688.com")) {
    const m = url.pathname.match(/offer\/(\d+)/);
    return m ? { platform: "1688", id: m[1] } : null;
  }

  // Linki agentów
  if (host.endsWith("kakobuy.com")) {
    const inner = q.get("url");
    return inner ? parseSource(inner) : null;
  }
  const path = url.pathname.match(/product\/([\w]+)\/(\d+)/i);
  if (path && (host.endsWith("usfans.com") || host.endsWith("litbuy.com") || host.endsWith("oopbuy.com"))) {
    const platform = PLATFORM_ALIASES[path[1].toLowerCase()];
    return platform ? { platform, id: path[2] } : null;
  }
  const id = q.get("id");
  const p = (q.get("platform") ?? q.get("source") ?? q.get("shop_type") ?? "").toLowerCase();
  if (id && /^\d+$/.test(id) && PLATFORM_ALIASES[p]) return { platform: PLATFORM_ALIASES[p], id };

  return null;
}
