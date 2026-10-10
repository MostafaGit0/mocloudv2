// MoCloud's offline helper. It only keeps a copy of the page itself, so MoCloud still opens with
// no internet and your downloaded videos can play. It never stores videos or anything else.
const CACHE = "mocloud-page-v1";
const PAGE = "./";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.add(new Request(PAGE, { cache: "reload" }))).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (name !== CACHE) await caches.delete(name); // old copies
    await self.clients.claim();
  })());
});

// Only the page itself is handled: the newest version when online, the saved copy when offline.
// Everything else (videos, uploads, the storage servers) goes straight to the network as normal.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || req.mode !== "navigate") return;
  event.respondWith((async () => {
    try {
      const fresh = await Promise.race([
        fetch(req),
        new Promise((_, reject) => setTimeout(() => reject(new Error("slow")), 6000)),
      ]);
      if (fresh.ok) {
        const copy = fresh.clone();
        caches.open(CACHE).then((c) => c.put(PAGE, copy)).catch(() => {});
      }
      return fresh;
    } catch {
      const saved = await caches.match(PAGE);
      return saved || Response.error();
    }
  })());
});
