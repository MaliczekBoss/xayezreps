import { ImageResponse } from "next/og";

export const alt = "xayezreps.pl – najlepsze repy z Chin w jednym miejscu";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 12% 0%, #2563eb 0%, #0b1a3d 28%, #04060b 60%)",
          color: "#fff",
        }}
      >
        <svg width="168" height="126" viewBox="0 0 32 24" fill="#fff">
          <path d="M3.6 3h5.5l11.5 16.6h-5.5z" />
          <path d="M17.9 12.3h5.4l5.2 7.3h-5.4z" />
          <path
            d="M2.2 21.6 15.9 4.1h7.6c3 0 4.6 1.6 4.4 3.8-.2 2.4-2.4 4-5.4 4h-4.3"
            fill="none"
            stroke="#fff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div style={{ marginTop: 40, fontSize: 112, fontWeight: 700, letterSpacing: -5, display: "flex" }}>
          xayezreps<span style={{ color: "rgba(255,255,255,0.4)" }}>.pl</span>
        </div>
        <div style={{ marginTop: 18, fontSize: 38, color: "rgba(255,255,255,0.6)" }}>
          Najlepsze repy z Chin w jednym miejscu
        </div>
        <div
          style={{
            marginTop: 44,
            padding: "16px 34px",
            borderRadius: 999,
            background: "#3b82f6",
            fontSize: 30,
            fontWeight: 700,
          }}
        >
          Findy, QC i kalkulator paczki
        </div>
      </div>
    ),
    size,
  );
}
