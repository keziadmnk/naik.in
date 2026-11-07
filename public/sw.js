const CACHE_NAME = "naik-in-shell-v4";
const OFFLINE_URL = "/offline.html";
const APP_SHELL = [
  "/",
  "/keuangan",
  "/label",
  "/laporan",
  "/pengaturan",
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable.png",
  "/presets/bu-sari.json",
  "/presets/uni-dewi.json"
];

const isDev =
  self.location.hostname === "localhost" ||
  self.location.hostname === "127.0.0.1" ||
  self.location.hostname.includes("192.168.");

self.addEventListener("install", (event) => {
  if (isDev) {
    self.skipWaiting();
    return;
  }
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => undefined))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  if (isDev) {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .then(() => self.registration.unregister())
        .then(() => self.clients.claim())
    );
    return;
  }
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (isDev || event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Never cache Next.js dev/static bundles, API routes, or RSC payloads
  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/api/") ||
    url.searchParams.has("_rsc")
  ) {
    return;
  }

  // Network-first for page navigations (HTML) to avoid stale chunk mismatches
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // Cache-first only for static assets (images, icons, presets, offline page)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});
