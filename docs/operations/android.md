# Application Android

Le projet `android/` produit une application Capacitor installable, avec le cahier embarqué dans l’APK. Les API de connexion, de synchronisation, de messages et de calendrier utilisent `https://mon-cahier-de-text.vercel.app`. L’application ouvre ses contenus locaux sans charger tout le site à chaque lancement.

## Compiler

Prérequis : Node.js, Java 21 et Android SDK avec `platforms;android-35`, `build-tools;35.0.0` et `platform-tools`. Définir `JAVA_HOME` et `ANDROID_HOME` vers les installations locales. La configuration du SDK, les caches, les APK et les clés de signature sont exclus de Git.

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
| Thème | Icônes système adaptées au thème clair / sombre |
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

## Validation et distribution

Avant une distribution : exécuter `npm test` et `npm run check`, compiler l’APK, vérifier sa signature avec `apksigner`, puis tester sur un téléphone réel : connexion / déconnexion, changements de compte, synchronisation aller-retour, clavier arabe, impression, permission de notifications, rappel écran verrouillé et reconnexion.

L’APK `debug` est destiné aux essais. Une publication Google Play nécessite une signature de production conservée par le propriétaire, un AAB signé, une validation sur appareils et la vérification des exigences Google Play en vigueur. Aucune clé de production ni configuration Firebase n’est inventée ou incluse dans le dépôt.

Références : [Capacitor Android v7](https://capacitorjs.com/docs/v7/android), [HTTP natif](https://capacitorjs.com/docs/v7/apis/http), [Notifications locales](https://capacitorjs.com/docs/v7/apis/local-notifications), [empreintes Gradle](https://gradle.org/release-checksums/).
