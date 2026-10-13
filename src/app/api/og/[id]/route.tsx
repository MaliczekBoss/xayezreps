import { ImageResponse } from "next/og";
import sharp from "sharp";
import { OgLogo, ogFonts } from "@/lib/og";
import { getQcIndex, withQc } from "@/lib/qc-feed";
import { site } from "@/lib/site";
import { getAllFinds } from "@/lib/store";

const BATCH_DOT: Record<string, string> = { "Best batch": "#10b981", "Budget batch": "#fbbf24" };

const qcLabel = (n: number) => {
  const last = n % 10;
  const teen = n % 100 >= 12 && n % 100 <= 14;
  return `${n} ${n === 1 ? "zdjęcie" : last >= 2 && last <= 4 && !teen ? "zdjęcia" : "zdjęć"} QC`;
};

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

/** Zdjęcie produktu jako PNG (Satori nie czyta WEBP), przycięte do samego produktu, żeby cień trafił pod spód */
async function productPng(image: string, origin: string) {
  if (!image) return null;
  try {
    const res = await fetch(new URL(image, origin), { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const trimmed = await sharp(Buffer.from(await res.arrayBuffer())).trim({ threshold: 1 }).toBuffer();
    const { data, info } = await sharp(trimmed).resize(470, 420, { fit: "inside" }).png().toBuffer({ resolveWithObject: true });
    return { src: `data:image/png;base64,${data.toString("base64")}`, width: info.width, height: info.height };
  } catch {
    return null;
  }
}

/** Grafika do podglądu linku produktu (1200×630): produkt bez tła, nazwa, cena, zdjęcia QC i kod USFans */
export async function GET(request: Request, ctx: RouteContext<"/api/og/[id]">) {
  const { id } = await ctx.params;
  const [all, qcIndex, fonts] = await Promise.all([getAllFinds(), getQcIndex(), ogFonts()]);
  const raw = all.find((f) => f.id === id);
  if (!raw) return new Response("Nie ma takiego produktu", { status: 404 });
  const [find] = withQc([raw], qcIndex);
  const photo = await productPng(find.image, new URL(request.url).origin);
  const qc = find.qc ?? 0;
  const name = clip(find.name, 64);
  const dot = BATCH_DOT[find.batch];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#111112", color: "#ececee", fontFamily: "Geist" }}>
        {/* Produkt na grafitowym tle z delikatnym światłem i cieniem pod spodem */}
        <div
          style={{
            width: 600,
            height: 630,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            backgroundImage: "radial-gradient(circle at 50% 46%, #2c2c33 0%, #1a1a1e 40%, #111112 72%)",
          }}
        >
          {photo ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- grafika renderowana przez Satori, nie w przeglądarce */}
              <img src={photo.src} width={photo.width} height={photo.height} alt="" />
              {/* Cień tuż pod produktem */}
              <div
                style={{
                  marginTop: -18,
                  width: Math.max(160, photo.width * 0.85),
                  height: 44,
                  backgroundImage: "radial-gradient(ellipse at center, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 70%)",
                }}
              />
            </div>
          ) : (
            <OgLogo size={44} />
          )}
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "58px 64px 56px 20px" }}>
          <OgLogo size={30} />

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ display: "flex", padding: "8px 18px", borderRadius: 999, border: "1.5px solid #333338", fontSize: 22, color: "#a1a1a7" }}>{find.category}</div>
              {dot && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 18px", borderRadius: 999, border: "1.5px solid #333338", fontSize: 22, color: "#a1a1a7" }}>
                  <div style={{ width: 10, height: 10, borderRadius: 999, background: dot }} />
                  {find.batch}
                </div>
              )}
            </div>
            <div style={{ display: "flex", marginTop: 24, fontSize: name.length > 34 ? 50 : 60, fontWeight: 700, lineHeight: 1.06, letterSpacing: -1.6 }}>{name}</div>
            {find.pricePln > 0 && (
              <div style={{ display: "flex", marginTop: 22, fontSize: 88, fontWeight: 700, letterSpacing: -3, lineHeight: 1 }}>
                {`${new Intl.NumberFormat("pl-PL").format(Math.round(find.pricePln))} zł`}
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {qc > 0 && (
              <div style={{ display: "flex", flexShrink: 0, alignItems: "center", gap: 10, padding: "12px 20px", borderRadius: 999, background: "rgba(16,185,129,0.14)", color: "#34d399", fontSize: 23, fontWeight: 500, whiteSpace: "nowrap" }}>
                <div style={{ width: 10, height: 10, borderRadius: 999, background: "#10b981" }} />
                {qcLabel(qc)}
              </div>
            )}
            <div style={{ display: "flex", flexShrink: 0, padding: "12px 22px", borderRadius: 999, background: "#ececee", color: "#111112", fontSize: 23, fontWeight: 700, whiteSpace: "nowrap" }}>
              {`${site.promo.coupon} z kodem ${site.promo.code}`}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts,
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800" },
    },
  );
}
