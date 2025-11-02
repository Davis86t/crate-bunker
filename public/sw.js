const CACHE_NAME = 'cb-cache-v1';
const ASSETS = [
  '/',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/crate-bunker-og-image.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(ASSETS);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null)));
    self.clients.claim();
  })());
});

// Stale-While-Revalidate for GET requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    const fetchPromise = fetch(request).then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    }).catch(() => cached);
    return cached || fetchPromise;
  })());
});
