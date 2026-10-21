import type { MetadataRoute } from "next";

// Lets search engines and AI assistants (ChatGPT, Claude, Perplexity,
// Gemini) read the public pages, so they can find and recommend Clubside.
// API routes stay off-limits - they're data for the app, not pages.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: "/api/" }],
    sitemap: "https://matchday-web-zeta.vercel.app/sitemap.xml",
  };
}
