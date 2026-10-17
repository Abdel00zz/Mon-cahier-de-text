# Android, synchronisation et infrastructure — 17 octobre 2026

## Changements réalisés

### Paramètres de classe et contenus

Les paramètres de chaque classe portent désormais `metadataUpdatedAt`, indépendant de la date de modification du cahier. Changer le groupe, le nom ou la matière déclenche un envoi rapide. Une ancienne copie envoyée avec un cours plus récent ne peut plus rétablir l’ancien groupe. Le téléchargement des paramètres ne dépend plus d’une modification du contenu. La dernière édition datée professeur/admin gagne ; les anciens clients non horodatés ne remplacent pas une édition datée.

La restauration volontaire d’une sauvegarde renouvelle également la version des paramètres. L’ouverture d’une carte ne renouvelle pas cette version. Une modification administrative de l’identité ne change plus l’horloge des cours.

À horodatage identique, la version déjà acceptée par le serveur fait autorité et les clients convergent vers elle.

La réception reste automatique au premier plan et au retour dans l’application, avec un intervalle normal de 60 secondes, ralenti en économie de données et après erreur. Ce mécanisme ne promet pas une réception instantanée. Le compte doit être le même et connecté sur les deux appareils ; les changements hors ligne restent en attente. Les anciens APK doivent être actualisés pour bénéficier de la nouvelle fusion des paramètres.

### Saisie Android

Les notes utilisent `inputMode="decimal"`, sans correction orthographique ni autocomplétion. La touche Suivant passe à la prochaine note visible ; à la dernière note elle ferme le clavier. Les chiffres arabes et les séparateurs décimaux restent acceptés par l’analyse des notes. Le choix graphique du clavier dépend du clavier installé sur Android. Le manifeste utilise déjà `adjustResize`.

### Coûts et stockage

- Suppression de l’attente active qui relisait Firestore toutes les 1,5 seconde pour les messages. Firestore utilise le rafraîchissement au premier plan et les notifications FCM Android déjà intégrées. La réponse sans signature arrête aussi cette boucle sur les anciens clients compatibles. Redis conserve son mécanisme existant.
- Une sauvegarde de cahier strictement identique ne réécrit plus `localStorage`, n’avance plus l’horloge et ne lance plus de synchronisation. Une vraie modification conserve les protections de quota, de récupération et d’isolement par compte.
- Aucun raccourcissement du délai de scrutation cloud : une réception plus rapide obtenue uniquement par davantage de lectures augmenterait les coûts.

Firestore facture notamment les lectures de documents et les écritures ; la réduction exacte doit être mesurée sur la facturation du projet, pas déduite d’un test local. [Tarification officielle](https://firebase.google.com/docs/firestore/pricing).

## Évaluation de la capacité à monter en charge

| Zone | Constat | Suite recommandée |
| --- | --- | --- |
| Isolation | Données professeur sous UID, cahiers séparés, transactions de révision par compte | Conserver ce cloisonnement ; pas de verrou global entre enseignants |
| Gros cahiers | Compression du transport et découpage UTF-8 Firestore existants | Surveiller taille des comptes, latence et nombre de fragments |
| Réglages | Un document logique par compte, pouvant être fragmenté | Extraire les enregistrements très volumineux si les mesures justifient une migration |
| Administration | L’aperçu charge tous les snapshots (`hgetall`) | Pagination serveur avant un déploiement à grande échelle ; le coût croît avec le nombre de professeurs |
| Stockage local | Écriture synchrone et quota limité ; récupération/quarantaine déjà testées | Pour de gros volumes hors ligne, préparer une migration versionnée vers IndexedDB ou SQLite, avec import vérifié et retour arrière |
| Messagerie | Les sondes rapides Firestore sont supprimées ; le snapshot de badge conserve une transaction | Mesurer les lectures/écritures restantes avant de modifier le mécanisme d’ordre des badges |

Pas de test de charge distribué ni d’accès aux chiffres de facturation dans cet audit : aucun nombre maximal d’utilisateurs simultanés n’est certifié.

## Google Play

Le projet cible déjà Android API 36, conforme au niveau demandé pour les nouvelles soumissions ordinaires au moment de cet audit. [Exigences Google Play](https://developer.android.com/google/play/requirements/target-sdk).

Le plugin `NativeUpdates` et Play App Update 2.1.0 sont déjà présents : téléchargement flexible, demande utilisateur, reprise de l’état téléchargé et redémarrage différé. Le pipeline existant produit un AAB signé et un APK release, vérifie la signature et conserve les métadonnées de compilation. Il faut garder l’identifiant `ma.cahier.textes`, la chaîne de signature correcte et augmenter `versionCode` à chaque version distribuée.

Le test réel de mise à jour nécessite une installation issue de Google Play et une version supérieure accessible au compte de test. Un APK installé manuellement ne prouve pas ce parcours. [Tester les mises à jour intégrées](https://developer.android.com/guide/playcore/in-app-updates/test).

L’APK debug construit pendant l’audit ne contient aucune bibliothèque `.so`. Le contrôle doit être répété sur l’AAB release final ; un test sur environnement 16 Ko reste recommandé. [Compatibilité des pages mémoire](https://developer.android.com/guide/practices/page-sizes).

Avant la piste interne : numéro de version inédit, AAB signé, certificats Play App Signing ajoutés aux services de connexion, fiche confidentialité/Data safety, déclaration des permissions réellement utilisées et tests de connexion, clavier, hors ligne, synchronisation et mise à jour avec conservation des données. Aucun dépôt sur Play Console ni déploiement cloud n’a été effectué ici.

## Validation

- Suite `npm test` réussie.
- Build web, contrôle des traductions, architecture, API, données et recherche de secrets réussis. Le contrôle global `npm run check` reste bloqué par l’audit de fichiers et exports inutilisés, notamment d’anciens composants visuels ; ils n’ont pas été supprimés dans cette intervention.
- Tests Firebase en émulateur : groupe modifié sur un appareil, contenu modifié sur un autre, ancien groupe non rétabli ; isolement, transactions et listes d’élèves.
- APK debug final construit : environ 9,11 Mo. Aucun appareil Android réel n’a servi à confirmer le comportement du clavier ou une installation Play dans cet audit.
- Le build Android signale un chunk principal d’environ 362 Ko pour un budget indicatif de 320 Ko : ce point de chargement reste à profiler avant d’ajouter des dépendances.
