# Application Android

Le projet `android/` produit une application Capacitor installable, avec le cahier embarqué dans l’APK. Les API de connexion, de synchronisation, de messages et de calendrier utilisent `https://mon-cahier-de-text.vercel.app`. L’application ouvre ses contenus locaux sans charger tout le site à chaque lancement.

## Compiler

Prérequis : Node.js, Java 21 et Android SDK avec `platforms;android-36`, `build-tools;35.0.0` et `platform-tools`. Définir `JAVA_HOME` et `ANDROID_HOME` vers les installations locales. La configuration du SDK, les caches, les APK/AAB et les clés de signature sont exclus de Git. La compilation cible Android 16 (API 36), exigé pour les nouvelles soumissions Google Play depuis le 31 août 2026.

```bash
npm ci
npm run android:apk
```

Le script compile les ressources dans `dist-android/`, synchronise les plugins, lance `assembleDebug`, puis copie l’application et son empreinte SHA-256 dans `artifacts/android/`. Le Gradle Wrapper vérifie l’empreinte officielle de sa distribution.

```text
artifacts/android/mon-cahier-de-textes-debug.apk
artifacts/android/mon-cahier-de-textes-debug.apk.sha256
```

Sur cette machine, une chaîne Java / SDK / Gradle portable est également disponible dans `tmp/android-toolchain/`. Le script peut la détecter sans modifier les variables système. Ce dossier temporaire n’est pas requis sur une autre machine disposant des prérequis.

Pour développer dans Android Studio : `npm run android:sync`, puis `npm run android:open`. Toute modification du cahier doit être recompilée et synchronisée avant de relancer l’application native. Une modification de `VITE_NATIVE_API_ORIGIN` nécessite une nouvelle compilation ; cette valeur doit être une origine HTTPS sans chemin ni identifiants.

## Intégration au téléphone

| Fonction | Comportement |
| --- | --- |
| Retour Android | Ferme d’abord le clavier ou le dialogue, revient à la liste des classes, puis minimise à l’accueil |
| Clavier et barres système | Insets Android appliqués au conteneur pour protéger les actions et le contenu |
| Thème | Couleur réelle du fond appliquée aux barres système ; icônes claires/sombres, icône adaptative monochrome |
| Interactions | Retours tactiles natifs ; vibration des rappels suivant le réglage du cahier |
| Réseau | Transport HTTP natif pour les API HTTPS ; authentification par les cookies du serveur |
| Hors connexion | Ressources du cahier embarquées et stockage local existant ; synchronisation à la reconnexion |
| Impression | Plugin natif `capacitor-webview-print` déjà utilisé par le projet |
| Notifications | Permission Android explicite, icône monochrome, ouverture de la classe concernée |

Les réponses réseau tardives et les actions issues des rappels restent soumises au contrôle du compte actif. Les requêtes natives ont des délais réseau bornés ; l’annulation logique empêche d’utiliser une réponse obsolète, sans garantir l’arrêt de la requête HTTP déjà envoyée.

## Rappels et autonomie

Les rappels de fin de séance sont planifiés par Android : aucun service permanent ni interrogation réseau en arrière-plan. Le planning couvre les 14 prochains jours, avec au maximum 64 alarmes. Il est recalculé lors des changements de configuration, des synchronisations et du retour dans l’application. Les horaires utilisent le fuseau `Africa/Casablanca`, même si le téléphone change de fuseau.

Les règles du détecteur partagé s’appliquent : classes présentes, séances continues, délai choisi, année scolaire, repos hebdomadaire, absences et congés selon le réglage de silence. Les alarmes sont désactivées avec les rappels ou le compte. Le contenu du message suit la langue du cahier.

Les alarmes utilisent une planification économe, sans permission d’alarme exacte ni `allowWhileIdle`. Android peut donc retarder un rappel en veille profonde. Ouvrir régulièrement l’application renouvelle son horizon de deux semaines. Les alertes de dates manquantes continuent d’être évaluées au premier plan, sur les données réellement saisies.

L’APK ne dispose pas encore de notifications distantes Firebase Cloud Messaging. Les messages de l’administration se synchronisent au retour dans l’application ; une réception native à application fermée nécessite un projet Firebase, son fichier de configuration Android et un transport FCM côté serveur. Les notifications Web Push de la PWA restent indépendantes.

La compilation native désactive le service worker et exclut l’entrée d’administration. Les vérifications périodiques du cloud s’arrêtent quand l’application est masquée, hors ligne ou en pause native.

Les animations CSS s’arrêtent en arrière-plan. La barre d’actions tactile utilise une surface plus opaque et un flou réduit. Les polices principales sont locales, sans requêtes vers Google Fonts. Les scans JPEG de recherche et les anciennes démonstrations GIF sont exclus du paquet Android ; les données de cours, le calendrier, les captures du guide et les licences des polices restent embarqués.

## Validation et distribution

Avant une distribution : exécuter `npm test` et `npm run check`, compiler l’APK, vérifier sa signature avec `apksigner`, puis tester sur un téléphone réel : connexion / déconnexion, changements de compte, synchronisation aller-retour, clavier arabe, impression, permission de notifications, rappel écran verrouillé et reconnexion.

L’APK `debug` est destiné aux essais. Le paquet `release` est réduit avec R8 et la suppression des ressources inutilisées. Les plugins Capacitor et les icônes résolues par nom sont conservés. Les sauvegardes automatiques Android des cookies et données du compte sont exclues, y compris les transferts entre appareils ; utiliser la synchronisation authentifiée ou l’export du cahier.

## Signature et Google Play

Pour une **nouvelle application** dans Play Console, une clé d’envoi a été générée localement (RSA 4096, validité 30 ans). Si l’application existe déjà dans Play Console, utiliser sa clé d’envoi enregistrée ou suivre la procédure Google de remplacement ; une clé nouvellement générée ne remplace pas automatiquement une identité déjà publiée.

```bash
npm run android:signing
npm run android:release
```

`android:signing` conserve toujours une clé existante. Sous Windows, elle vit dans `%LOCALAPPDATA%/MonCahierDeTextes/signing/upload-keystore.p12`, hors du dépôt et avec accès limité au compte Windows. Le mot de passe aléatoire est protégé par DPAPI dans `credentials.dpapi.json` et n’est jamais imprimé par les scripts. La lecture interne `signing.ps1 -Mode Read` est réservée au processus de compilation : son résultat contient des secrets, ne pas la lancer dans des journaux partagés.

**Sauvegarder la clé et son mot de passe dans un coffre personnel avant de changer d’ordinateur ou de compte Windows.** La protection DPAPI dépend de ce compte Windows : copier uniquement `credentials.dpapi.json` sur une autre machine ne permet pas de récupérer le mot de passe. Le certificat public `upload-certificate.pem` peut être transmis à Play Console ; le fichier `.p12` et les mots de passe doivent rester privés.

Une sauvegarde portable chiffrée est disponible : définir `ANDROID_SIGNING_BACKUP_PASSWORD` avec une phrase secrète personnelle d’au moins 16 caractères, puis lancer `npm run android:signing:backup`. Conserver `artifacts/android/signing-backup.encrypted.json` séparément de cette phrase secrète. Le fichier contient la clé et ses mots de passe, protégés par scrypt et AES-256-GCM. Il n’est jamais envoyé à GitHub et une sauvegarde existante n’est jamais écrasée. La phrase secrète choisie doit être conservée dans votre gestionnaire de mots de passe.

Sur une nouvelle machine Windows, définir la même variable et lancer `npm run android:signing:restore -- chemin/vers/signing-backup.encrypted.json`. La restauration vérifie l’intégrité avant toute écriture, réapplique la protection du nouveau compte Windows et refuse d’écraser une clé existante. Effacer la variable de la session après ces opérations. Les clés PKCS12 créées par le projet partagent leur mot de passe de clé et de magasin, condition vérifiée lors de la restauration.

Sur une autre machine ou en CI, fournir les quatre variables privées `ANDROID_UPLOAD_STORE_FILE` (chemin absolu du keystore), `ANDROID_UPLOAD_STORE_PASSWORD`, `ANDROID_UPLOAD_KEY_ALIAS` et `ANDROID_UPLOAD_KEY_PASSWORD`. Elles sont lues par Gradle et ne doivent jamais porter le préfixe `VITE_`. Une compilation de production sans clé échoue explicitement, même en lançant Gradle directement.

La commande produit, dans `artifacts/android/` :

* `mon-cahier-de-textes-1.2.0.aab` : fichier signé à envoyer à Google Play ;
* `mon-cahier-de-textes-1.2.0-release.apk` : APK signé pour essais directs ;
* leurs empreintes SHA-256, le certificat public, `release.json` et `mapping-1.2.0.txt` pour diagnostiquer le code réduit.

La compilation exécute aussi `lintRelease`, `jarsigner -verify` et `apksigner verify`. Dans Play Console, activer **Play App Signing** avec une clé de signature gérée par Google et utiliser le certificat d’envoi pour les prochains AAB. Google signe les APK distribués aux utilisateurs. L’APK direct et l’installation Play peuvent donc avoir des certificats différents : tester le vrai circuit de mise à jour sur la piste de test interne Play.

L’ancien APK de test 1.1.0 possède une signature debug, incompatible avec la signature release malgré un nom de paquet identique. Avant de remplacer cette installation, vérifier la synchronisation cloud ou exporter une sauvegarde. La désinstallation efface ses données locales. Les versions Play suivantes, distribuées avec la même identité, conservent les données locales lors de la mise à jour.

Le fichier signé prépare l’envoi, sans effectuer de publication. Restent à faire dans le compte du propriétaire : création de la fiche, inscription Play App Signing, déclarations de confidentialité / sécurité des données / suppression de compte, piste de test et validation sur appareils. Les exigences du compte Play (dont les tests préalables selon le type de compte) restent à vérifier dans la console. Firebase n’est pas configuré par cette signature.

## Versions et mises à jour futures

`package.json` est la source unique : `version` est affichée à côté du créateur au bas du guide et utilisée comme `versionName`, `androidVersionCode` est le numéro de compilation Android.

```bash
npm run android:version -- 1.2.1
npm test
npm run check
npm run android:release
```

La première commande augmente les deux versions et actualise le verrouillage npm. Ne jamais réutiliser un `versionCode` déjà envoyé à Play. Envoyer ensuite le nouvel AAB avec **la même clé d’envoi** et déployer d’abord sur la piste interne. Un retour arrière Android exige une nouvelle compilation avec un `versionCode` supérieur ; ne pas tenter de redistribuer un ancien numéro.

| Changement | Circuit |
| --- | --- |
| Interface Android, ressources, plugins, permissions | Nouvelle compilation AAB, nouvelle version, validation et diffusion Google Play |
| Services cloud / messages administratifs | Déploiement serveur ; conserver la compatibilité avec les anciennes versions encore installées |
| Interface Web / PWA | Déploiement Web ; service worker activé après la fin des saisies, dialogues et sauvegardes |

Dans l’application Android, le guide propose la vérification des mises à jour. Google Play peut télécharger une mise à jour **flexible** pendant que le professeur continue à travailler. L’installation est demandée explicitement puis attend la fermeture du guide, des autres dialogues et la fin des sauvegardes/saisies. Les erreurs et annulations restent récupérables. Il n’y a pas d’interrogation périodique pour les mises à jour, ni de téléchargement de code depuis le serveur Web.

Ce circuit nécessite une application installée depuis Google Play et une version plus récente disponible pour le compte/piste de test. Sur un APK direct, une absence de service Play ou un échec de vérification n’affiche jamais à tort « à jour » : le guide indique le circuit Play. Valider téléchargement, annulation, fin du téléchargement après fermeture du guide, installation et conservation du cahier sur la piste interne avant la diffusion publique.

La PWA vérifie à nouveau son worker au retour à l’écran après une heure, sans minuteur en arrière-plan. Les vérifications automatiques respectent le mode économie de données et l’absence de réseau ; une erreur réessaie au prochain retour après dix minutes. L’application native conserve son origine locale `https://localhost` et les clés de stockage existantes entre versions.

Références : [signature Android et Play App Signing](https://developer.android.com/studio/publish/app-signing), [niveau API Google Play](https://developer.android.com/google/play/requirements/target-sdk), [mises à jour intégrées](https://developer.android.com/guide/playcore/in-app-updates/kotlin-java), [Capacitor Android v7](https://capacitorjs.com/docs/v7/android), [HTTP natif](https://capacitorjs.com/docs/v7/apis/http), [notifications locales](https://capacitorjs.com/docs/v7/apis/local-notifications).
