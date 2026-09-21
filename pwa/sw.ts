/// <reference lib="webworker" />
import { precacheAndRoute, createHandlerBoundToURL, cleanupOutdatedCaches } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { clientsClaim } from 'workbox-core';
import { readNotificationVibration } from '../utils/notificationDevicePreferences';
import { notificationPresentation } from '../utils/notificationPresentation';
import {
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
    new StaleWhileRevalidate({ cacheName: 'google-fonts-css' })
);
registerRoute(
    ({ url }) => url.origin === 'https://fonts.gstatic.com',
    new CacheFirst({
        cacheName: 'google-fonts-files',
        plugins: [new ExpirationPlugin({ maxEntries: 24, maxAgeSeconds: 365 * 24 * 3600 })],
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
    new StaleWhileRevalidate({ cacheName: 'predefined-contents' })
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
    new StaleWhileRevalidate({ cacheName: 'official-curriculum' })
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
        && /^\/(?:icone\.png|dashboard\.png|(?:portrait|landscape)\.gif|guide\/)/.test(url.pathname),
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

// ── Moteur LaTeX (MathJax 4.1.3) ───────────────────────────────────────────
// Deux caches volontairement distincts :
//  - l'ENTRÉE du moteur (tex-mml-chtml.js) est épinglée seule. Sa perte rend
//    toutes les formules illisibles ; elle ne doit jamais être évincée par le
//    va-et-vient des polices. Cache conservé sous l'ancien nom pour que les
//    installations déjà hors ligne continuent de compiler après la mise à jour ;
//  - le reste (composants et polices réellement utilisées) vit dans un cache
//    plus large : MathJax 4 découpe ses polices en nombreux fichiers, et
//    160 entrées pouvaient évincer le moteur lui-même sur un usage intensif.
// Une première visite en ligne reste nécessaire : les extensions jamais
// téléchargées demandent toujours le réseau.
registerRoute(
    ({ url }) => url.origin === 'https://cdn.jsdelivr.net'
        && /^\/npm\/mathjax@4\.1\.3\/tex-mml-chtml\.js$/.test(url.pathname),
    new CacheFirst({
        cacheName: 'mathjax-4.1.3',
        plugins: [new ExpirationPlugin({ maxEntries: 12, maxAgeSeconds: 365 * 24 * 3600 })],
    })
);
registerRoute(
    ({ url }) => url.origin === 'https://cdn.jsdelivr.net'
        && /^\/npm\/(?:mathjax@4\.1\.3\/|@mathjax\/mathjax-[^/]+\/)/.test(url.pathname),
    new CacheFirst({
        cacheName: 'mathjax-assets-4.1.3',
        plugins: [new ExpirationPlugin({ maxEntries: 400, maxAgeSeconds: 365 * 24 * 3600 })],
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
    const showNotification = readNotificationVibration().then(vibration => {
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
    const requestedUrl = (event.notification.data?.url as string) || '/';
    let targetUrl = new URL('/', self.location.origin).href;
    try {
        const candidate = new URL(requestedUrl, self.location.origin);
        // Une charge Push ne doit jamais pouvoir transformer le clic en
        // redirection vers un domaine externe.
        if (candidate.origin === self.location.origin) targetUrl = candidate.href;
    } catch {
        // URL malformée : retour sûr à l'accueil.
    }
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
            for (const client of clients) {
                if ('focus' in client) {
                    const windowClient = client as WindowClient;
                    // Retourner la chaîne garantit que waitUntil garde le
                    // service worker vivant jusqu'au focus ET à la navigation.
                    return windowClient.focus().then(focused => focused.navigate(targetUrl));
                }
            }
            return self.clients.openWindow(targetUrl);
        })
    );
});
