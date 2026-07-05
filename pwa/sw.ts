/// <reference lib="webworker" />
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> };

// Precache des assets buildés (injecté par vite-plugin-pwa / Workbox).
precacheAndRoute(self.__WB_MANIFEST);

// SPA : toute navigation retombe sur index.html, SAUF /admin et /api.
const navigationHandler = createHandlerBoundToURL('/index.html');
registerRoute(
    new NavigationRoute(navigationHandler, {
        denylist: [/^\/admin/, /^\/api\//],
    })
);

// Applique tout de suite les nouvelles versions demandées par l'UI.
self.addEventListener('message', event => {
    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// ── Web Push ────────────────────────────────────────────────────────────────
self.addEventListener('push', event => {
    let payload: { title?: string; body?: string; url?: string } = {};
    try {
        payload = event.data?.json() ?? {};
    } catch {
        payload = { body: event.data?.text() };
    }
    const title = payload.title || 'Cahier de textes';
    event.waitUntil(
        self.registration.showNotification(title, {
            body: payload.body || 'Vous avez une mise à jour à faire.',
            icon: '/icons/icon.svg',
            badge: '/icons/icon.svg',
            tag: 'cdt-lateness',
            data: { url: payload.url || '/' },
        })
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    const targetUrl = (event.notification.data?.url as string) || '/';
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
            for (const client of clients) {
                if ('focus' in client) {
                    client.focus();
                    if ('navigate' in client) (client as WindowClient).navigate(targetUrl);
                    return;
                }
            }
            return self.clients.openWindow(targetUrl);
        })
    );
});
