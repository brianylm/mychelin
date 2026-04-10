const CACHE_NAME = "mychelin-v2";
const OFFLINE_CACHE = "mychelin-offline-v2";

// Core app shell assets to cache on install
const STATIC_ASSETS = [
  "/offline.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((error) => {
        console.error("Failed to cache static assets:", error);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== OFFLINE_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and extension requests
  if (request.method !== "GET" || request.url.includes("chrome-extension://")) {
    return;
  }

  // ALWAYS bypass service worker for API routes — must go to network
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Handle navigation requests (HTML pages) with offline fallback
  if (request.mode === "navigate" || request.headers.get("Accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If successful, cache the response
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Network failed, try cache first, then offline fallback
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            return caches.match("/offline.html");
          });
        })
    );
    return;
  }

  // Handle static assets (JS, CSS, images) - cache first with network fallback
  if (request.url.includes("/_next/") || request.url.includes("/icons/") || /\.(js|css|woff2?|png|jpg|jpeg|gif|svg|ico)$/.test(request.url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => {
            // If it's a critical asset and we can't fetch it, return a placeholder response
            return new Response("", { status: 404 });
          });
      })
    );
    return;
  }

  // For everything else, try network first, then cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
