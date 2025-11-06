/* Crate Bunker SW (v8) — resilient install, no-dino */
const CACHE = 'crate-bunker-v8';

// Only cache files that actually exist in your project.
// You have /app-icon-1024.png (from metadata), but not icon-192/512.
const ASSETS = [
  '/',                 // shell
  '/offline.html',
  '/manifest.json',
  '/app-icon-1024.png',
];

// Helper: try adding each asset, ignore failures (so install never rejects)
async function safePrecache(cache, urls) {
  for (const u of urls) {
    try {
      // force a fresh fetch when online; won’t matter offline
      await cache.add(new Request(u, { cache: 'reload' }));
    } catch (_) {
      // ignore; we’ll still activate
    }
  }
}

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await safePrecache(c, ASSETS);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // network-only ping (no cache, no fallback)
  if ((req.method === 'GET' || req.method === 'HEAD') && url.pathname.startsWith('/ping')) {
    e.respondWith(fetch(req));
    return;
  }

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Never touch non-GET (prevents POST -> dino)
  if (req.method !== 'GET') return;

  // Navigations: network-first, resilient fallbacks
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        // Opportunistically cache only the root shell
        if (url.pathname === '/' && res.ok) (await caches.open(CACHE)).put(req, res.clone());
        return res;
      } catch {
        const c = await caches.open(CACHE);
        // Try exact request (in case it was cached), then '/', then offline.html
        return (await c.match(req)) || (await c.match('/')) || (await c.match('/offline.html')) ||
          new Response(
            `<!doctype html><meta charset="utf-8"><title>Offline</title>
             <body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#0E0E0E;color:#F3F3F3;font:16px system-ui">
             <main style="text-align:center"><h1>Offline</h1><p>No cached shell yet.</p><a href="/" style="margin-top:12px;display:inline-block;background:#E57C23;color:#000;padding:10px 16px;border-radius:999px;text-decoration:none">Retry</a></main>`,
            { headers: { 'content-type': 'text/html; charset=utf-8' } }
          );
      }
    })());
    return;
  }

  // Static assets: stale-while-revalidate
  if (['style', 'script', 'image', 'font'].includes(req.destination)) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const cached = await c.match(req);
      const fetching = fetch(req).then(res => {
        if (res && res.ok) c.put(req, res.clone());
        return res;
      }).catch(() => cached);
      return cached || fetching;
    })());
    return;
  }

  // Default: network, then cache, docs -> offline page
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    try {
      return await fetch(req);
    } catch {
      const cached = await c.match(req);
      if (cached) return cached;
      if (req.destination === 'document') return (await c.match('/offline.html')) ||
        new Response('<!doctype html><title>Offline</title><p>Offline.</p>', { headers: { 'content-type': 'text/html' } });
      return new Response('', { status: 504 });
    }
  })());
});
