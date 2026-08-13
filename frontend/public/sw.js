// Cozinha Lucrativa - Service Worker
// Purpose: aggressively invalidate stale caches and auto-refresh clients on deploy.

// Bump this constant whenever you deploy a significant change.
const APP_VERSION = 'v-2026-01-10-007-cache-bust';

self.addEventListener('install', (event) => {
  // Activate immediately, don't wait for old SW to be released
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // 1) Delete ALL caches (nukes any stale content from previous versions)
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));

    // 2) Take control of all open clients
    await self.clients.claim();

    // 3) Broadcast to clients that they should refresh
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    clients.forEach((client) => {
      client.postMessage({ type: 'SW_ACTIVATED', version: APP_VERSION });
    });
  })());
});

// Network-only strategy — never serve from SW cache.
// Just pass through the request; the browser's own no-cache HTTP headers
// (set in <meta> and response headers) handle staleness.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Only intercept top-level navigations to guarantee fresh HTML.
  if (req.mode === 'navigate' && req.method === 'GET') {
    event.respondWith(
      fetch(req, { cache: 'no-store' }).catch(() =>
        new Response(
          '<h1 style="font-family:sans-serif;padding:2rem">Sem conexão</h1>',
          { status: 504, headers: { 'Content-Type': 'text/html' } }
        )
      )
    );
  }
  // For all other requests (JS/CSS/API), let the browser handle it natively.
});

// Allow client to trigger immediate activation of a waiting SW.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
