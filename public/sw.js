// Replaced with a content hash and a complete resource list during the web build.
const BUILD_ID = 'development';
const BUILD_ASSETS = [];
const SHELL_CACHE = `cahier-shell-${BUILD_ID}`;
const RUNTIME_CACHE = 'cahier-runtime-v2';
const ACTIVE_CACHES = [SHELL_CACHE, RUNTIME_CACHE];

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/manifest-ar.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon-180.png',
  '/icons/favicon-32.png',
  '/icons/favicon-16.png',
  '/vacances-jourferie.json',
  '/official-student-events.json',
  ...BUILD_ASSETS,
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    // A partial download must never replace a working offline version.
    try {
      const cache = await caches.open(SHELL_CACHE);
      await cache.addAll([...new Set(PRECACHE_URLS)]);
    } catch (error) {
      await caches.delete(SHELL_CACHE);
      throw error;
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      // Retain the previous shell for tabs still running its hashed chunks.
      const oldShells = keys.filter(key => key.startsWith('cahier-shell-') && key !== SHELL_CACHE);
      const keepPrevious = oldShells.at(-1);
      await Promise.all(keys.filter(key => key.startsWith('cahier-')
        && !ACTIVE_CACHES.includes(key) && key !== keepPrevious).map(key => caches.delete(key)));
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
    /\.(?:ttf|otf)$/i.test(pathname) ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/contenus/') ||
    pathname.startsWith('/doc_officiel/') ||
    pathname.startsWith('/guide/') ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/manifest-ar.webmanifest' ||
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

  // Each worker serves its own consistent shell; other pages retain normal navigation.
  if (request.mode === 'navigate' && (url.pathname === '/' || url.pathname === '/index.html')) {
    event.respondWith((async () => {
      const shell = await caches.open(SHELL_CACHE);
      return await shell.match('/index.html') || await shell.match('/') || fetch(request);
    })());
    return;
  }

  // Static assets & offline curricula: Stale-while-revalidate
  if (isCacheableStaticPath(url.pathname)) {
    const result = (async () => {
      let cached;
      try {
        const currentShell = await caches.open(SHELL_CACHE);
        const bundled = await currentShell.match(request);
        if (bundled) return { response: bundled };
        cached = await caches.match(request);
      } catch { /* Storage may be unavailable or full in private browsing. */ }

      const network = fetch(request).catch(() => null);
      const refresh = network.then(async response => {
        if (!response || !response.ok || response.type !== 'basic') return;
        try {
          const cache = await caches.open(RUNTIME_CACHE);
          await cache.put(request, response.clone());
        } catch { /* A quota error must not discard a successful response. */ }
      });
      return { response: cached || await network || Response.error(), refresh };
    })();
    event.respondWith(result.then(value => value.response));
    // A cached response can finish before revalidation; keep the worker alive.
    event.waitUntil(result.then(value => value.refresh).catch(() => {}));
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const requested = event.notification.data && event.notification.data.url;
  const targetUrl = typeof requested === 'string' && requested.length <= 400
    && /^\/#\/(?:classe\/[^/?#]+|parametres|)$/.test(requested) ? requested : '/#/';
  event.waitUntil((async () => {
    const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const target = new URL(targetUrl, self.location.origin).href;
    const candidates = windowClients.filter(client => {
      try {
        const url = new URL(client.url);
        return url.origin === self.location.origin && (url.pathname === '/' || url.pathname === '/index.html');
      } catch { return false; }
    }).sort((a, b) => Number(b.url === target) - Number(a.url === target)
      || Number(b.focused) - Number(a.focused)
      || Number(b.visibilityState === 'visible') - Number(a.visibilityState === 'visible'));
    for (const client of candidates) {
      try {
        await client.focus();
        if (client.url !== target) client.postMessage({ type: 'NOTIFICATION_CLICK', url: targetUrl });
        return;
      } catch { /* A closed window must not block another window or a new one. */ }
    }
    if (self.clients.openWindow) {
      await self.clients.openWindow(targetUrl);
    }
  })());
});
