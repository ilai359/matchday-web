"use client";

import { useEffect } from "react";

// Registers the service worker (public/sw.js) once the app loads in a
// browser. A no-op on browsers that don't support it (e.g. older
// Safari) or during server-side rendering, where `navigator` doesn't
// exist at all.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failing (e.g. dev server quirks, private browsing)
      // just means no offline caching this visit - the app still works
      // normally over the network either way.
    });
  }, []);

  return null;
}
