const CACHE = "vm-collection-v9-auth-sync";
const FILES = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./storage.js",
  "./boot.js",
  "./auth.js",
  "./auth-ui.js",
  "./sync.js",
  "./config-loader.js",
  "./supabase-client.js",
  "./config.generated.js",
  "./vendor/supabase.umd.js",
  "./manifest.webmanifest",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/logo.png"
];
const APP_SHELL_FILES = new Set([
  "/",
  "/index.html",
  "/app.js",
  "/styles.css",
  "/storage.js",
  "/sw.js",
  "/boot.js",
  "/auth.js",
  "/auth-ui.js",
  "/sync.js",
  "/config-loader.js",
  "/supabase-client.js",
  "/config.generated.js",
  "/vendor/supabase.umd.js"
]);

function isAppShellRequest(request) {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  const path = url.pathname.endsWith("/") && url.pathname.length > 1
    ? url.pathname.slice(0, -1)
    : url.pathname;
  return APP_SHELL_FILES.has(path || "/");
}

function isAuthOrApiRequest(request) {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) return true;
  // Never cache Supabase Auth / REST / Storage / Realtime
  if (url.hostname.endsWith("supabase.co")) return true;
  if (url.hostname.includes("supabase")) return true;
  return false;
}

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (isAuthOrApiRequest(request)) {
    event.respondWith(fetch(request));
    return;
  }

  if (isAppShellRequest(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request))
  );
});
