# Optimisation mobile et distribution — 2 octobre 2026

Version préparée : **1.2.6**, Android **8**. Comparaison avec la version 1.2.5.

| Mesure | Avant | Après |
| --- | ---: | ---: |
| APK signé | 5,81 Mo | 3,54 Mo, environ −39 % |
| Précache PWA | 3 662 Kio, 134 entrées | 3 158 Kio, 115 entrées, environ −14 % |
| Petit logo de connexion / accueil | 1 064 716 octets | 23 286 octets |
| Formats KaTeX WOFF/TTF redondants | 816 780 octets distribués | 0 ; les 20 variantes WOFF2 sont conservées |
| Aide au démarrage | Chargée même fermée | Chargée à la première ouverture |

Les tailles d'APK sont celles des archives signées, sans prétendre mesurer la
mémoire après installation. Le précache est le total annoncé par Workbox ; il
inclut les ressources utiles hors ligne. Les durées du lancement dans l'émulateur
ne constituent pas un benchmark comparable aux téléphones réels.

## Changements

- Les originaux du logo et les 13 anciennes captures/animations sont conservés
  dans `assets/`, hors du déploiement et du paquet Android. Le générateur des
  exports historiques écrit dans ce dossier. Les captures actuelles de l'aide
  et les références pédagogiques restent distribuées.
- La transformation PostCSS limite les sources KaTeX à WOFF2. Vite retire
  uniquement les anciens formats KaTeX émis sans référence JS/CSS. Les familles,
  variantes, styles, symboles et deux polices arabes locales sont conservés.
- L'aide et la palette de commandes sont montées à la première utilisation.
  Elles restent montées après fermeture pour conserver leur état et terminer
  leurs animations. Les contextes de chargement mathématique devenus constants
  ont été retirés de l'application, de l'administration et des aperçus.
- La préparation d'impression attend les polices et les images réellement
  utilisées, puis valide le HTML KaTeX déjà composé. Une attente de 12 secondes
  suivie de « KaTeX unavailable », héritée d'un ancien runtime global, est
  supprimée. Les formules invalides ou non composées restent bloquées.
- Les événements natifs et de visibilité d'une même reprise sont regroupés :
  une seule requête de synchronisation. Les notifications reçues et la connexion
  FCM respectent aussi la pause native, même si le WebView se déclare visible.
- Le premier claim PWA ne recharge pas la page ; les mises à jour suivantes
  sont reconnues même si la page était ouverte avant sa première installation.
  Le rechargement continue d'attendre la fermeture des modales et la sauvegarde.
- `serialize-javascript` passe à 7.1.2. L'audit npm complet ne signale plus de
  vulnérabilité au moment du contrôle. Aucun remplacement global des SDK n'a
  été nécessaire.

## Validation

Les contrôles couvrent les variantes de polices, leur conservation, la pause
native, les événements de reprise doublés, le premier claim PWA et les mises
à jour suivantes. La pipeline `npm run release -- --serial emulator-5580`
exécute les tests, l'architecture, les fichiers inutilisés, les traductions,
les données officielles, les builds web/Android, le lint Android, les signatures,
la présence des ressources hors ligne et le démarrage natif durant 20 secondes.
`npm run analyze` vérifie le budget maximal de 320 Kio par lot JavaScript.

Contrôles visuels : connexion française à 390 px sans débordement horizontal,
logo de 34 px, ouverture et fermeture de l'aide chargée à la demande, préparation
d'impression en français et en arabe avec 16 formules et aucune erreur KaTeX. Les
proportions et le contenu des cartes ne sont pas modifiés par cette optimisation.

Firebase Android et les trois variables FCM de Vercel Production sont raccordés.
Google a accepté l'authentification et la validation FCM sans envoi réel. La
réception à application fermée et le rendu du badge doivent encore être vérifiés
sur un Samsung/Pixel équipé des services Google Play. Le backend des cahiers
reste Vercel/Upstash ; cette livraison ne migre pas les comptes vers Firebase Auth
ni les cahiers vers Firestore.
