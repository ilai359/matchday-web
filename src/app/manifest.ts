import type { MetadataRoute } from "next";

// Next.js picks this file up automatically, serves it at
// /manifest.webmanifest, and links it in the page <head> - no manual
// wiring needed. This is what makes "Add to Home Screen" turn the site
// into something that opens full-screen like a real app instead of a
// browser tab with the address bar showing.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Clubside",
    short_name: "Clubside",
    description: "Never miss what matters.",
    start_url: "/",
    display: "standalone",
    // The app is designed for portrait phone use only - no landscape
    // layouts exist for any page, so tell the OS not to offer landscape.
    orientation: "portrait-primary",
    categories: ["sports", "news"],
    // Matches the dark background used everywhere else in the app
    // (headers, nav bar in dark mode, the new Match Details panel).
    background_color: "#0B0D12",
    theme_color: "#0B0D12",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
