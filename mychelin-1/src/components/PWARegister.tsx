"use client";

import { useEffect } from "react";

export function PWARegister() {
  useEffect(() => {
    // Service worker disabled — it was intercepting requests and causing
    // the login flow to hang. Actively unregister any existing SWs and
    // clear all caches so clients with a stale SW get unblocked.
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister().catch(() => {});
      });
    });

    if ("caches" in window) {
      caches.keys().then((keys) => {
        keys.forEach((key) => caches.delete(key).catch(() => {}));
      });
    }
  }, []);

  return null;
}
