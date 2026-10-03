# Architecture, circuits et livraison Android — 3 octobre 2026

## Résultat

La version Android **1.2.7 / code 9** inclut la migration Firebase, les améliorations des modales et une protection supplémentaire des données locales. Le commit source des binaires est `147a306930f5b9c24e2566042c1c54552bbd14a7`, avec un arbre de travail propre lors de la compilation.

Un JSON local illisible pouvait auparavant être remplacé par `[]` dans le chemin de synchronisation. La lecture stricte distingue maintenant une donnée absente d'une donnée endommagée, valide l'instantané avant tout envoi et protège les copies locales concernées avant un remplacement cloud. La file de modifications reste en attente ; l'état devient « Erreur » avec une indication de restauration en français, anglais ou arabe.

La lecture stricte réutilise le cache partagé borné à 24 cahiers. Une vérification cloud sans changement ne reparcourt pas tous les cours. Les responsabilités de lecture ont été retirées du contexte React au profit de l'infrastructure de stockage et de synchronisation.

## Circuits contrôlés

| Circuit | Preuves et portée |
| --- | --- |
| Architecture | 271 modules contrôlés, domaine indépendant de React, primitives indépendantes des écrans et aucun import client de code privé `api/`. Contrôles TypeScript et code inutilisé réussis. |
| Connexion et isolation | Tests de session, changement de compte, réponses obsolètes, blocage et suppression. Les API de production `auth?action=me`, `sync` et `admin` refusent une requête anonyme avec HTTP 401 JSON. |
| Synchronisation / direction | Révisions concurrentes, imports administratifs, dates prioritaires, suppressions durables, conservation du texte arabe et reprise après échec couvertes par les tests. Six tests ajoutés pour les instantanés locaux, les données illisibles et le cache. |
| Firebase | Dix tests d'intégration Auth/Firestore réussis. Règles déployées identiques au dépôt ; sept exemptions JSON actives. Les règles refusent les clients directs ; les API Admin contrôlent les autorisations métier. |
| Sauvegarde / import | Validation préalable et rollback des échecs de stockage couverts. Archive cloud chiffrée de 76 documents relue, puis restaurée dans une base d'émulateur vide avec comparaison exacte. Aucune restauration de production effectuée. |
| Notifications | Contrats de livraison, compteurs, lecture, transfert d'appareil, rotation de jeton et désinscription tardive couverts, dont les transactions Firestore des associations. La réception physique n'est pas prouvée par ces tests. |
| Mises à jour | PWA : déploiement différé pendant les saisies/modales/sauvegardes. Android : distinction Play/APK, vérification du certificat et version supérieure. Le manifeste public `native-release.json` répond encore HTTP 404 : aucune mise à jour APK en ligne n'est annoncée. |

Les routes actuelles utilisent Node.js sur Vercel avec Firebase Admin. La documentation distingue maintenant les transactions Firestore du fournisseur Redis historique ; aucun remplacement arbitraire par un runtime Edge ou une Cloud Function n'a été réalisé.

## Livraison signée

- `npm run release -- --serial emulator-5580` réussit : **329 tests**, vérifications complètes, builds Web/PWA et Android, `lintRelease`, signatures et ressources hors connexion.
- APK : `artifacts/android/mon-cahier-de-textes-1.2.7-release.apk`, **3 544 333 octets**.
- AAB : `artifacts/android/mon-cahier-de-textes-1.2.7.aab`, **4 229 187 octets**.
- Certificat identique à la version 1.2.6 ; signatures APK v1/v2 vérifiées. Aucun fichier de compte de service, keystore privé ou entrée d'administration dans les chemins du paquet inspecté.
- Installation en mise à jour réussie, démarrage à froid et activité au premier plan pendant 20 secondes sur l'émulateur Android 13. La capture montre l'accueil rendu, pas seulement un processus actif.
- Les avertissements de taille du chunk Web et de métadonnées JAR restent présents ; ils ne sont pas des échecs de compilation ou de signature.

Les journaux, empreintes, `release.json`, `validation.json` et capture sont conservés dans `artifacts/android/` et `artifacts/firebase/`, hors Git. Les clés privées restent hors du dépôt.

## Points à terminer pour l'exploitation et la publication

1. Tester sur la Samsung Tab S7 : connexion, synchronisation aller-retour, permission et réception FCM à application fermée, impression et conservation du cahier après mise à jour. Les essais sur émulateur ne valident pas ces parcours sur ce matériel.
2. Envoyer l'AAB dans la piste interne Play, terminer la fiche et les déclarations, puis valider le vrai circuit Play. L'APK et l'AAB sont préparés ; aucune publication Google Play n'est effectuée par cette compilation. [Signature et distribution Android](https://developer.android.com/studio/publish/app-signing).
3. Pour le canal APK direct, publier le fichier signé puis générer et déployer son manifeste vérifié. Le fichier local seul n'active pas les futures mises à jour en ligne.
4. Les champs `expiresAt` de `cloud_records` et `private` n'ont pas de politique TTL configurée. Le serveur refuse logiquement les valeurs expirées, mais leur effacement physique n'est pas automatisé. Une politique sur les enregistrements temporaires doit être étudiée selon le budget ; les suppressions TTL sont facturées et ne remplacent pas les contrôles d'expiration côté serveur. Aucun service payant n'a été activé. [Rétention Firestore TTL](https://firebase.google.com/docs/firestore/ttl).
5. La sauvegarde vérifiée est `firestore-only` : conserver séparément Firebase Authentication et les secrets. Les sauvegardes gérées/PITR restent dans le périmètre d'exploitation décrit par [l'audit Firebase](firebase-connections-2026-10-03.md).
6. La vérification IAM des clés du compte de service répond HTTP 403. Ce contrôle ne permet pas de confirmer la révocation de la clé anciennement partagée ; le propriétaire doit vérifier cette révocation dans IAM. La nouvelle clé privée n'est jamais affichée ni embarquée.

Voir [l'architecture des circuits](../architecture/architecture.md) et [les procédures Android](../operations/android.md).
