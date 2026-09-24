"use client";

import { useEffect } from "react";

// Next.js's file convention for the rare case where the root layout
// itself fails to render - it replaces the whole page (including
// html/body), so it can't reuse the app's normal Tailwind-styled
// components the way error.tsx does. Kept intentionally simple and
// inline-styled so it still renders even if something more fundamental
// broke. Same console logging as error.tsx, for diagnosability.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          margin: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "20px",
          padding: "20px",
          textAlign: "center",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          backgroundColor: "#0B0D12",
          color: "#ffffff",
        }}
      >
        <div style={{ fontSize: "28px" }}>⚠️</div>
        <h1 style={{ fontSize: "18px", fontWeight: 900, margin: 0 }}>
          Something went wrong
        </h1>
        <p
          style={{
            maxWidth: "280px",
            fontSize: "14px",
            color: "#A1A1AA",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Clubside hit a snag loading. Give it another try.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            borderRadius: "16px",
            backgroundColor: "#ffffff",
            color: "#111318",
            padding: "12px 24px",
            fontSize: "14px",
            fontWeight: 900,
            border: "none",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
