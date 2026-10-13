import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

// Wspólne elementy grafik do podglądu linków (Discord, Messenger, X): kroje strony i znak XR

type OgFont = { name: string; data: ArrayBuffer; weight: 400 | 500 | 700; style: "normal" | "italic" };

let fonts: Promise<OgFont[]> | null = null;

const load = async (file: string) => {
  const buf = await readFile(path.join(process.cwd(), "assets", "fonts", file));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
};

/** Geist (tekst) i kursywa Instrument Serif (logo), wczytywane raz na instancję */
export function ogFonts() {
  fonts ??= Promise.all([load("Geist-Medium.ttf"), load("Geist-Bold.ttf"), load("InstrumentSerif-Italic.ttf")]).then(([medium, bold, serif]) => [
    { name: "Geist", data: medium, weight: 500, style: "normal" },
    { name: "Geist", data: bold, weight: 700, style: "normal" },
    { name: "Instrument Serif", data: serif, weight: 400, style: "italic" },
  ]);
  return fonts;
}

/** Znak XR jak w logo strony */
export function OgMark({ size, color = "#ececee" }: { size: number; color?: string }) {
  return (
    <svg width={size} height={(size * 24) / 32} viewBox="0 0 32 24" fill={color}>
      <path d="M3.6 3h5.5l11.5 16.6h-5.5z" />
      <path d="M17.9 12.3h5.4l5.2 7.3h-5.4z" />
      <path d="M2.2 21.6 15.9 4.1h7.6c3 0 4.6 1.6 4.4 3.8-.2 2.4-2.4 4-5.4 4h-4.3" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Logo „xayezreps”: kursywa i pogrubienie jak w nagłówku strony */
export function OgLogo({ size = 30 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.4 }}>
      <OgMark size={size * 1.15} />
      <div style={{ display: "flex", alignItems: "baseline", fontSize: size, lineHeight: 1 }}>
        <span style={{ fontFamily: "Instrument Serif", fontStyle: "italic", fontSize: size * 1.12 }}>xayez</span>
        <span style={{ fontWeight: 700 }}>reps</span>
      </div>
    </div>
  );
}
