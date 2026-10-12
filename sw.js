/* Bogey Buddy service worker: stale-while-revalidate with a versioned cache.
   Bump VERSION on every release; open pages get an "update ready" toast. */
const VERSION = "bogey-buddy-v1.1.0-2026-10-11";
const FILES = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/apple-touch-icon.png", "img/caddie.webp", "img/warmup.webp", "img/practice.webp", "img/bag.webp", "img/badge.webp"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => new Request(f, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => {
    const old = keys.filter(k => k !== VERSION);
    return Promise.all(old.map(k => caches.delete(k))).then(() => self.clients.claim()).then(() => {
      if (old.length) return self.clients.matchAll({ type: "window" }).then(cs => cs.forEach(c => c.postMessage({ type: "updated", version: VERSION })));
    });
  }));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return; // YouTube etc. go to the network
  e.respondWith(caches.open(VERSION).then(cache => cache.match(req, { ignoreSearch: true }).then(hit => {
    const net = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; });
    if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
    return net.catch(() => cache.match(req.mode === "navigate" ? "index.html" : req, { ignoreSearch: true }).then(r => r || cache.match("./")));
  })));
});
