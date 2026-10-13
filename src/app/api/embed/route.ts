import { getQcIndex, withQc } from "@/lib/qc-feed";
import { site } from "@/lib/site";
import { trustedOrigin } from "@/lib/site-url";
import { getAllFinds, getOutfits } from "@/lib/store";
import { live } from "@/lib/live";

// Podgląd linku dla Discorda (proxy.ts kieruje tu Discordbota). Oprócz zwykłych tagów Open Graph strona daje
// Discordowi gotowy układ (component embed): logo i „xayezreps”, tytuł z linkiem, opis, grafikę, biały pasek
// i przyciski z linkami. Działa przy każdym wklejeniu linku, także w prywatnych wiadomościach, bez bota.
// Specyfikacja: https://docs.discord.com/developers/link-previews/component-embeds

// Tylko zwykłe ścieżki tej strony (bez „//”, „\” i „@”), żeby link w podglądzie nie prowadził nigdzie indziej
const SAFE_PATH = /^\/(?!\/)[\w\-./%]*$/;
// Emoji z logo XR obok „xayezreps” (własne emoji z Discorda: <:nazwa:id>)
const LOGO = process.env.DISCORD_LOGO_EMOJI || "<:logo:1553803460170748095>";
const WHITE = 0xffffff;
// Discord odrzuca cały układ, gdy ma więcej niż 3000 bajtów
const MAX_BYTES = 3000;

const decode = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Nazwy produktów jako zwykły tekst w markdownie Discorda */
const md = (s: string) => s.replace(/([\\`*_~|[\]()<>#])/g, "\\$1");

type Button = { label: string; url: string };
type Embed = { title: string; url: string; description: string; image?: string; buttons: Button[] };

async function embedFor(pathname: string, origin: string): Promise<Embed> {
  const product = pathname.match(/^\/product\/([^/]+)$/);
  if (product) {
    const [all, qcIndex] = await Promise.all([getAllFinds().then(live), getQcIndex()]);
    const raw = all.find((f) => f.id === decode(product[1]));
    if (raw) {
      const [find] = withQc([raw], qcIndex);
      const url = `${origin}/product/${encodeURIComponent(find.id)}`;
      const price = find.pricePln > 0 ? ` za ${new Intl.NumberFormat("pl-PL").format(Math.round(find.pricePln))} zł` : "";
      const qc = find.qc ? ` Zdjęcia QC z magazynu: ${find.qc}.` : "";
      return {
        title: find.name,
        url,
        description: `Kup ${find.name}${price}.${qc} Link do agenta i kalkulator paczki w jednym miejscu.`,
        image: `${origin}/api/og/${encodeURIComponent(find.id)}`,
        buttons: [
          { label: "Zobacz przedmiot", url },
          { label: "Zobacz inne przedmioty", url: `${origin}/finds?category=${encodeURIComponent(find.category)}` },
        ],
      };
    }
  }

  const outfit = pathname.match(/^\/outfits\/([^/]+)$/);
  if (outfit) {
    const found = (await getOutfits()).find((o) => o.id === decode(outfit[1]));
    if (found) {
      const url = `${origin}/outfits/${encodeURIComponent(found.id)}`;
      return {
        title: `${found.title} – outfit`,
        url,
        description: `${found.parts.length} części z linkami do agentów i zdjęciami QC.`,
        image: found.image ? new URL(found.image, origin).toString() : undefined,
        buttons: [
          { label: "Zobacz outfit", url },
          { label: "Zobacz inne outfity", url: `${origin}/outfits` },
        ],
      };
    }
  }

  return {
    title: "xayezreps – sprawdzone findy z Chin",
    url: origin,
    description: site.description,
    image: `${origin}/opengraph-image`,
    buttons: [
      { label: "Przeglądaj findy", url: `${origin}/finds` },
      { label: "Outfity", url: `${origin}/outfits` },
    ],
  };
}

/** Układ dla Discorda jako JSON bezpieczny w <script> (<, >, & i separatory wierszy jako \\uXXXX) */
function componentEmbed(e: Embed) {
  const build = (description: string) =>
    JSON.stringify({
      component: {
        type: 17,
        accent_color: WHITE,
        components: [
          { type: 10, content: `-# ${LOGO} xayezreps` },
          { type: 10, content: `## [${md(e.title)}](${e.url})\n${md(description)}` },
          ...(e.image ? [{ type: 12, items: [{ media: { url: e.image }, description: e.title.slice(0, 200) }] }] : []),
          { type: 1, components: e.buttons.map((b) => ({ type: 2, style: 5, label: b.label, url: b.url })) },
        ],
      },
    }).replace(/[<>&\u2028\u2029]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);

  let json = build(e.description);
  // Za długi opis skracamy, a gdyby i to nie wystarczyło – Discord pokaże zwykły podgląd z Open Graph
  if (Buffer.byteLength(json) > MAX_BYTES) json = build(`${e.description.slice(0, 120)}…`);
  return Buffer.byteLength(json) <= MAX_BYTES ? json : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = trustedOrigin(request);
  // Po przekierowaniu z proxy adres bywa oryginalnym adresem strony, a nie /api/embed?path=…
  const wanted = url.searchParams.get("path") || (url.pathname.startsWith("/api/embed") ? "/" : url.pathname);
  const pathname = SAFE_PATH.test(wanted) ? wanted : "/";
  const e = await embedFor(pathname, origin);
  const component = componentEmbed(e);
  const html = `<!doctype html>
<html lang="pl"><head><meta charset="utf-8">
<title>${esc(e.title)}</title>
<meta name="description" content="${esc(e.description)}">
<meta name="theme-color" content="#ffffff">
<link rel="icon" type="image/png" href="${origin}/apple-icon">
<meta property="og:site_name" content="xayezreps">
<meta property="og:type" content="website">
<meta property="og:url" content="${esc(e.url)}">
<meta property="og:title" content="${esc(e.title)}">
<meta property="og:description" content="${esc(e.description)}">
${e.image ? `<meta property="og:image" content="${esc(e.image)}">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">` : ""}
<meta name="twitter:card" content="summary_large_image">
${component ? `<script id="discord:component-embed" type="application/json">${component}</script>` : ""}
</head><body><a href="${esc(e.url)}">${esc(e.title)}</a></body></html>`;
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=600, s-maxage=3600" },
  });
}
