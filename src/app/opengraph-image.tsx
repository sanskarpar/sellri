import { ImageResponse } from "next/og";

export const alt = "Sellri — Premium Social Commerce for Indian Entrepreneurs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
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
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 24,
          }}
        >
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="10" fill="#f68f1d" />
            <path d="M12 20C12 15.6 15.6 12 20 12C24.4 12 28 15.6 28 20" stroke="white" strokeWidth="3" strokeLinecap="round" />
            <circle cx="20" cy="20" r="4" fill="white" />
          </svg>
          <span style={{ fontSize: 32, fontWeight: 700, color: "#f68f1d", letterSpacing: "-0.5" }}>Sellri</span>
        </div>
        <h1
          style={{
            fontSize: 52,
            fontWeight: 800,
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.2,
            maxWidth: 800,
            margin: 0,
            letterSpacing: "-1",
          }}
        >
          Premium Social Commerce for Indian Entrepreneurs
        </h1>
        <p
          style={{
            fontSize: 22,
            color: "rgba(255,255,255,0.6)",
            textAlign: "center",
            maxWidth: 600,
            marginTop: 16,
          }}
        >
          Transform your social media into a professional storefront
        </p>
      </div>
    ),
    { ...size },
  );
}
