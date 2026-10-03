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

Si le fusionneur de ressources Android signale un cache incrémental incohérent après une modification d’icône, relancer `npm run android:release -- --clean`. Cette option nettoie uniquement les sorties de compilation du module Android avant de reconstruire et vérifier les fichiers signés.

## Intégration au téléphone

| Fonction | Comportement |
| --- | --- |
| Retour Android | Ferme d’abord le clavier ou le dialogue, revient à la liste des classes, puis minimise à l’accueil |
| Clavier et barres système | Insets Android appliqués au conteneur pour protéger les actions et le contenu |
| Thème | Couleur réelle du fond appliquée aux barres système ; icônes claires/sombres, icône adaptative monochrome |
| Interactions | Retours tactiles natifs ; vibration des rappels suivant le réglage du cahier |
| Réseau | Transport HTTP natif pour les API HTTPS ; authentification par les cookies du serveur |
| Connexion Google | Sélecteur système Credential Manager et vérification Firebase côté serveur ; voir [la configuration](firebase-sign-in.md) |
| Hors connexion | Ressources du cahier embarquées et stockage local existant ; synchronisation à la reconnexion |
| Impression | `NativePrint` ouvre l'aperçu A4 et suit le travail système ; une annulation n'enregistre aucune séance |
| Notifications | Permission Android explicite, icône monochrome, ouverture de la classe concernée |

Les réponses réseau tardives et les actions issues des rappels restent soumises au contrôle du compte actif. Les requêtes natives ont des délais réseau bornés ; l’annulation logique empêche d’utiliser une réponse obsolète, sans garantir l’arrêt de la requête HTTP déjà envoyée.

## Rappels et autonomie

Les rappels de fin de séance sont planifiés par Android : aucun service permanent ni interrogation réseau en arrière-plan. Le planning couvre les 14 prochains jours, avec au maximum 64 alarmes. Il est recalculé lors des changements de configuration, des synchronisations et du retour dans l’application. Les horaires utilisent le fuseau `Africa/Casablanca`, même si le téléphone change de fuseau.

Les règles du détecteur partagé s’appliquent : classes présentes, séances continues, délai choisi, année scolaire, repos hebdomadaire, absences et congés selon le réglage de silence. Les alarmes sont désactivées avec les rappels ou le compte. Le contenu du message suit la langue du cahier.

Les alarmes utilisent une planification économe, sans permission d’alarme exacte ni `allowWhileIdle`. Android peut donc retarder un rappel en veille profonde. Ouvrir régulièrement l’application renouvelle son horizon de deux semaines. Les alertes de dates manquantes continuent d’être évaluées au premier plan, sur les données réellement saisies.

Les messages non lus alimentent une notification native groupée et son compteur (`setNumber`). La lecture confirmée met à jour le compteur ; la déconnexion retire la notification et son association au compte, même hors ligne. Android décide d’afficher une pastille ou un nombre selon le lanceur et les réglages utilisateur : Pixel et Samsung ne proposent pas forcément le même rendu. Les nouveaux canaux de rappels/tests désactivent le badge pour ne pas gonfler le nombre de messages. Les réglages de canaux déjà créés restent sous le contrôle d’Android et de l’utilisateur.

La réception des messages de l’administration à application fermée utilise Firebase Cloud Messaging HTTP v1. Le projet `cahier-text` dispose maintenant d'une configuration Android locale et de trois variables serveur enregistrées dans Vercel Production. L'autorisation du compte de service a été vérifiée par un appel FCM de validation, sans envoyer de notification réelle. Chaque nouvelle machine de compilation et chaque nouveau déploiement doivent conserver leur configuration ; la présence du code seul ne suffit pas. Les rappels locaux et les notifications Web Push de la PWA restent indépendants.

### Configuration des messages distants Android

Projet indiqué par le propriétaire : `cahier-text`. Compte de service : `firebase-adminsdk-fbsvc@cahier-text.iam.gserviceaccount.com`. Ces deux identifiants publics figurent dans `.env.example` ; la clé privée serveur et le fichier `google-services.json` sont configurés séparément et exclus du dépôt. Le transport HTTP v1 authentifie ce compte sans ajouter l’ensemble du SDK Admin au serveur.

1. Dans votre projet Firebase, enregistrer l’application Android **`ma.cahier.textes`**, télécharger sa configuration et l’enregistrer dans `android/app/google-services.json` (ignoré par Git). Le client Firebase Android requiert les services Google Play ; aucun compte Analytics n’est nécessaire à cette implémentation.
2. Activer l’API Firebase Cloud Messaging HTTP v1. Sur Vercel, ajouter **uniquement côté serveur** `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY` pour un compte de service autorisé à envoyer des messages FCM. La clé privée ne doit jamais être incluse dans le fichier Android, une variable `VITE_*`, une capture ou le dépôt.
3. Redéployer le serveur et reconstruire un APK/AAB avec la même clé de signature et un numéro de version supérieur. Un fichier Firebase invalide bloque la compilation. La collecte Analytics et l’initialisation automatique du messaging sont désactivées ; l’enregistrement se fait après activation explicite des notifications.
4. Sur un appareil réel Pixel/Samsung, se connecter puis activer les notifications dans les paramètres du cahier. Le diagnostic « Messages de l’administration » doit indiquer « Enregistré ». Le bouton de test utilise alors le serveur FCM ; lorsqu’il n’est pas raccordé, il teste uniquement la notification locale.
5. Envoyer un message depuis l’administration, vérifier la réception à application fermée, le compteur, l’ouverture, l’accusé de lecture et une déconnexion hors ligne. Tester aussi le renouvellement du token et le changement de compte. Un arrêt forcé Android peut suspendre les réceptions jusqu’à la réouverture : ne pas le confondre avec une fermeture normale.

Les deux fichiers Firebase ont des rôles différents : `google-services.json` configure l’application Android ; le JSON contenant `private_key` authentifie uniquement le serveur. Garder ce second fichier dans un dossier privé hors du dépôt et du module Android. Le serveur lit ses trois valeurs via les variables FCM sur Vercel, jamais depuis les ressources de l’APK. Toute clé privée partagée dans un message doit être remplacée avant de poursuivre sa configuration.

Les envois FCM contiennent une association aléatoire à l’appareil, un compteur et un horodatage ; aucun texte confidentiel du professeur n’est exposé sur l’écran verrouillé. Le service natif refuse les associations révoquées et les compteurs anciens. Un token expiré est retiré du serveur ; une erreur transitoire le conserve. Le renouvellement du token est réconcilié au retour dans l’application. Avec Firebase, les inscriptions/transferts/retraits d’appareils utilisent des transactions Firestore et une limite de cinq appareils par compte. Un retrait serveur échoué reste sans effet local grâce à la révocation de l’association ; son entrée est récupérée à la prochaine inscription, à expiration du token ou à la suppression du compte.

La PWA utilise `setAppBadge`/`clearAppBadge` lorsqu’ils sont disponibles. Sur iOS/iPadOS, cela nécessite une application installée sur l’écran d’accueil et l’autorisation système correspondante. Le worker conserve le dernier compteur confirmé, refuse les push d’un autre compte et efface les notifications de messages après la lecture de la dernière. Une erreur réseau ne remplace pas le compteur par zéro. Sans réception d’un nouveau push, la lecture depuis un autre appareil est réconciliée à la prochaine ouverture/vérification au premier plan.

Tests natifs isolés : après `cap sync android`, lancer `:app:connectedDebugAndroidTest -PnotificationQa` sur un émulateur Android 13+. L’identifiant `.qa` évite toute modification des données de l’application de production. Cette variante ne charge pas la configuration Firebase de production, réservée au paquet `ma.cahier.textes`. Ces tests couvrent les canaux, le compteur, la lecture, les push dupliqués, les associations et la déconnexion ; ils ne remplacent pas un test FCM réel avec votre projet Firebase.

La compilation native désactive le service worker et exclut l’entrée d’administration. Les vérifications périodiques du cloud s’arrêtent quand l’application est masquée, hors ligne ou en pause native.

Les animations CSS s’arrêtent en arrière-plan. La barre d’actions tactile utilise une surface plus opaque et un flou réduit. Les polices principales sont locales, sans requêtes vers Google Fonts. Les scans JPEG de recherche et les anciennes démonstrations GIF sont exclus du paquet Android ; les données de cours, le calendrier, les captures du guide et les licences des polices restent embarqués.

La lecture confirmée depuis un autre appareil envoie également une réconciliation FCM silencieuse aux appareils Android, avec priorité normale. Vercel `waitUntil` termine cet envoi après la réponse, sans retarder le bouton de lecture. Le renouvellement d’un token remplace l’inscription de la même installation au lieu de consommer une place supplémentaire dans la limite des cinq appareils. Les retraits serveur échoués sont conservés localement, isolés par compte et association, avec au maximum cinq entrées pendant quatorze jours. Ils sont retentés au retour au premier plan, au rétablissement du réseau ou via « Terminer la désactivation », sans service permanent.

## Validation et distribution

Le compteur et son ordre de lecture sont lus dans une même transaction Firestore, avec une horloge commune aux instances serveur. Une livraison FCM retardée ne peut ainsi pas rétablir un compteur plus ancien après un accusé de lecture. Les contrats et ordres de livraison sont testés avec les émulateurs Firebase ; la réception réelle reste à vérifier sur les appareils de test.

Avant une distribution : exécuter `npm test` et `npm run check`, compiler l’APK, vérifier sa signature avec `apksigner`, puis tester sur un téléphone réel : connexion / déconnexion, changements de compte, synchronisation aller-retour, clavier arabe, impression, permission de notifications, rappel écran verrouillé et reconnexion.

Tester aussi le démarrage du fichier **release signé**, car les tests Web et une compilation réussie ne détectent pas les fermetures du processus Android. Sur un émulateur ou un appareil de test connecté, choisir explicitement son identifiant retourné par `adb devices`, puis lancer :

```bash
npm run android:smoke -- --serial emulator-5580
```

Ce contrôle installe la version signée en mise à jour, redémarre l’application et vérifie qu’elle reste au premier plan pendant 20 secondes. Il conserve les données locales. Les journaux sont enregistrés dans `tmp/android-startup-crash.log` et `tmp/android-startup-activity.log`. L’option `--apk chemin/vers/fichier.apk` permet de reproduire un problème avec une version précise. Ce contrôle ne remplace pas les essais des parcours et services sur appareil réel.

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

* `mon-cahier-de-textes-1.2.8.aab` : fichier signé à envoyer à Google Play ;
* `mon-cahier-de-textes-1.2.8-release.apk` : APK signé pour essais directs ;
* leurs empreintes SHA-256, le certificat public, `release.json` et `mapping-1.2.8.txt` pour diagnostiquer le code réduit. Les noms suivent toujours la version du projet.

La compilation exécute aussi `lintRelease`, `jarsigner -verify` et `apksigner verify`. Dans Play Console, activer **Play App Signing** avec une clé de signature gérée par Google et utiliser le certificat d’envoi pour les prochains AAB. Google signe les APK distribués aux utilisateurs. L’APK direct et l’installation Play peuvent donc avoir des certificats différents : tester le vrai circuit de mise à jour sur la piste de test interne Play.

L’ancien APK de test 1.1.0 possède une signature debug, incompatible avec la signature release malgré un nom de paquet identique. Avant de remplacer cette installation, vérifier la synchronisation cloud ou exporter une sauvegarde. La désinstallation efface ses données locales. Les versions Play suivantes, distribuées avec la même identité, conservent les données locales lors de la mise à jour.

Le fichier signé prépare l’envoi, sans effectuer de publication. Restent à faire dans le compte du propriétaire : création de la fiche, inscription Play App Signing, déclarations de confidentialité / sécurité des données / suppression de compte, piste de test et validation sur appareils. Les exigences du compte Play (dont les tests préalables selon le type de compte) restent à vérifier dans la console. Firebase n’est pas configuré par cette signature.

## Versions et mises à jour futures

`package.json` est la source unique : `version` est affichée à côté du créateur au bas du guide et utilisée comme `versionName`, `androidVersionCode` est le numéro de compilation Android.

```bash
npm run release -- --version 1.2.9 --serial emulator-5580
```

Le pipeline lance les tests et `npm run check`, augmente la version si `--version` est fourni, compile et vérifie les signatures/ressources, puis contrôle le démarrage sur l’appareil de test choisi. Il produit `validation.json` avec les résultats. Sans `--version`, il reconstruit la version courante. En CI sans émulateur, `--skip-smoke` marque explicitement ce contrôle comme non effectué. Il ne déploie pas le cloud et ne publie pas sur Google Play.

Ne jamais réutiliser un `versionCode` déjà distribué. Envoyer le nouvel AAB avec **la même clé d’envoi** et déployer d’abord sur la piste interne. Un retour arrière Android exige une nouvelle compilation avec un `versionCode` supérieur ; ne pas redistribuer un ancien numéro. `release.json` identifie les binaires par taille, SHA-256 et certificat, avec date de compilation, commit source et indication des modifications locales.

| Changement | Circuit |
| --- | --- |
| Interface Android, ressources, plugins, permissions | Nouvelle compilation AAB, nouvelle version, validation et diffusion Google Play |
| Services cloud / messages administratifs | Déploiement serveur ; conserver la compatibilité avec les anciennes versions encore installées |
| Interface Web / PWA | Déploiement Web ; service worker activé après la fin des saisies, dialogues et sauvegardes |

L’aide propose un contrôle de mise à jour commun à la PWA et à Android, dans la langue choisie. Google Play télécharge une mise à jour **flexible** pendant que le professeur travaille, avec progression lorsqu’elle est fournie par Play. La réouverture de l’aide ou le retour au premier plan avec l’aide ouverte retrouve le téléchargement. L’installation demandée attend la fermeture du guide, des autres dialogues et la fin des sauvegardes/saisies ; « Plus tard » annule cette installation différée. Les erreurs et annulations sont récupérables, sans interrogation périodique ni remplacement du code Android par une version Web.

Le circuit Play nécessite une installation depuis Google Play et une version plus récente disponible pour le compte/piste de test. Le plugin distingue le canal d’installation réel. Valider téléchargement, annulation, fin du téléchargement après fermeture du guide, installation et conservation du cahier sur la piste interne avant diffusion publique. Un échec réseau n’est jamais présenté comme une application à jour.

### Canal APK direct

L’APK vérifie `https://mon-cahier-de-text.vercel.app/native-release.json` uniquement à l’ouverture de l’aide ou à la demande. Ce fichier décrit **un APK réellement publié**, indépendamment de la version Web. Tant qu’il n’existe pas ou n’est pas valide, l’aide indique qu’aucun fichier de mise à jour n’a été publié.

1. Augmenter la version et compiler/tester le binaire avec la même clé.
2. Publier l’APK signé sur une release GitHub de ce dépôt ou sur le domaine de l’application.
3. Générer le manifeste avec `npm run android:publish-metadata -- https://github.com/Abdel00zz/Mon-cahier-de-text/releases/download/v1.2.8/mon-cahier-de-textes-1.2.8-release.apk` (adapter à la release réelle).
4. Le script télécharge le fichier public et vérifie son SHA-256 et sa taille avant d’écrire `public/native-release.json`. Il refuse le remplacement d’une version déjà annoncée par un binaire différent ou plus ancien. Déployer ensuite le manifeste.

Le client vérifie le paquet, le certificat correspondant à son installation, le numéro de compilation et l’origine HTTPS du lien. Le bouton ouvre le téléchargement dans le navigateur ; Android demande l’installation et contrôle lui-même la signature du fichier. Aucun fichier de mise à jour n’est installé silencieusement et aucune permission d’installation permanente n’est ajoutée à l’application. Conserver la distribution APK et Play comme deux canaux si Play App Signing utilise un certificat différent. Une ancienne version du manifeste ne prouve pas que l’application est à jour.

La PWA vérifie son worker au retour à l’écran après une heure, sans minuteur en arrière-plan. Les vérifications automatiques respectent le mode économie de données et l’absence de réseau ; une erreur réessaie au prochain retour après dix minutes. Le bouton de l’aide permet une vérification explicite, dédupliquée et bornée à douze secondes. Une mise à jour téléchargée n’est pas effacée par une réponse de vérification plus ancienne. Le déploiement s’active à un moment calme ; les fichiers déjà téléchargés peuvent être activés hors ligne. L’application native conserve son origine locale `https://localhost` et les clés de stockage existantes entre versions.

Références : [signature Android et Play App Signing](https://developer.android.com/studio/publish/app-signing), [niveau API Google Play](https://developer.android.com/google/play/requirements/target-sdk), [mises à jour intégrées](https://developer.android.com/guide/playcore/in-app-updates/kotlin-java), [Capacitor Android v7](https://capacitorjs.com/docs/v7/android), [HTTP natif](https://capacitorjs.com/docs/v7/apis/http), [notifications locales](https://capacitorjs.com/docs/v7/apis/local-notifications).
