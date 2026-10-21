import type { MetadataRoute } from "next";

// The public pages we want search engines and AI assistants to know about.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://matchday-web-zeta.vercel.app";
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/support`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
