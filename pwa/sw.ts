/// <reference lib="webworker" />
import { precacheAndRoute, createHandlerBoundToURL, cleanupOutdatedCaches } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { clientsClaim } from 'workbox-core';
import {
    defaultNotificationTag,
    isPushNotificationKind,
    type PushNotificationKind,
    type PushNotificationPayload,
} from '../utils/notificationTypes';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> };

// Precache des assets buildés (injecté par vite-plugin-pwa / Workbox).
precacheAndRoute(self.__WB_MANIFEST);
// Purge les anciens precaches quand une nouvelle version est publiée.
cleanupOutdatedCaches();

/*
 * Mise à jour AUTOMATIQUE et silencieuse : la nouvelle version s'active dès son
 * installation (skipWaiting) et prend le contrôle des pages ouvertes
 * (clientsClaim), sans invite ni clic. La page se recharge d'elle-même une
 * seule fois (voir registerSW.ts). Les cahiers étant persistés en continu dans
 * le localStorage, aucun risque de perte.
 */
self.skipWaiting();
clientsClaim();

// SPA : toute navigation retombe sur index.html, SAUF /admin et /api.
const navigationHandler = createHandlerBoundToURL('/index.html');
registerRoute(
    new NavigationRoute(navigationHandler, {
        denylist: [/^\/admin/, /^\/api\//],
    })
);

/*
 * Polices Google (Fraunces, Public Sans, IBM Plex…) : indispensables au rendu
 * hors ligne sur mobile/tablette. La feuille CSS est revalidée en arrière-plan,
 * les fichiers de police (immuables) sont servis cache-first un an.
 */
registerRoute(
    ({ url }) => url.origin === 'https://fonts.googleapis.com',
    new StaleWhileRevalidate({ cacheName: 'google-fonts-css' })
);
registerRoute(
    ({ url }) => url.origin === 'https://fonts.gstatic.com',
    new CacheFirst({
        cacheName: 'google-fonts-files',
        plugins: [new ExpirationPlugin({ maxEntries: 24, maxAgeSeconds: 365 * 24 * 3600 })],
    })
);

// ── Web Push ────────────────────────────────────────────────────────────────
self.addEventListener('push', event => {
    let payload: Partial<PushNotificationPayload> = {};
    try {
        payload = event.data?.json() ?? {};
    } catch {
        payload = { body: event.data?.text() };
    }
    const title = payload.title || 'Cahier de textes';
    const kind: PushNotificationKind = isPushNotificationKind(payload.kind) ? payload.kind : 'lateness';
    const targetUrl = payload.url || '/';
    event.waitUntil(
        self.registration.showNotification(title, {
            body: payload.body || 'Vous avez une mise à jour à faire.',
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            tag: payload.tag || defaultNotificationTag(kind),
            data: { url: targetUrl, kind, timestamp: payload.timestamp || Date.now() },
        })
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    if (event.action === 'dismiss') return;
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
