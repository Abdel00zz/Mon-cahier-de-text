# Vérification mobile et éditeur — 19 octobre 2026

## Périmètre

Amélioration des mécanismes existants, sans nouveau moteur, commande, onglet ou service de compilation. Le rendu reste Markdown et KaTeX, avec la liste existante de balises HTML autorisées ; il ne devient pas un compilateur XeLaTeX.

## Corrections

- Réseau Android : état natif partagé, actualisé au retour dans l'application, protection contre les réponses asynchrones périmées et nettoyage des écouteurs.
- Préchargement : nouvelle vérification du réseau, de la visibilité et de l'économie de données au moment d'exécuter le travail différé.
- Mise à jour web : délai maximal couvrant aussi la lecture du JSON, maintien d'une mise à jour déjà en attente d'application.
- Direction du texte : détection sur la prose, sans compter les formules, commandes ou attributs HTML. L'aperçu traite les lignes bilingues ; la saisie conserve la direction native par paragraphe.
- KaTeX : correction des macros existantes à un antislash, arguments imbriqués et accolades échappées ; limites d'expansion et de taille ; conservation du texte en cas d'échec exceptionnel.
- HTML : lecture des attributs entre guillemets, conservation de la structure des listes numérotées et imbriquées. Les attributs sont ignorés et les balises inconnues restent du texte.
- Document : onglets accessibles au clavier, focus conservé, aperçu calculé seulement lorsqu'il est affiché. Indicateur coulissant de 220 ms, couleur active issue du thème, cibles de 44 px, adaptation RTL et réduction des animations.

## Validation

- Suite complète : 790 tests Node et 234 tests UI/SSR réussis.
- Firebase : 17 tests réussis sur émulateurs Auth/Firestore, couvrant notamment l'isolation des comptes, les révisions concurrentes, les listes d'élèves et les sauvegardes.
- TypeScript, contrôle d'architecture et compilation de production réussis après les changements d'onglets.
- Contrôles de production en lecture seule : version publique accessible et routes privées testées refusant les requêtes non authentifiées. Aucune écriture ni configuration de production modifiée.

## Limites

- Pas de validation visuelle sur téléphone réel pour cette intervention.
- Les tests Firebase locaux ne certifient pas les index, TTL, coûts ou synchronisations authentifiées effectivement déployés en production.
- Le service worker actuel désinstalle l'ancien cache : aucune nouvelle capacité PWA hors ligne n'a été ajoutée.
- Le contrôle global `npm run check` signale encore `scripts/generate-guide-images.mjs` et la dépendance de développement `sharp` comme inutilisés. Ces éléments issus du travail sur le guide n'ont pas été supprimés.
- Aucun déploiement manuel ni nouvel APK pendant cette vérification. Publication des corrections sur `main` demandée ensuite par l'utilisateur.

## Références techniques

- [Capacitor Network](https://capacitorjs.com/docs/v7/apis/network)
- [Options de sécurité et limites KaTeX](https://katex.org/docs/options.html)
- [Commandes prises en charge par KaTeX](https://katex.org/docs/supported.html)
