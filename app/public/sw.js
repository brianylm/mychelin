// Mychelin Service Worker — v1
//
// Strategy:
//  - App shell (HTML, JS, CSS, fonts, icons): cache-first with network
//    fallback. Cache is keyed by CACHE_VERSION so every deploy busts
//    stale assets.
//  - /api/* routes: network-only. NEVER cache API responses — these are
//    dynamic + authed. Caching them caused the login hang that forced
//    us to kill the previous SW.
//  - Everything else (images, blobs, third-party): network-first with
//    cache fallback for offline resilience.
//
// On activate, old versioned caches are pruned.

const CACHE_VERSION = "mychelin-v11";
const APP_SHELL_CACHE = CACHE_VERSION + "-shell";
const DYNAMIC_CACHE = CACHE_VERSION + "-dynamic";

// Pre-cached on install for instant offline loads. Keep minimal —
// Next.js chunk URLs are hashed and cached on first fetch at runtime.
var PRECACHE_URLS = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// ─── Install ───────────────────────────────────────────────
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches
      .open(APP_SHELL_CACHE)
      .then(function (cache) {
        return cache.addAll(PRECACHE_URLS).catch(function (err) {
          console.warn("SW precache partial failure:", err);
        });
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

// ─── Activate ──────────────────────────────────────────────
// Delete caches from previous versions.
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (key) {
              return !key.startsWith(CACHE_VERSION);
            })
            .map(function (key) {
              return caches.delete(key);
            })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

// ─── Fetch ─────────────────────────────────────────────────
self.addEventListener("fetch", function (event) {
  var url = new URL(event.request.url);

  // Skip non-GET requests — POST/PATCH/DELETE always go to network.
  if (event.request.method !== "GET") return;

  // API routes → network only, never cache.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/api")) {
    return;
  }

  // Same-origin navigation (HTML pages) → network first so deploys
  // are picked up immediately, fall back to cache for offline.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(function (response) {
          var clone = response.clone();
          caches.open(APP_SHELL_CACHE).then(function (cache) {
            cache.put(event.request, clone);
          });
          return response;
        })
        .catch(function () {
          return caches.match(event.request).then(function (cached) {
            return cached || caches.match("/");
          });
        })
    );
    return;
  }

  // Static assets (JS, CSS, images, fonts) → cache first, network
  // fallback. Next.js hashes chunk filenames so once cached they're
  // immutable until the next deploy bumps CACHE_VERSION.
  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".svg")
  ) {
    event.respondWith(
      caches.match(event.request).then(function (cached) {
        if (cached) return cached;
        return fetch(event.request).then(function (response) {
          if (response.ok) {
            var clone = response.clone();
            caches.open(APP_SHELL_CACHE).then(function (cache) {
              cache.put(event.request, clone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Everything else → network first, cache fallback for offline.
  event.respondWith(
    fetch(event.request)
      .then(function (response) {
        if (response.ok) {
          var clone = response.clone();
          caches.open(DYNAMIC_CACHE).then(function (cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(function () {
        return caches.match(event.request);
      })
  );
});

// ─── Push Notifications ───────────────────────────────────
self.addEventListener("push", function (event) {
  var payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (err) {
      payload = { body: event.data.text() };
    }
  }

  var title = payload.title || "Mychelin reminder";
  var options = {
    body: payload.body || "Your cooking rhythm is waiting.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: payload.type || "mychelin-reminder",
    data: { url: payload.url || "/app" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var targetUrl = new URL(event.notification.data && event.notification.data.url ? event.notification.data.url : "/app", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clients) {
      for (var i = 0; i < clients.length; i += 1) {
        var client = clients[i];
        if (client.url.indexOf(self.location.origin) === 0 && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      return undefined;
    })
  );
});
