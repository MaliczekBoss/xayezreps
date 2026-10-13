// Bot xayezreps na Discorda: gdy ktoś wyśle link do produktu ze strony, bot odpowiada wiadomością
// z logo, opisem, grafiką produktu, białym paskiem i przyciskami „Zobacz przedmiot” / „Zobacz inne przedmioty”,
// a zwykły podgląd linku pod wiadomością ukrywa (gdy ma uprawnienie „Zarządzanie wiadomościami”).
// Uruchom: npm start (w folderze bot, z plikiem .env – patrz .env.example i README.md).

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, EmbedBuilder, Events, GatewayIntentBits } from "discord.js";

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const SITE = (process.env.SITE_URL || "https://xayezreps.vercel.app").replace(/\/$/, "");
const PROMO = { code: process.env.PROMO_CODE || "xayez67", coupon: process.env.PROMO_COUPON || "−40%" };
// Na jakich domenach szukamy linków do produktów: adres strony i ewentualne dodatkowe (np. własna domena)
const HOSTS = new Set([new URL(SITE).host, ...(process.env.EXTRA_HOSTS || "").split(",").map((h) => h.trim().toLowerCase()).filter(Boolean)]);
const PRODUCT_LINK = /https?:\/\/(?:www\.)?([a-z0-9.-]+)\/product\/([\w-]+)/gi;
// Najwyżej tyle produktów z jednej wiadomości, żeby bot nie zasypał kanału
const MAX_PER_MESSAGE = 3;

if (!TOKEN) {
  console.error("Brak DISCORD_BOT_TOKEN w pliku .env (patrz README.md).");
  process.exit(1);
}

const qcLabel = (n) => {
  const last = n % 10;
  const teen = n % 100 >= 12 && n % 100 <= 14;
  return `${n} ${n === 1 ? "zdjęcie" : last >= 2 && last <= 4 && !teen ? "zdjęcia" : "zdjęć"} QC z magazynu`;
};

/** Produkty ze strony (to samo API, którego używają ulubione) */
async function fetchFinds(ids) {
  const res = await fetch(`${SITE}/api/finds?ids=${ids.map(encodeURIComponent).join(",")}`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return (await res.json()).items ?? [];
}

function messageFor(find) {
  const productUrl = `${SITE}/product/${encodeURIComponent(find.id)}`;
  const price = find.pricePln > 0 ? ` za ${new Intl.NumberFormat("pl-PL").format(Math.round(find.pricePln))} zł` : "";
  const qc = find.qc ? ` ${qcLabel(find.qc)}.` : "";
  const embed = new EmbedBuilder()
    .setAuthor({ name: "xayezreps", url: SITE, iconURL: `${SITE}/apple-icon` })
    .setTitle(find.name.slice(0, 250))
    .setURL(productUrl)
    .setDescription(`Kup ${find.name}${price}.${qc} Przez USFans z kodem **${PROMO.code}**: ${PROMO.coupon} na wysyłkę.`)
    .setColor(0xffffff)
    .setImage(`${SITE}/api/og/${encodeURIComponent(find.id)}`);
  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Zobacz przedmiot").setURL(productUrl),
    new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel("Zobacz inne przedmioty")
      .setURL(`${SITE}/finds?category=${encodeURIComponent(find.category)}`),
  );
  return { embeds: [embed], components: [buttons] };
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once(Events.ClientReady, (c) => {
  console.log(`Bot działa jako ${c.user.tag}. Szukam linków do produktów z: ${[...HOSTS].join(", ")}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.content) return;
  const ids = [
    ...new Set(
      [...message.content.matchAll(PRODUCT_LINK)].filter(([, host]) => HOSTS.has(host.toLowerCase())).map(([, , id]) => id),
    ),
  ].slice(0, MAX_PER_MESSAGE);
  if (ids.length === 0) return;

  try {
    const finds = await fetchFinds(ids);
    if (finds.length === 0) return;
    for (const find of finds) {
      await message.reply({ ...messageFor(find), allowedMentions: { repliedUser: false } });
    }
    // Zwykły podgląd linku byłby powtórzeniem – ukrywamy go (potrzebne uprawnienie „Zarządzanie wiadomościami”)
    await message.suppressEmbeds(true).catch(() => {});
  } catch (error) {
    console.error("Nie udało się odpowiedzieć na link:", error.message);
  }
});

client.login(TOKEN);
