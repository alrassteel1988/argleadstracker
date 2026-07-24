const CACHE_VERSION = "arg-pwa-v59-salesmen-card-view";
const APP_SHELL = [
  "/",
  "/index.html",
  "/styles.css",
  "/salesman-dashboard-live-leads.css",
  "/lead-detail-readability.css",
  "/activity-readability.css",
  "/tasks-bauhaus-flat.css",
  "/salesmen-directory.css",
  "/salesman-dashboard-summaries.css",
  "/pipeline-live-leads.css",
  "/tasks-contrast.css",
  "/lead-detail-contrast.css",
  "/activity-modal.css",
  "/activity-workflow.css",
  "/admin-dashboard-clean.css",
  "/bauhaus-global.css",
  "/client.js",
  "/favicon.svg",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
  "/icons/shortcut-log.png",
  "/icons/shortcut-focus.png"
];

const MAP_HOSTS = new Set([
  "maps.googleapis.com",
  "maps.gstatic.com",
  "mt0.google.com",
  "mt1.google.com",
  "mt2.google.com",
  "mt3.google.com"
]);

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_VERSION).then(cache => cache.addAll(APP_SHELL)));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys
      .filter(key => key !== CACHE_VERSION)
      .map(key => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("sync", event => {
  if (event.tag === "arg-outbox-sync") {
    event.waitUntil(self.clients.matchAll({ type: "window" }).then(clients => {
      clients.forEach(client => client.postMessage({ type: "SYNC_OUTBOX" }));
    }));
  }
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.pathname.startsWith("/api/")) return;

  if (MAP_HOSTS.has(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request, "arg-map-cache", 50));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request));
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    if (request.mode === "navigate") return caches.match("/index.html");
    throw error;
  }
}

async function staleWhileRevalidate(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fresh = fetch(request).then(async response => {
    if (response.ok) {
      await trimCache(cacheName, maxEntries);
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cached);
  return cached || fresh;
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  await cache.delete(keys[0]);
}
