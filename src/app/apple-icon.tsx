import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Znak XR na grafitowym tle – ikona po dodaniu strony do ekranu głównego */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#111112" }}>
        <svg width="112" height="84" viewBox="0 0 32 24" fill="#ececee">
          <path d="M3.6 3h5.5l11.5 16.6h-5.5z" />
          <path d="M17.9 12.3h5.4l5.2 7.3h-5.4z" />
          <path
            d="M2.2 21.6 15.9 4.1h7.6c3 0 4.6 1.6 4.4 3.8-.2 2.4-2.4 4-5.4 4h-4.3"
            fill="none"
            stroke="#ececee"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    size,
  );
}
