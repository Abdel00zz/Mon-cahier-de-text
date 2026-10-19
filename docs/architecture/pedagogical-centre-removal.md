# Retrait du centre « Suivi pédagogique » — 18 octobre 2026

Le centre enseignant a été retiré à la demande de l’utilisateur. Il ne constitue plus une destination de navigation ni une dépendance des classes ou de l’éditeur.

## Suppression complète du circuit

- Suppression du modal, de ses six rubriques, de la frise, du calendrier, des synthèses de classes et des graphiques dédiés.
- Suppression du flux global `useNotificationFeed`, des calculs associés, des abonnements et du préchargement de l’ancien écran.
- Suppression des liens internes vers les anciennes sous-rubriques et des demandes de focus/modales émises uniquement par ce centre.
- Retrait du journal d’activité dédié à l’ancien écran : plus d’écriture synchrone de journal à chaque édition ou export. L’historique annuler/rétablir du cahier conserve son propre moteur.
- Nettoyage des styles, traductions, captures du guide, textes d’aide, bancs de prévisualisation et tests portant exclusivement sur les vues supprimées.
- Nettoyage des anciens contrôles et effets sans consommateur, confirmé par `check:unused`.

## Organisation du code restant

| Responsabilité | Module |
| --- | --- |
| Routes acceptées et lecture du lien courant | `src/app/navigation/appRoutes.ts` |
| Historique, retours natifs, réglages et défilement | `src/app/navigation/useAppNavigation.ts` |
| Assemblage des deux navigations | `src/components/navigation/TabBar.tsx` |
| Barre bureau et identité du professeur | `src/components/navigation/DesktopSidebar.tsx` |
| Deux destinations mobiles | `src/components/navigation/MobileTabBar.tsx` |
| Bouton partagé, accessibilité et état actif | `src/components/navigation/NavigationButton.tsx` |
| Gestes tactiles | `src/components/navigation/useNavigationGestures.ts` |

`App.tsx` passe de 636 à 386 lignes ; `TabBar.tsx`, de 494 à 28 lignes. Le geste latéral met à jour une transformation sans relancer le rendu React à chaque mouvement. Le changement d’onglet par balayage distingue un geste horizontal du défilement vertical. Les animations prennent en compte la préférence de réduction des mouvements.

## Données et destinations

La gestion des évaluations et activités, des documents, des notes, des absences, des remises et des listes d’élèves reste dans ses composants propriétaires. Les circuits de sauvegarde, d’administration et de synchronisation continuent à transporter ces données.

Les anciennes clés de journal et d’alertes restent compatibles avec les sauvegardes et les clients antérieurs ; cette suppression d’interface ne purge pas les données utilisateur existantes. Les anciennes URL du centre se résolvent vers les classes. Les rappels système ciblés continuent à ouvrir le cahier concerné ; les notifications générales ouvrent l’accueil des classes. Le chargement du bulletin officiel reste lié à la gestion des évaluations, indépendamment du centre supprimé.

## Validation

- `npm test` : 762 tests de domaine/intégration locale et 230 tests de composants réussis.
- `npm run check` : secrets, données, TypeScript/architecture, API, code inutilisé, traductions et compilation web réussis.
- Compilation Android web réussie ; le module principal passe d’environ 374 Ko à 341 Ko dans les sorties Vite observées. Ce gain de taille ne constitue pas une mesure de fluidité sur appareil.
- Tests ajoutés sur les deux destinations FR/AR/EN, les anciennes URL, les identifiants mal encodés et les classes absentes. La couverture de fusion des suivis élèves entre appareils est conservée dans `tests/test-evaluation-record-sync.ts`.
- Les deux bancs de prévisualisation compilent. La vérification visuelle locale a été bloquée par la politique de sécurité de l’outil navigateur ; aucun test visuel sur appareil réel n’est revendiqué.
