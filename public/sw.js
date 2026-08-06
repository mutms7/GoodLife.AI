const CACHE = "goodlife-shell-v3";
const SHELL = ["/", "/app", "/manifest.webmanifest"];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => { event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE && key.startsWith("goodlife-shell-")).map((key) => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  const requestUrl = new URL(event.request.url);
  if (event.request.mode === "navigate") {
    // Cache each shell route under its own path so /app opens offline too.
    const shellKey = requestUrl.pathname.startsWith("/app") ? "/app" : "/";
    event.respondWith(fetch(event.request).then((response) => {
      if (response.ok) { const copy = response.clone(); caches.open(CACHE).then((cache) => cache.put(shellKey, copy)); }
      return response;
    }).catch(() => caches.match(shellKey).then((cached) => cached || caches.match("/"))));
    return;
  }
  const isStaticAsset = requestUrl.pathname.startsWith("/assets/") || /\.(?:js|css|png|svg|ico|webmanifest|woff2?)$/i.test(requestUrl.pathname);
  if (!isStaticAsset) return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    if (response.ok) { const copy = response.clone(); caches.open(CACHE).then((cache) => cache.put(event.request, copy)); }
    return response;
  }).catch(() => new Response("Offline", { status: 503 }))));
});
