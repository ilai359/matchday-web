// Clubside's service worker.
//
// Job, and only job: make repeat visits faster by caching the app's own
// static files (its built JS/CSS, icons, fonts) so they load instantly
// from the phone instead of over the network every time.
//
// Deliberately does NOT touch anything under /api/ - match scores,
// standings, fixtures, news all keep going straight to the network, every
// time, exactly like today. Those are the one thing this file is written
// to never cache, so a stale or missing league table (the bug fixed
// earlier this project) can't happen again because of this.

const CACHE_NAME = "clubside-static-v1";

// Only ever cache same-origin GET requests for the app's own built
// assets and icons - never API calls, never other origins.
function isCacheable(request) {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/api/")) return false;
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/brand/") ||
    /\.(?:png|jpg|jpeg|svg|webp|ico|woff2?)$/.test(url.pathname)
  );
}

self.addEventListener("install", () => {
  // Activate this version immediately instead of waiting for every open
  // tab to close first.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop any caches from a previous version of this file.
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (!isCacheable(request)) {
    // Not a static asset we handle - let the browser do its normal
    // network request, untouched. This is the path every /api/ call and
    // every page navigation takes.
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;

      const response = await fetch(request);
      // Next.js fingerprints these filenames with a content hash, so a
      // given URL's content never changes - safe to cache indefinitely.
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })()
  );
});
