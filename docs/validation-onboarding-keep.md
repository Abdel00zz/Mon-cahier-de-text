# Onboarding Keep — réalisation et validation

Date : 31 août 2026.

Actualisation : le parcours des nouveaux visiteurs et sa validation mobile sont décrits dans [Entrée principale et mobile](validation-entree-mobile.md). La préparation y devient l’entrée principale et mène directement au dashboard après inscription ; les résultats ci-dessous décrivent l’itération précédente, avec continuation après inscription.

## Analyse UX : trois choix

1. **Montrer la valeur avant l’inscription.** Un nouveau visiteur prépare une vraie classe et peut saisir son premier titre de chapitre. L’inscription sert ensuite à conserver cette préparation. Le bouton de connexion reste directement accessible.
2. **Réduire les décisions imposées.** Quatre étapes utiles : cycles, matières, classes, horaires facultatifs. Langue et thème sont des préférences immédiates dans l’en-tête. Le nom et l’établissement restent modifiables derrière un accordéon. La liste des matières commence avec huit choix, recherche bilingue et affichage complet à la demande.
3. **Guider sans interrompre.** Le parcours reprend à la première information manquante. La checklist du dashboard propose une seule prochaine action et peut être masquée. Pour les utilisateurs de ce nouveau parcours, l’ancien rappel modal d’horaires n’interrompt plus l’ouverture du cahier, même après masquage de la checklist.

## Structure du layout

| Composant | Style / typo | Interaction | Objectif UX |
| --- | --- | --- | --- |
| Essai avant compte | Carte pastel Keep, titre sobre, aperçu du cahier | Même modale de classe que le dashboard ; titre visible en direct | Préparation concrète avant la saisie d’identifiants |
| En-tête onboarding | Fond neutre, contrôles 44 px, icône existante | FR / arabe et clair / sombre / système immédiats | Personnaliser sans étapes supplémentaires |
| Étapes | Titres 24–30 px, bordures Keep, cartes 12 px | Progression accessible, focus sur le titre, footer collant | Repérer l’étape et garder l’action principale accessible |
| Matières | Liste courte, cases vectorielles, recherche 16 px | Rechercher aussi dans les libellés traduits ; conserver les sélections | Limiter le défilement et les choix simultanés |
| Classes | Mêmes tons stables que les cartes du dashboard | Cycle unique sauté ; suppression avec nom affiché à recopier | Éviter les circuits de création divergents et les erreurs |
| Checklist dashboard | Surface Keep, trois repères, une action principale | Classe réelle → ouverture du cahier → créneau référant une classe existante | Accompagner la première utilisation sans visite forcée |

## Mécanismes et performance

- Aucun délai de valorisation artificiel, aucune nouvelle dépendance applicative. Pas de flou d’arrière-plan ni d’animation permanente ajoutés à l’onboarding.
- Étape d’horaires chargée à la demande. Le chargement MathJax ne produit plus de surface d’attente dans l’onboarding, qui ne compose aucune formule.
- Suppression du second formulaire de création propre à l’ancien onboarding : réutilisation de `CreateClassModal`, de sa validation des groupes et de ses règles de cycles.
- La fermeture enregistre le choix local immédiatement ; l’appel réel de fin d’accueil se poursuit sans immobiliser l’interface. Les garde-fous du propriétaire restent actifs.
- Le brouillon anonyme reste uniquement en mémoire. Son effacement au rechargement est annoncé. Il n’est jamais appliqué par le chemin de connexion à un compte existant.
- À l’inscription seulement, identité vérifiée et espace activé avant la création locale. Un espace déjà configuré n’est pas remplacé. Validation des champs et bornes de taille ; tentative de retour aux valeurs antérieures si une écriture échoue.
- La classe préparée est mise dans la file normale de synchronisation. Le pull initial ne demande plus une association supplémentaire pour des classes déjà en file ou précédemment synchronisées.
- Le contenu saisi reste identique lors d’un changement FR/AR. La direction du premier titre est inférée de son texte, indépendamment de la langue des boutons.
- Checklist masquable et progression conservées dans les réglages synchronisables ; aucune lecture de tous les contenus de cahiers à chaque rendu.

## Validation locale

- **51 tests automatisés réussis** : 12 nouveaux tests onboarding / conservation / checklist, 15 espaces de compte, 6 authentification / UI, 18 règles de création de classes.
- Commande : `node --import tsx --test scripts/test-onboarding-keep.ts scripts/test-account-workspace.ts scripts/test-auth-ui.ts scripts/test-class-creation.ts`.
- Contrôles d’architecture TypeScript, parité i18n et compilation de production.
- Navigateur avec les vrais composants, providers, dashboard et éditeur ; stockage isolé **en mémoire** et réponses API simulées. Aucune classe ni aucun compte réel modifié.
- Essai → classe collège → titre arabe → changement FR/AR → inscription fictive → reprise à l’étape 4 → fin sans horaires → dashboard → titre inchangé dans l’éditeur.
- Parcours complet après connexion fictive : cycle unique → matières → modale ouvrant directement les niveaux collège → création → passage en arabe → fin sans horaires.
- Suppression protégée : bouton désactivé sans la bonne phrase, confirmation avec le nom affiché en arabe, classe retirée ; retour conservant les matières sélectionnées.
- Recherche arabe d’une matière hors des huit choix initiaux ; thème sombre appliqué immédiatement ; informations personnelles repliées par défaut.
- Checklist : l’ouverture passe réellement le deuxième repère à « terminé » ; l’action suivante ouvre directement Paramètres / Emploi du temps. Première ouverture du nouveau parcours : zéro dialogue intrusif.
- Mesures DOM et inspection visuelle : FR 320 × 740, AR 390 × 844, paysage 844 × 390, ordinateur 1366 × 900. Aucun débordement horizontal de page observé. Choix de langue hauts de 44 px, cartes de cycles de 96 px sur téléphone, rayons de cartes de 12 px. Footer accessible en paysage.

## Limites explicites

- SSO non ajouté : aucun fournisseur OAuth n’est configuré. Aucun bouton de connexion inopérant ni promesse de SSO fictive.
- Authentification et synchronisation cloud réelles, concurrence entre appareils et onglets : encore à valider sur comptes de recette. Les protections antérieures des espaces de compte restent en place.
- Le moteur LaTeX distant n’est pas couvert par ces tests d’onboarding ; le contenu textuel réel a été vérifié. Les comportements de chargement hors onboarding ne sont pas refondus ici.
- Aucun chiffre de FPS, de conversion, de rétention ou de gain de latence n’est revendiqué.
