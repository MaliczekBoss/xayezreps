import "server-only";

import type { Find } from "./finds";
import { site } from "./site";
import { siteUrl } from "./site-url";

// Wiadomość z produktem na kanał Discorda przez webhook (Ustawienia kanału → Integracje → Webhooki).
// Wygląda jak post bota: logo i „xayezreps” nad tytułem, opis, grafika z /api/og, biały pasek
// i dwa przyciski z linkami. Adres webhooka: zmienna DISCORD_WEBHOOK_URL.

const WEBHOOK = /^https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/;

export const discordConfigured = () => WEBHOOK.test(process.env.DISCORD_WEBHOOK_URL ?? "");

const qcLabel = (n: number) => {
  const last = n % 10;
  const teen = n % 100 >= 12 && n % 100 <= 14;
  return `${n} ${n === 1 ? "zdjęcie" : last >= 2 && last <= 4 && !teen ? "zdjęcia" : "zdjęć"} QC z magazynu`;
};

export async function postFindToDiscord(find: Find) {
  const url = process.env.DISCORD_WEBHOOK_URL ?? "";
  if (!WEBHOOK.test(url)) throw new Error("not-configured");

  const productUrl = `${siteUrl}/product/${encodeURIComponent(find.id)}`;
  const price = find.pricePln > 0 ? ` za ${new Intl.NumberFormat("pl-PL").format(Math.round(find.pricePln))} zł` : "";
  const qc = find.qc ? ` ${qcLabel(find.qc)}.` : "";
  const icon = `${siteUrl}/apple-icon`;

  const body = {
    username: "xayezreps",
    avatar_url: icon,
    embeds: [
      {
        author: { name: "xayezreps", url: siteUrl, icon_url: icon },
        title: find.name.slice(0, 250),
        url: productUrl,
        description: `Kup ${find.name}${price}.${qc} Kup przez USFans z kodem **${site.promo.code}**: ${site.promo.coupon} na wysyłkę.`,
        color: 0xffffff,
        image: { url: `${siteUrl}/api/og/${encodeURIComponent(find.id)}` },
      },
    ],
    components: [
      {
        type: 1,
        components: [
          { type: 2, style: 5, label: "Zobacz przedmiot", url: productUrl },
          { type: 2, style: 5, label: "Zobacz inne przedmioty", url: `${siteUrl}/finds?category=${encodeURIComponent(find.category)}` },
        ],
      },
    ],
    allowed_mentions: { parse: [] },
  };

  // with_components: webhook bez aplikacji może wysłać przyciski z linkami
  const res = await fetch(`${url}?wait=true&with_components=true`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`discord-${res.status}`);
}
