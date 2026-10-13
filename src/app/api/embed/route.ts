import { getQcIndex, withQc } from "@/lib/qc-feed";
import { site } from "@/lib/site";
import { getAllFinds, getOutfits } from "@/lib/store";

// Podgląd linku dla Discorda (proxy.ts kieruje tu Discordbota): te same dane co na stronie, ale z białym
// paskiem z lewej (theme-color). Przeglądarki dostają normalną stronę z grafitowym kolorem paska adresu.

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

type Embed = { title: string; description: string; image?: string; large?: boolean };

async function embedFor(pathname: string, origin: string): Promise<Embed> {
  const product = pathname.match(/^\/product\/([^/]+)$/);
  if (product) {
    const [all, qcIndex] = await Promise.all([getAllFinds(), getQcIndex()]);
    const raw = all.find((f) => f.id === decodeURIComponent(product[1]));
    if (raw) {
      const [find] = withQc([raw], qcIndex);
      const price = find.pricePln > 0 ? ` za ${new Intl.NumberFormat("pl-PL").format(Math.round(find.pricePln))} zł` : "";
      const qc = find.qc ? ` Zdjęcia QC z magazynu: ${find.qc}.` : "";
      return {
        title: find.name,
        description: `Kup ${find.name}${price}.${qc} Link do agenta i kalkulator paczki w jednym miejscu.`,
        image: `${origin}/api/og/${encodeURIComponent(find.id)}`,
        large: true,
      };
    }
  }

  const outfit = pathname.match(/^\/outfits\/([^/]+)$/);
  if (outfit) {
    const found = (await getOutfits()).find((o) => o.id === decodeURIComponent(outfit[1]));
    if (found)
      return {
        title: `${found.title} – outfit`,
        description: `${found.parts.length} części z linkami do agentów i zdjęciami QC.`,
        image: found.image ? new URL(found.image, origin).toString() : undefined,
        large: true,
      };
  }

  return { title: "xayezreps – sprawdzone findy z Chin", description: site.description, image: `${origin}/opengraph-image`, large: true };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  // Po przekierowaniu z proxy adres bywa oryginalnym adresem strony, a nie /api/embed?path=…
  const pathname = url.searchParams.get("path") || (url.pathname.startsWith("/api/embed") ? "/" : url.pathname);
  const e = await embedFor(pathname, origin);
  const html = `<!doctype html>
<html lang="pl"><head><meta charset="utf-8">
<title>${esc(e.title)}</title>
<meta name="description" content="${esc(e.description)}">
<meta name="theme-color" content="#ffffff">
<link rel="icon" type="image/png" href="${origin}/apple-icon">
<meta property="og:site_name" content="xayezreps">
<meta property="og:type" content="website">
<meta property="og:url" content="${esc(origin + pathname)}">
<meta property="og:title" content="${esc(e.title)}">
<meta property="og:description" content="${esc(e.description)}">
${e.image ? `<meta property="og:image" content="${esc(e.image)}">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">` : ""}
<meta name="twitter:card" content="${e.large ? "summary_large_image" : "summary"}">
</head><body><a href="${esc(origin + pathname)}">${esc(e.title)}</a></body></html>`;
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=600, s-maxage=3600" },
  });
}
