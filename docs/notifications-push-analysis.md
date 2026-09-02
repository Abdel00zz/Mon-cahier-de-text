# Analyse des notifications — Cahier de textes

## Modèle actuel

Le système comporte trois couches qui ne doivent pas être confondues :

| Couche | Déclencheur | Peut fonctionner application fermée ? | Autorité |
| --- | --- | --- | --- |
| Alerte dans l’application | `useNotificationFeed` + préférences locales | Non | `notificationSettings.enabled` |
| Rappel local de séance | `useSessionAlerts` + `setTimeout` + Service Worker | Seulement tant que la page reste vivante (ou reprend rapidement) | appareil courant |
| Push serveur | `/api/notify` + cron Vercel + Web Push | Oui, après abonnement valide | abonnement Redis |

La permission du navigateur, l’abonnement présent dans `PushManager` et
l’enregistrement du endpoint côté serveur sont trois états distincts. L’écran
des paramètres les affiche séparément et l’action `status` les réconcilie sans
redemander la permission.

## Flux d’activation

1. L’enseignant appuie explicitement sur « Activer les rappels ».
2. Le navigateur demande la permission système (une seule fois).
3. Le Service Worker crée ou réutilise l’abonnement Push.
4. Le client envoie le endpoint et ses clés à `POST /api/notify`.
5. Redis réserve atomiquement l’endpoint dans `push:endpoint-owners`, puis le
   rattache au téléphone courant (maximum cinq appareils).
6. Le client ne marque `pushEnabled` que lorsque les trois états sont positifs.

À la désactivation, l’abonnement local est retiré en premier pour couper
immédiatement les rappels de l’appareil. La suppression serveur est tentée
ensuite ; si le réseau est absent, l’interface signale que le serveur n’a pas
confirmé le retrait et invite à réessayer avec le même compte.

## Flux quotidien du cron

Le cron `GET /api/notify` est protégé par `CRON_SECRET`. Il :

- lit les snapshots et abonnements ;
- isole les snapshots invalides au lieu d’interrompre tout le passage ;
- applique les absences, seuils et le silence vacances par enseignant ;
- utilise `scheduleSlots` pour conserver les séances doubles ;
- évite une nouvelle alerte pendant deux jours, sauf aggravation ;
- envoie par lots concurrents, avec un budget de temps ;
- purge les réponses fournisseur 404/410 ;
- ne met à jour `lastNotifiedAt` que si au moins un appareil a été livré.

Le tag `cdt-lateness` remplace l’alerte quotidienne précédente dans le centre
de notifications. Le TTL serveur est de 24 h (1 h pour un test), afin qu’une
alerte périmée ne surgisse pas après un long mode avion.

## Lecture Node / Edge / State / LangGraph

- **Node/serveur** : authentification, Redis, VAPID et cron. Cette partie est
  durable et doit rester la seule source de vérité pour les notifications qui
  doivent arriver application fermée.
- **Edge/Service Worker** : réception du Push, affichage système et clic. Le
  clic est limité à une URL de même origine et attend réellement `focus()` puis
  `navigate()` avant la fin de `waitUntil`.
- **State** : `permission`, `subscribed`, `serverRegistered` et les préférences
  ne sont pas fusionnés en un booléen. Cette séparation rend les diagnostics et
  les migrations multi-appareils explicites.
- **LangGraph (futur)** : si une orchestration de rappels est ajoutée, chaque
  nœud devra être idempotent : `load snapshot → decide → claim delivery → send
  → record outcome`. Le claim doit porter une clé stable (téléphone, type,
  date, gravité) pour permettre reprise et observabilité sans doublon.

## Optimisations recommandées ensuite

1. Ajouter une métrique par étape (`permission_granted`, `subscription_created`,
   `server_registered`, `delivered`, `expired`) sans enregistrer le contenu ni
   l’endpoint en clair.
2. Remplacer le balayage global du cron par une file de candidats si le nombre
   d’enseignants dépasse le budget Vercel ; conserver le même claim idempotent.
3. Choisir explicitement le besoin de rappels d’horaires lorsque la page est
   totalement tuée : cron Push serveur (horaire approximatif) ou notifications
   natives Capacitor (horaire local exact). Un `setTimeout` seul ne garantit pas
   cette propriété.
4. Ajouter une page de diagnostic exportable indiquant navigateur, permission,
   Service Worker, endpoint enregistré, dernière livraison et dernier échec.
5. Tester chaque changement sur Android Chrome, iOS/iPadOS PWA installée,
   navigateur de bureau, mode avion, multi-onglets et deux comptes utilisant
   successivement le même profil navigateur.

## Références plateforme

- Web Push pour les web apps installées sur iOS/iPadOS :
  <https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/>
- Cycle de vie des pages et gel en arrière-plan :
  <https://developer.chrome.com/docs/web-platform/page-lifecycle-api>
- Limites et planification des cron Vercel : <https://vercel.com/docs/cron-jobs>
