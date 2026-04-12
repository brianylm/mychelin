"use client";

import { useEffect } from "react";

// Registers the service worker on mount. The SW handles:
//  - App shell caching (HTML, JS, CSS, icons) for fast loads / offline
//  - Network-only for /api/* (never caches authed/dynamic responses)
//  - Network-first for everything else (images, blobs)
//
// On new deploys the SW file changes (CACHE_VERSION bumps), which
// triggers the browser's built-in update flow: install new SW → activate
// → old caches pruned. clients.claim() in the SW means the new version
// takes over immediately without needing a page reload.
export function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        // Check for updates every 30 minutes while the app is open.
        // This catches deploy-time SW changes even if the user never
        // hard-refreshes.
        const interval = setInterval(() => {
          registration.update().catch(() => {});
        }, 30 * 60 * 1000);

        return () => clearInterval(interval);
      })
      .catch((err) => {
        console.warn("SW registration failed:", err);
      });
  }, []);

  return null;
}
