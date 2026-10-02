# Cahier de textes interactif

Application web et mobile offline-first destinée aux enseignants : classes, cahiers structurés, emploi du temps, évaluations, impression, notifications et synchronisation sécurisée.

## Parcours principal

1. L’enseignant se connecte ou crée son compte.
2. L’accueil **Mes classes** présente les trois indicateurs compacts à droite, le centre de notifications et les cahiers.
3. Une classe ouvre son cahier : contenus, dates, remarques, recherche et impression. Le journal d’activité se consulte depuis le centre de notifications.
4. Les paramètres réunissent profil, emploi du temps, notifications, données et compte.
5. Les évaluations s’ouvrent depuis la classe active et restent liées à cette classe.

## Circuits uniques

### Date

```text
Choix de date
  → validation centralisée
  → emploi du temps + vacances + fériés + absences + année scolaire
  → aucun écart : enregistrement
  → écart : dialogue « Modifier la date / J’ai compris, enregistrer »
  → journal d’activité local + synchronisation
```

Un écart est une information à confirmer, jamais une faute et jamais un toast fugitif.

### Données pédagogiques

```text
Cahier de textes
  → dates réellement saisies
  → progression et prochaine séance
  → indicateurs compacts Mes classes + centre de notifications
  → évaluations et alertes contextuelles
```

La grille `timetable` est la source de vérité de l’emploi du temps. Les `schedules` sont dérivés. Les vues n’implémentent pas une seconde version des règles métier.

## Architecture

| Emplacement | Responsabilité |
|---|---|
| `src/app/` | Entrée enseignant, composition des écrans et préchargement |
| `src/features/` | Authentification, classes, cahier, évaluations, paramètres, guide et messages |
| `src/domain/` | Modules métier par domaine : calendrier, classes, curriculum, cahier, évaluations et notifications |
| `src/infrastructure/` | Stockage, synchronisation, push, notifications locales et impression |
| `src/components/` | UI partagée et composants de curriculum, navigation, support et typographie |
| `src/hooks/`, `src/contexts/` | État React partagé ; les hooks propres à un écran restent dans sa feature |
| `src/lib/`, `src/platform/` | Outils communs et intégration aux appareils |
| `src/constants/`, `src/types.ts`, `src/i18n/` | Types, constantes, traductions et contexte de langue |
| `src/admin/` | Interface d’administration, compilée séparément |
| `src/pwa/`, `src/styles/` | Service worker, cycle de vie PWA et styles globaux |
| `api/` | Fonctions serverless, authentification, Redis et push |
| `server/` | Serveur local ; simulations des API dans `server/dev/` |
| `build/` | Budget des bundles, plugins Vite et manifeste PWA |
| `tests/` | Suites de tests et leurs lanceurs |
| `scripts/` | Validation, benchmarks, génération d’assets et aperçus de développement |
| `public/` | Contenus officiels, calendrier, guide et icônes |
| `docs/` | Architecture, guides, exploitation, audits et analyses documentaires |

L’alias `@/` pointe vers `src/`. Les API restent à la racine pour leur découverte par Vercel. Les chemins publics, les clés de stockage et les routes de l’application restent stables.

La documentation détaillée se trouve dans [docs/architecture/architecture.md](docs/architecture/architecture.md). Les bancs de prévisualisation (`scripts/guide-preview/`) ne sont pas des entrées de compilation et ne sont jamais publiés.

## Développement

```bash
npm run dev
npm run lint
npm run check:architecture
npm run check:unused
npm run check:i18n
npm test
npm run test:pilotage
npm run test:editor
npm run test:notifications
npm run test:admin-sync
npm run test:guide
npm run build
npm run check
```

- `lint` vérifie TypeScript.
- `check:architecture` interdit les variables inutilisées, les dépendances du domaine vers React, les imports d’écrans dans les primitives UI et les imports client vers les API privées.
- `check:unused` détecte fichiers, exports et dépendances orphelins.
- `check:i18n` impose la parité FR/EN/AR et l'absence de clé utilisée sans traduction.
- `npm test` lance toutes les suites TypeScript, dont les tests de rendu de l’éditeur. Le test PowerShell du script de publication se lance séparément : `pwsh -File tests/test-auto-commit.ps1`.
- `build` produit les entrées enseignant et administration ainsi que le service worker.
- `check` exécute toute la chaîne de qualité, y compris les traductions, avec une seule vérification TypeScript.

La publication s'effectue par `./auto_commitv2.ps1` : verrou local récupérable, blocage des secrets,
vérification des motifs de conflit, message de commit déduit des fichiers, puis push sans force-push.
Voir `./auto_commitv2.ps1 -Help` pour les modes `-DryRun`, `-Doctor`, `-Recover` et `-NoPush`.
Son comportement est couvert par `tests/test-auto-commit.ps1` : synchronisation par rebase avec
changements locaux, conflit de rebase (abandon propre, aucun marqueur, aucun stash) et diagnostic.

## Technologies

React 19, TypeScript, Vite, Tailwind CSS, Radix UI, Lucide, Immer, KaTeX, Vercel Functions, Upstash Redis, Workbox et Capacitor.

## Sécurité et robustesse

- Sessions signées dans des cookies `HttpOnly`.
- Mots de passe hachés avec `scrypt`.
- Synchronisation par classe et travail hors ligne.
- Notifications web push avec validation centralisée des types.
- Contrôle des motifs de conflit non résolus et des fichiers sensibles par le script de publication (`auto_commitv2.ps1`).
- Budget de 320 kB par chunk non compressé (`build/optimization.ts`) ; les écrans lourds, les modales et KaTeX sont chargés à la demande.
- `npm run analyze` publie la taille réelle de chaque chunk et **échoue** au-delà du budget : c'est le garde-fou budgétaire du projet.
- Aucun script analytics tiers n'est embarqué : le premier affichage ne dépend d'aucune mesure réseau externe.

## Règles de maintenance

- Une fonctionnalité d’écran et ses hooks locaux appartiennent à `src/features/<domaine>`.
- Un composant va dans `src/components/ui` seulement s’il est réellement transversal et sans logique métier.
- Une règle de date, progression ou horaire va dans le sous-dossier adapté de `src/domain` ; une lecture de stockage ou un échange réseau va dans `src/infrastructure`.
- Les imports inter-domaines utilisent l’alias `@/` ; les imports internes à une feature restent relatifs.
- Aucun fichier temporaire, rendu PDF, script ponctuel ou ancienne maquette ne doit être versionné.
- Toute suppression doit être confirmée par `npm run check:unused`, puis par TypeScript et le build.
- Les brouillons ponctuels restent dans `tmp/`, exclu du dépôt et des vérifications. Les anciens brouillons de refactorisation de l’éditeur sont préservés dans `tmp/legacy-editor-refactor/`.
