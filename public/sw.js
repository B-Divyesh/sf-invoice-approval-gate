const CACHE_VERSION = 'send-gate-v2';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const CORE = [
  '/',
  '/privacy/',
  '/terms/',
  '/offline.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/assets/send-gate-diorama-640.webp',
  '/assets/send-gate-diorama-1280.webp',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    const requests = [...CORE];
    try {
      const manifestResponse = await fetch('/asset-manifest.json', { cache: 'no-store' });
      if (manifestResponse.ok) {
        const manifest = await manifestResponse.json();
        for (const entry of Object.values(manifest)) {
          if (entry.file) requests.push(`/${entry.file}`);
          for (const css of entry.css || []) requests.push(`/${css}`);
          for (const asset of entry.assets || []) requests.push(`/${asset}`);
        }
      }
    } catch {
      // Core navigation remains available if the generated manifest is absent.
    }
    await cache.addAll([...new Set(requests)]);
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => ![SHELL_CACHE, RUNTIME_CACHE].includes(name)).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, response.clone());
        return response;
      } catch {
        return (await caches.match(request)) || (await caches.match('/')) || (await caches.match('/offline.html'));
      }
    })());
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith((async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      try {
        const response = await fetch(request);
        cache.put(request, response.clone());
        return response;
      } catch {
        return (await cache.match(request)) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  })());
});
