export const site = {
  name: "xayezreps.pl",
  domain: "xayezreps.pl",
  url: "https://xayezreps.pl",
  description:
    "Sprawdzone findy z Chin z linkami do agentów i zdjęciami QC. Do tego konwerter linków, tracking paczek i kalkulator wysyłki do Polski.",
  tagline: "Nowe findy każdego dnia",
  buyers: "11 000+",
  ticketReplyTime: "poniżej 9 minut",

  socials: {
    discord: "https://discord.gg/xayez",
  },

  partner: {
    name: "USFans",
    signupUrl: "https://www.usfans.com/register?ref=xayez",
  },

  promo: {
    code: "xayez",
    headline: "Zapłać za 10 kg tylko 350 zł",
    coupon: "−40%",
  },

  routes: {
    finds: "/finds",
    tools: "/tools",
    sellers: "/sellers",
    tutorial: "/tutorial",
    linkConverter: "/tools/link",
    tracking: "/tools/tracking",
    qcFinder: "/tools/qc",
    photoSearch: "/tools/photo",
    favorites: "/favorites",
    outfits: "/outfits",
    outfit: (id: string) => `/outfits/${id}`,
    shipCalculator: "/tools/ship",
    product: (id: string) => `/product/${id}`,
    seller: (slug: string) => `/sellers/${slug}`,
  },
} as const;

export const islandPromos = [
  { id: "usfans", name: "USFans", logo: "/agents/usfans.png", url: "https://www.usfans.com/register?ref=xayez" },
] as const;

export const pricing = {
  domesticPlnPerItem: 7,
  packagingRatio: 0.1,
  packagingMinGrams: 200,
  stepGrams: 500,
  lines: [
    { id: "standard", name: "EU Standard", days: { from: 12, to: 18 }, firstStepPln: 40, nextStepPln: 20 },
    { id: "express", name: "EU Express", days: { from: 7, to: 12 }, firstStepPln: 65, nextStepPln: 30 },
  ],
} as const;

export type ShippingLineId = (typeof pricing.lines)[number]["id"];
