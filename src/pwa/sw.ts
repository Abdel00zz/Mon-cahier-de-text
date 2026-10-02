/// <reference lib="webworker" />
import { precacheAndRoute, createHandlerBoundToURL, cleanupOutdatedCaches } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { clientsClaim } from 'workbox-core';
import { readNotificationVibration } from '../infrastructure/push/notificationDevicePreferences';
import { notificationPresentation } from '../domain/notifications/notificationPresentation';
import { openNotificationTarget } from './notificationNavigation';
import {
    isPushNotificationKind,
    type PushNotificationKind,
    type PushNotificationPayload,
} from '../domain/notifications/notificationTypes';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> };

// Precache des assets buildés (injecté par vite-plugin-pwa / Workbox).
precacheAndRoute(self.__WB_MANIFEST);
// Purge les anciens precaches quand une nouvelle version est publiée.
cleanupOutdatedCaches();

/*
 * The page requests activation after a safe moment; installation alone must
 * never interrupt an open form. The first installation still claims clients.
 */
self.addEventListener('message', event => {
    if (event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
});
clientsClaim();

/*
 * PAS de préchargement de navigation (« navigation preload »), volontairement :
 * il ne sert qu'aux stratégies qui vont AU RÉSEAU d'abord. Ici la navigation est
 * servie depuis le précache (createHandlerBoundToURL), donc la requête réseau
 * lancée en parallèle serait jetée — c'est-à-dire des données mobiles gaspillées
 * à chaque changement d'écran, sans aucun gain de vitesse.
 */

// SPA : toute navigation retombe sur index.html, SAUF /admin et /api.
const navigationHandler = createHandlerBoundToURL('/index.html');
registerRoute(
    new NavigationRoute(navigationHandler, {
        denylist: [/^\/admin/, /^\/api(?:\/|$)/],
    })
);

/*
 * Polices : duo latin (DM Sans, Rubik) et polices arabes embarquées
 * (Arabswell 3, Maghribi Font 3) : indispensables au rendu
 * hors ligne sur mobile/tablette. La feuille CSS est revalidée en arrière-plan,
 * les fichiers de police (immuables) sont servis cache-first un an.
 */
registerRoute(
    ({ url }) => url.origin === 'https://fonts.googleapis.com',
    new StaleWhileRevalidate({ cacheName: 'google-fonts-css', plugins: [
        new ExpirationPlugin({ maxEntries: 8, maxAgeSeconds: 30 * 24 * 3600, purgeOnQuotaError: true }),
    ] })
);
registerRoute(
    ({ url }) => url.origin === 'https://fonts.gstatic.com',
    new CacheFirst({
        cacheName: 'google-fonts-files',
        plugins: [new ExpirationPlugin({ maxEntries: 24, maxAgeSeconds: 365 * 24 * 3600, purgeOnQuotaError: true })],
    })
);

/*
 * Contenus prédéfinis (fichiers JSON sous public/contenus/) : chargés à la
 * demande quand le professeur choisit un programme officiel. Le manifeste est
 * précaché (voir includeAssets) ; les fichiers de contenu, de poids variable,
 * sont mis en cache au premier chargement puis servis hors ligne.
 */
registerRoute(
    ({ url, request }) => url.origin === self.location.origin
        && url.pathname.startsWith('/contenus/')
        && request.destination !== 'document',
    new StaleWhileRevalidate({ cacheName: 'predefined-contents', plugins: [
        new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 180 * 24 * 3600, purgeOnQuotaError: true }),
        { cacheKeyWillBeUsed: async ({ request }) => new URL(request.url).origin + new URL(request.url).pathname },
    ] })
);

/*
 * Catalogue officiel des progressions : `utils/officialCurriculum.ts` le
 * demande en `cache: 'no-store'` (donc toujours au réseau, jamais servi par le
 * cache HTTP) ; sans route dédiée il était indisponible hors connexion, alors
 * que l'application sait déjà s'en servir. Stale-while-revalidate : la version
 * connue répond immédiatement, la mise à jour arrive au chargement suivant.
 */
registerRoute(
    ({ url }) => url.origin === self.location.origin
        && url.pathname === '/doc_officiel/curriculum.json',
    new StaleWhileRevalidate({ cacheName: 'official-curriculum', plugins: [
        new ExpirationPlugin({ maxEntries: 2, maxAgeSeconds: 180 * 24 * 3600, purgeOnQuotaError: true }),
    ] })
);

/*
 * Illustrations de l'application (accueil, authentification, tableau de bord,
 * captures du guide) : ≈ 1 Mo pour `icone.png` et `dashboard.png`, ≈ 770 Ko par
 * GIF d'accueil, ≈ 380 Ko de captures. Elles sont volontairement HORS précache
 * pour ne pas alourdir l'installation, mais sans cache à l'usage elles
 * manquaient hors connexion sur les tout premiers écrans (connexion, accueil) —
 * exactement ceux qu'un professeur ouvre avec un réseau incertain.
 *
 * Stale-while-revalidate plutôt que cache-first : ces URL ne changent jamais de
 * nom, donc une illustration remplacée resterait sinon servie indéfiniment depuis
 * le cache. Ici la version connue répond immédiatement (instantané hors
 * connexion) et la revalidation — un simple 304 — corrige le fichier en
 * arrière-plan, sans jamais bloquer l'affichage.
 */
registerRoute(
    ({ url, request }) => url.origin === self.location.origin
        && (request.destination === 'image' || /\.(?:png|gif|webp|jpg|jpeg)$/.test(url.pathname))
        && /^\/(?:icone\.png|guide\/|showcase\/)/.test(url.pathname),
    new StaleWhileRevalidate({
        cacheName: 'app-illustrations-v1',
        plugins: [
            new ExpirationPlugin({ maxEntries: 40, maxAgeSeconds: 180 * 24 * 3600, purgeOnQuotaError: true }),
            /*
             * Les captures du guide sont demandées avec `?retry=n` : sans
             * normalisation, chaque tentative créerait une entrée de cache de
             * plus pour la même image.
             */
            {
                cacheKeyWillBeUsed: async ({ request: incoming }) => incoming.url.replace(/\?retry=\d+$/, ''),
            },
        ],
    })
);

// ── Web Push ────────────────────────────────────────────────────────────────
self.addEventListener('push', event => {
    let payload: Partial<PushNotificationPayload> = {};
    try {
        const parsed = event.data?.json();
        payload = parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        payload = { body: event.data?.text() };
    }
    const kind: PushNotificationKind = isPushNotificationKind(payload.kind) ? payload.kind : 'lateness';
    const vibration = new Promise<boolean>(resolve => {
        const timer = self.setTimeout(() => resolve(false), 500);
        void readNotificationVibration().then(value => { self.clearTimeout(timer); resolve(value); });
    });
    const showNotification = vibration.then(vibration => {
        const presentation = notificationPresentation(payload, vibration);
        return self.registration.showNotification(presentation.title, presentation.options);
    });
    const notifyOpenClients = kind === 'admin' && typeof payload.messageId === 'string'
        ? self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
            windows.forEach(client => client.postMessage({ type: 'admin-message', messageId: payload.messageId }));
        })
        : Promise.resolve();
    event.waitUntil(Promise.all([showNotification, notifyOpenClients]));
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    if (event.action === 'dismiss') return;
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
            return openNotificationTarget(event.notification.data?.url, self.location.origin, clients,
                url => self.clients.openWindow(url));
        })
    );
});
