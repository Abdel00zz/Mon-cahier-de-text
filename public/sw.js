// Désinstalleur de l'ancienne application installable.
//
// L'application n'est plus une PWA : ce fichier est servi à la place de
// l'ancien service worker Workbox. Les navigateurs qui l'ont déjà installé le
// téléchargent à la prochaine visite (l'en-tête `Cache-Control: no-cache` sur
// `/sw.js` est dans `vercel.json`), puis il se nettoie lui-même : plus de cache,
// plus d'enregistrement. À conserver en ligne au moins huit semaines.

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        try {
            const names = await caches.keys();
            await Promise.all(names.map(name => caches.delete(name)));
        } catch { /* cache inaccessible : on continue le nettoyage */ }
        try {
            await self.registration.unregister();
        } catch { /* déjà désenregistré */ }
        // Aucun rechargement forcé : un onglet peut contenir une saisie en cours.
        // Le navigateur reprend la main au chargement suivant, sans service worker
        // et avec un cache vide.
    })());
});
