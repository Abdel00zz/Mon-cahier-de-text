# Analyse des notifications — Cahier de textes

## Modèle actuel

Le système comporte trois couches qui ne doivent pas être confondues :

| Couche | Déclencheur | Peut fonctionner application fermée ? | Autorité |
| --- | --- | --- | --- |
| Alerte dans l’application | `useNotificationFeed` + préférences locales | Non | `notificationSettings.enabled` |
| Rappel local de séance | `useSessionAlerts` + `setTimeout` + Service Worker | Seulement tant que la page reste vivante (ou reprend rapidement) | appareil courant |
| Push serveur (APK) | `/api/notify` (routes natives) + FCM HTTP v1 | Oui, appareil inscrit | `push:native-owners`, `push:native:<téléphone>` |

La permission du navigateur, l’abonnement présent dans `PushManager` et
l’enregistrement du endpoint côté serveur sont trois états distincts. L’écran
des paramètres les affiche séparément et l’action `status` les réconcilie sans
redemander la permission.

## Flux d’activation

1. L’enseignant appuie explicitement sur « Activer les rappels ».
2. Android demande la permission système (une seule fois).
3. Le client enregistre l’appareil auprès de `POST /api/notify` (action native)
   avec son jeton FCM et un identifiant d’installation.
4. Firestore conserve l’association appareil ↔ téléphone (maximum cinq
   appareils) ; `push:native-owners` en garde l’index.
5. Le client ne marque `pushEnabled` que lorsque la permission et
   l’enregistrement sont confirmés.

À la désactivation, l’appareil est retiré des deux côtés ; une coupure réseau
laisse une entrée de nettoyage locale, rejouée à la prochaine ouverture.

Sur le web, il n’y a plus d’abonnement à créer : l’autorisation accordée suffit
aux rappels locaux de la page ouverte (voir « Web Push retiré »).

## Flux quotidien (tâche planifiée native — à venir)

Ce qui suit décrit l’ancien cron Vercel, retiré avec le Web Push. La tâche
planifiée native est en cours de reconstruction : elle doit alimenter le push
Android sans dépendre d’une page web ouverte.

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
de notifications. Le TTL serveur est de 24 h (5 min pour un test), afin qu’une
alerte périmée ne surgisse pas après un long mode avion.

## Présentation mobile et ciblage

`notificationPresentation` est partagé entre les rappels locaux et le service
worker : texte limité à 72 caractères pour le titre, 180 pour le corps,
direction et langue explicites, actions Ouvrir/Fermer selon le support système.
Le logo couleur reste l’icône principale. Le badge Android utilise un pictogramme
96 × 96 sur fond transparent, généré par `scripts/assets/generate-notification-badge.ps1` :
le masque Android appliqué à l’ancien carré opaque produisait un carré blanc.
Le badge fait partie du précache pour rester disponible hors connexion.

Le domaine et la couleur du petit pictogramme sont affichés par le navigateur
et le système ; l’application ne peut pas imposer leur masquage. Le rendu exact
doit être contrôlé sur le téléphone, séparément du rendu de l’interface web.

Un rappel portant sur une seule classe ouvre directement son cahier. Plusieurs
classes ouvrent la liste des notifications. Les textes conservent une formulation
prudente : l’écart avec l’emploi du temps reste une estimation. Le rappel local
affiche le délai réellement configuré, et une absence de date n’est pas présentée
comme une preuve que la séance n’a pas eu lieu.

Les tags limitent l’empilement à l’écran. Les tests demandés depuis les clients
récents ciblent uniquement leur propre appareil. Aucun envoi réel n’est
nécessaire aux tests automatisés.

## Lecture Node / Edge / State / LangGraph

- **Node/serveur** : authentification, Redis et FCM HTTP v1. Cette partie est
  durable et doit rester la seule source de vérité pour les notifications qui
  doivent arriver application fermée.
- **Edge/Service Worker** : réception du Push, affichage système et clic. Le
  clic est limité aux routes enseignant. Une fenêtre du cahier est préférée aux
  pages admin ; son document est conservé et la route est communiquée sans
  rechargement. La navigation attend la fin d’une saisie/modale. Un échec de
  focus ouvre une nouvelle fenêtre de l’application.
- **State** : `permission`, `subscribed`, `serverRegistered` et les préférences
  ne sont pas fusionnés en un booléen. Cette séparation rend les diagnostics et
  les migrations multi-appareils explicites.
- **LangGraph (futur)** : si une orchestration de rappels est ajoutée, chaque
  nœud devra être idempotent : `load snapshot → decide → claim delivery → send
  → record outcome`. Le claim doit porter une clé stable (téléphone, type,
  date, gravité) pour permettre reprise et observabilité sans doublon.

## Optimisations recommandées ensuite

### Améliorations réalisées le 2 octobre 2026

- Les séances se réveillent au début/à la fin, au rappel configuré et à minuit,
  sans intervalle de 15 secondes. Le jour marocain partage un seul minuteur,
  suspendu en arrière-plan, avec les changements de fuseau pris en compte.
- Les caches des programmes, polices et illustrations sont bornés et peuvent
  être purgés en cas de quota. La mémoire des cahiers conserve au plus 24
  cahiers ; cette éviction ne supprime aucune donnée locale. Les claims locaux
  de rappel sont bornés à 256 avec expiration à 48 heures.
- Activation et rechargement des nouvelles versions attendent un moment calme,
  sans champ actif, modale, sauvegarde ou action occupée. Un autre onglet qui
  active le worker déclenche aussi ce contrôle avant le rechargement.
- Les push conservent les champs des anciens workers et ajoutent un secours
  déclaratif Safari (`web_push: 8030`, notification avec destination). Le payload
  UTF-8 reste inférieur à 3 900 octets ; les cas volumineux gardent le format
  classique. Les préférences de vibration ne peuvent bloquer l’affichage plus
  de 500 ms.
- TTL : fin de séance 120 s, date manquante 15 min, test 5 min, bilan/admin 24 h.
  Les bilans utilisent une urgence basse et les messages admin normale ; aucun
  polling silencieux via Push. Les tags remplacent les alertes équivalentes.
- Une désactivation hors ligne conserve une demande de retrait par compte
  (maximum 5, durée 14 jours). « Terminer la désactivation » réessaie même quand
  l’abonnement local a déjà été supprimé. Le stockage indisponible limite ce
  mécanisme de reprise ; les endpoints expirés restent purgés côté serveur.
- « Activer les rappels », « Continuer l’activation », « Tester les rappels » :
  actions distinctes, occupées pendant l’opération, protégées contre doubles
  clics, fermeture, anciennes réponses et changements de compte. Aucun prompt
  de permission n’est lancé par les vérifications d’état.

### Vérification sur les téléphones

La réception native reste à tester sur appareils réels avec HTTPS et les clés
FCM du déploiement. Les simulations automatisées ne prouvent ni la livraison
APNs/FCM ni une baisse mesurée de consommation de batterie.

| Téléphone | Vérification native à effectuer |
| --- | --- |
| iPhone/iPad iOS 16.4+ | Installer sur l’écran d’accueil, ouvrir cette application, activer avec un geste et recevoir le test écran verrouillé. Contrôler Concentration et le nom/icône d’application. Le secours déclaratif concerne les versions Safari compatibles (introduit avec iOS 18.4). |
| Google Pixel / Chrome | Autoriser le site, recevoir le test application fermée, vérifier logo et petit badge transparent, toucher pour ouvrir le bon cahier. Refaire en économie d’énergie, qui peut retarder les alertes. |
| Samsung / Chrome ou Samsung Internet | Même parcours, vérifier le masque de l’icône installée, les notifications du navigateur/site et les restrictions du système. Le rendu exact et les boutons relèvent de la version du navigateur/OS. |

Le cron quotidien existant demeure à 17 h UTC. Les rappels horaires locaux ne
sont **pas garantis application fermée/suspendue** : un worker ne remplace pas
un ordonnanceur serveur ou un module natif. La PWA ne demande pas de contourner
les réglages de batterie du téléphone.

### Pistes restantes

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

Le rappel automatique quotidien dépend de la tâche planifiée native : il
alimente le push Android sans intervention de la page web.

## Web Push retiré

Le push navigateur (VAPID, `push:subs`, `push:endpoint-owners`, cron Vercel) a
été supprimé : seules les notifications de l’application Android passent par
`/api/notify` (FCM HTTP v1). Sur le web, le fil de messages et le badge
s’affichent à l’ouverture. Les anciennes entrées se purgent avec
`npm run firebase:purge-webpush` (simulation), puis `-- --apply`.

## Références plateforme

- Web Push pour les web apps installées sur iOS/iPadOS :
  <https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/>
- Cycle de vie des pages et gel en arrière-plan :
  <https://developer.chrome.com/docs/web-platform/page-lifecycle-api>
- Limites et planification des cron Vercel : <https://vercel.com/docs/cron-jobs>
- Secours déclaratif Safari : <https://webkit.org/blog/16535/meet-declarative-web-push/>
- Format standard : <https://w3c.github.io/push-api/#dfn-declarative-push-message>
- Notifications Pixel : <https://support.google.com/pixelphone/answer/6111294>
- Push Samsung Internet : <https://developer.samsung.com/browser/android/web-developer-guide.html>
