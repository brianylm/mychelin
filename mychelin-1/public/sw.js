// Self-destructing service worker. This replaces a previous SW that was
// intercepting requests and causing the login flow to hang. When clients
// with the old SW fetch this file, they install this version, which
// immediately unregisters itself and clears all caches.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      } catch (e) {
        // ignore
      }
      try {
        await self.registration.unregister();
        const clients = await self.clients.matchAll({ type: "window" });
        clients.forEach((client) => client.navigate(client.url));
      } catch (e) {
        // ignore
      }
    })()
  );
});

// Do not intercept any fetches — let everything go straight to the network.
