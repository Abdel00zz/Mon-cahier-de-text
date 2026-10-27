const SHELL_CACHE = 'cahier-shell-v2';
const RUNTIME_CACHE = 'cahier-runtime-v2';
const ACTIVE_CACHES = [SHELL_CACHE, RUNTIME_CACHE];

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon-180.png',
  '/icons/favicon-32.png',
  '/icons/favicon-16.png',
  '/vacances-jourferie.json',
  '/official-student-events.json',
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(SHELL_CACHE);
      await Promise.allSettled(PRECACHE_URLS.map(url => cache.add(url)));
    } catch {
      // Offline install fallback remains resilient even if a secondary asset is unreachable.
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(key => !ACTIVE_CACHES.includes(key))
          .map(key => caches.delete(key))
      );
    } catch {
      // Ignore storage cleanup errors in restricted browsing modes.
    }
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});

function isCacheableStaticPath(pathname) {
  return (
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/fonts/') ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/contenus/') ||
    pathname.startsWith('/doc_officiel/') ||
    pathname.startsWith('/guide/') ||
    pathname === '/manifest.webmanifest' ||
    pathname.startsWith('/calendrier_scolaire_maroc_')
  );
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (request.cache === 'no-store') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname === '/version.json') return;

  // Navigation requests: Network-first with offline fallback to cached shell
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok) {
          const cache = await caches.open(SHELL_CACHE);
          void cache.put('/index.html', networkResponse.clone());
        }
        return networkResponse;
      } catch {
        const cachedIndex = await caches.match('/index.html');
        if (cachedIndex) return cachedIndex;
        const cachedRoot = await caches.match('/');
        if (cachedRoot) return cachedRoot;
        return Response.error();
      }
    })());
    return;
  }

  // Static assets & offline curricula: Stale-while-revalidate
  if (isCacheableStaticPath(url.pathname)) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      const networkPromise = fetch(request)
        .then(async response => {
          if (response && response.ok && response.type === 'basic') {
            const cache = await caches.open(RUNTIME_CACHE);
            await cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => null);

      if (cached) {
        void networkPromise;
        return cached;
      }
      const networkResponse = await networkPromise;
      return networkResponse || Response.error();
    })());
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/#/';
  event.waitUntil((async () => {
    const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windowClients) {
      try {
        if (new URL(client.url).origin === self.location.origin) {
          await client.focus();
          client.postMessage({ type: 'NOTIFICATION_CLICK', url: targetUrl });
          return;
        }
      } catch {
        // Ignore inaccessible client frames
      }
    }
    if (self.clients.openWindow) {
      await self.clients.openWindow(targetUrl);
    }
  })());
});
