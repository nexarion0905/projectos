const CACHE = 'projectos-shell-v2';
const OFFLINE = '/offline.html';
const PUBLIC = new Set([OFFLINE, '/manifest.webmanifest', '/icon.svg']);

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll([...PUBLIC].map((path) => new Request(path, { credentials: 'omit' })));
    const shell = await fetch('/', { credentials: 'omit', cache: 'reload' });
    if (shell.ok && shell.headers.get('X-ProjectOS-Local-Shell') === '1') await cache.put('/', shell);
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'ACTIVATE_PROJECTOS_UPDATE') event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (/^projectos-shell-v\d+$/.test(key) && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.search) return;
  if (request.mode === 'navigate' && url.pathname === '/') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok && response.headers.get('X-ProjectOS-Local-Shell') === '1') {
          try { await (await caches.open(CACHE)).put('/', response.clone()); } catch { /* storage unavailable */ }
        }
        return response;
      } catch {
        const cache = await caches.open(CACHE);
        return await cache.match('/') ?? await cache.match(OFFLINE) ?? Response.error();
      }
    })());
    return;
  }
  if (PUBLIC.has(url.pathname) || url.pathname.startsWith('/_next/static/')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(request);
      if (hit) return hit;
      const response = await fetch(request);
      if (response.ok && !response.redirected) {
        try { await cache.put(request, response.clone()); } catch { /* storage unavailable */ }
      }
      return response;
    })());
  }
});
