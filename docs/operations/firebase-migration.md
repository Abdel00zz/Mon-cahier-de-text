# Migration Firestore et Authentication

La migration conserve l'URL Vercel, les contrats HTTP, les cookies de session et le moteur local Web/PWA/Android. Firebase Authentication vérifie les mots de passe des enseignants ; Firestore remplace le stockage serveur. Le runtime Vercel est fixé à Node 24 LTS, compatible avec le SDK Admin et ses dépendances ESM. L'adaptateur conserve les révisions, les dates imposées par la direction et les associations de notifications. Il ne remplace pas encore les appels de synchronisation par des écouteurs Firestore clients.

## Données et sécurité

Le SDK Admin est fixé à 13.10.0 : la branche 14 charge une dépendance CommonJS/ESM incompatible avec le chargeur Vercel observé. Le contrôle `check:api` désactive l'interopération expérimentale de `require()` pour reproduire cette contrainte, même sur Node 24. Réévaluer ce verrou lors d'une mise à jour du SDK, avec les tests et une preuve de fonctionnement sur Vercel. [Incident SDK](https://github.com/firebase/firebase-admin-node/issues/3181).

- `users/{uid}/private/account` contient le compte serveur ; `workspace` conserve classes, paramètres et boîte de réception ; `notebooks` conserve les cahiers. Les identifiants techniques sont dérivés du téléphone. Cette adresse interne ne fournit pas une récupération de mot de passe par e-mail.
- Les valeurs JSON volumineuses sont découpées en fragments UTF-8 de 600 000 octets, lus et remplacés dans une transaction. Les révisions empêchent les écritures concurrentes périmées ; les versions protègent les publications globales.
- `teacher_snapshots` et les index de notifications sont réservés au serveur. Les règles refusent tout accès direct depuis un SDK client, même authentifié. Les API contrôlent session, blocage, propriétaire et limites de taille.
- Aucun index composite n'est nécessaire pour les requêtes actuelles. Les sept exemptions du champ `json` évitent d'indexer le contenu des cahiers ; `firestore.indexes.json` est la source de configuration.
- Les clés privées restent hors du dépôt, des bundles Web et de l'APK. Les dépendances Firebase Web sont utilisées uniquement pour les tests de règles.

## Procédure de bascule

1. Exécuter `npm run check`, `npm test`, `npm run test:firebase` et `npm audit --omit=dev` sur la révision à publier.
2. Vérifier le projet `cahier-text`, `(default)`, région `nam5`, et activer Authentication e-mail/mot de passe. Les mots de passe Node scrypt utilisent **STANDARD_SCRYPT**, pas SCRYPT Firebase. `scripts/firebase/verify-auth.ts` vérifie un compte QA unique puis le retire.
3. Vérifier les règles et exemptions avec `node scripts/firebase/deploy-cloud.mjs --credentials <JSON protégé>`. Ajouter `--apply` pour publier. Le compte de service peut publier les règles, mais la création d'exemptions exige un compte autorisé à administrer les index. La console peut appliquer les mêmes exemptions sans élargir les droits du serveur.
4. Inventorier la source avec `npm exec tsx scripts/firebase/inspect-source.ts -- --source-env <fichier protégé>`. Cette base Redis est partagée avec d'autres modules : seuls les noms exacts reconnus dans `source-scope.ts` seront importés.
5. Déployer temporairement `CLOUD_MIGRATION_FREEZE=1` et vérifier une réponse HTTP 503 sur les API. Les données locales restent disponibles. Interrompre aussi les autres clients/anciens déploiements susceptibles d'écrire dans la même source.
6. Exporter d'abord sans `--apply` : `npm run firebase:migrate -- --credentials <JSON protégé> --source-env <env protégé> --backup <nouveau fichier hors dépôt> --source-frozen`. Le fichier contient toutes les clés source, y compris les modules exclus. Protéger le dossier par ACL Windows ; ne jamais publier cette sauvegarde.
7. Relancer avec un nouveau chemin de sauvegarde et `--apply`. Le script refuse d'écraser une valeur cible différente, conserve les mots de passe et compare les données importées. Ne pas employer `--initialize-empty` lorsqu'une base existe.
8. Vérifier les données importées et l'absence de nouvelles écritures côté Redis avant la bascule. Configurer `CLOUD_PROVIDER=firestore`, `FIREBASE_WEB_API_KEY` et les trois variables serveur `FCM_*` ; conserver `AUTH_SECRET`, `ADMIN_SECRET`, VAPID et CRON. Mettre `CLOUD_MIGRATION_FREEZE=0`, redéployer et vérifier connexion, synchronisation, administration et messages.

## Exploitation et retour arrière

L'export ne supprime ni ne modifie la source. Une fois Firestore utilisé, Redis devient périmé : ne jamais remettre aveuglément `CLOUD_PROVIDER=redis`. Suspendre les écritures, sauvegarder Firestore, réconcilier les changements depuis la bascule, puis vérifier la restauration avant de réouvrir l'ancien backend. Les règles testées, la sauvegarde, le journal d'import et la révision Git doivent accompagner toute évolution du schéma.

Le budget d'appels en erreur utilise `expiresAt` et ignore immédiatement les enregistrements expirés. Leur nettoyage physique par TTL Firestore doit être activé séparément si souhaité ; il n'est pas supposé actif. Le blocage est contrôlé par les API à chaque requête ; les données déjà présentes hors ligne ne peuvent pas être retirées d'un appareil déconnecté. Le cache et les notifications Android restent ceux de la version existante ; cette migration serveur ne nécessite pas de nouvelle signature APK.
