// Wszystko, co trzeba podmienić przed startem strony, jest w tym pliku
// i w src/lib/finds.ts (produkty) oraz src/lib/qc-feed.ts (ostatnie QC).

export const site = {
  name: "xayezreps.pl",
  domain: "xayezreps.pl",
  url: "https://xayezreps.pl",
  description:
    "Najlepsze repy z Chin w jednym miejscu: sprawdzone findy, zdjęcia QC, konwerter linków, śledzenie paczek i kalkulator wysyłki do Polski.",
  tagline: "Nowe findy każdego dnia",
  buyers: "11 000+",
  ticketReplyTime: "poniżej 9 minut",

  socials: {
    discord: "https://discord.gg/xayez",
  },

  // Oferta partnerska zawsze dotyczy USFans
  partner: {
    name: "USFans",
    signupUrl: "https://www.usfans.com/register?ref=xayez",
  },

  promo: {
    code: "xayez67",
    headline: "Zapłać za 10 kg tylko 350 zł",
    coupon: "−40%",
  },

  // Podstrony serwisu
  routes: {
    finds: "/finds",
    tools: "/tools",
    sellers: "/sellers",
    tutorial: "/tutorial",
    linkConverter: "/tools/link",
    tracking: "/tools/tracking",
    qcFinder: "/tools/qc",
    photoSearch: "/tools/photo",
    shipCalculator: "/tools/ship",
    product: (id: string) => `/product/${id}`,
    seller: (slug: string) => `/sellers/${slug}`,
  },
} as const;

// Kalkulator paczki – kwoty orientacyjne w złotówkach. Zaktualizuj, gdy agent zmieni cennik.
export const pricing = {
  // Dostawa od sprzedawcy do magazynu agenta, za każdy przedmiot
  domesticPlnPerItem: 7,
  // Karton i wypełnienie: 10% wagi, nie mniej niż 200 g
  packagingRatio: 0.1,
  packagingMinGrams: 200,
  // Linie liczą wysyłkę w krokach po 500 g
  stepGrams: 500,
  lines: [
    { id: "standard", name: "EU Standard", days: { from: 12, to: 18 }, firstStepPln: 40, nextStepPln: 20 },
    { id: "express", name: "EU Express", days: { from: 7, to: 12 }, firstStepPln: 65, nextStepPln: 30 },
  ],
} as const;

export type ShippingLineId = (typeof pricing.lines)[number]["id"];
