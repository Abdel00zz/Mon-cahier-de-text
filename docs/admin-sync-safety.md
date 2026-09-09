# Garanties admin / synchronisation

## Écritures par compte

`beginAccountWrite(redis, phone)` doit être appelé **avant toute lecture** dont
une écriture dépend. Ajouter les opérations au lot, puis appeler `exec()` une
seule fois. La révision du compte est comparée dans le même script Redis que les
écritures des classes, cahiers et projections. Un conflit renvoie HTTP 409 et
`WRITE_CONFLICT`, sans appliquer le lot. Le client conserve sa file et réessaie.

Ne jamais effacer `revision:account:*` lors d'une suppression : la révision
empêche une requête ancienne de réécrire après suppression/recréation du compte.
Les futurs points d'écriture des classes et cahiers doivent utiliser ce contrat.

## Diffusion vers les interfaces

- Application visible : pull toutes les 15 s et au retour en ligne/au premier plan.
- Vue d'ensemble admin : rafraîchissement discret toutes les 30 s.
- Aucun rafraîchissement périodique des formulaires admin en cours d'édition.
- Un push ou une saisie invalide le pull en vol ; les téléchargements sont
  préparés avant les écritures locales. Le changement de compte invalide aussi
  les réponses. Les versions locales perdantes des cahiers sont archivées.
- Les réglages identiques déjà appliqués ne sont pas réappliqués à chaque tick.

## Imports et publications

`composeAdminLessonImport` applique le diagnostic initial après composition du
cahier final, en ajout comme en remplacement, et conserve la direction du cahier
existant en mode ajout. Un diagnostic déjà présent est conservé et remonté.

`saveVersionedDocument` protège calendrier, bulletin et horaires. Fournir la
version embarquée comme version initiale pour les documents absents de Redis.
La version d'un JSON importé n'est pas la version de publication : l'interface
bulletin garde séparément la version serveur chargée à l'ouverture.

## Connexion admin

Budget atomique : 8 tentatives par adresse sur 15 minutes, puis HTTP 429 avec
`Retry-After`. Seul `x-vercel-forwarded-for` sur Vercel identifie l'adresse ; hors
Vercel, une limite commune s'applique plutôt que de croire un en-tête client.
Référence : https://vercel.com/docs/headers/request-headers#x-vercel-forwarded-for

## Vérification

`npm run test:admin-sync` couvre les contrats avec un modèle Redis en mémoire
(pas un interpréteur Lua). Compléter par les tests pilotage, notifications,
éditeur, account-workspace, `check:architecture` et `build`.

Après déploiement sur un environnement de test : ouvrir deux sessions admin,
publier simultanément le même calendrier et vérifier un succès / un conflit ;
importer un cahier pendant une saisie professeur ; vérifier la propagation sans
rechargement, la copie de récupération et le retour hors ligne/en ligne ; tester
le blocage de la neuvième tentative admin et l'expiration du délai. Ne pas utiliser
des comptes réels pour ces essais de concurrence ou de limitation.
