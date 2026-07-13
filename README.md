# Cahier de textes interactif

Application web et mobile offline-first destinée aux enseignants : classes, cahiers structurés, emploi du temps, évaluations, impression, notifications et synchronisation sécurisée.

## Parcours principal

1. L’enseignant se connecte ou crée son compte.
2. L’accueil **Mes classes** présente la situation du jour, la recherche globale et les cahiers.
3. Une classe ouvre son cahier : contenus, dates, remarques, recherche, historique et impression.
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
  → historique local + synchronisation
```

Un écart est une information à confirmer, jamais une faute et jamais un toast fugitif.

### Données pédagogiques

```text
Cahier de classe
  → dates réellement saisies
  → progression et prochaine séance
  → briefing Mes classes
  → évaluations et alertes contextuelles
```

La grille `timetable` est la source de vérité de l’emploi du temps. Les `schedules` sont dérivés. Les vues n’implémentent pas une seconde version des règles métier.

## Architecture

| Emplacement | Responsabilité |
|---|---|
| `features/auth/` | Connexion et inscription |
| `features/dashboard/` | Accueil Mes classes, briefing, cartes et onboarding |
| `features/editor/` | Cahier, tableau, actions, impression et modales d’édition |
| `features/evaluations/` | Évaluations, parcours officiel, concours et absences |
| `features/settings/` | Paramètres, emploi du temps, notifications et données |
| `features/guide/` | Guide bilingue FR/AR |
| `components/ui/` | Primitives visuelles partagées uniquement |
| `hooks/` | Orchestration d’état réutilisable |
| `contexts/` | Authentification et synchronisation |
| `utils/` | Règles métier et transformations pures |
| `api/` | Fonctions serverless, authentification, Redis et push |
| `admin/` | Interface d’administration isolée |
| `pwa/` | Service worker et installation PWA |
| `public/` | Contenus officiels, calendrier, guide et icônes |

La documentation détaillée se trouve dans [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). La reconstruction HTML statique est décrite dans [maquette.md](maquette.md) et disponible directement dans [maquette/maquette.html](maquette/maquette.html) avec ses fichiers CSS/JS autonomes.

## Développement

```bash
npm run dev
npm run lint
npm run check:architecture
npm run check:unused
npm run build
npm run check
```

- `lint` vérifie TypeScript.
- `check:architecture` interdit aussi les variables et paramètres inutilisés.
- `check:unused` détecte fichiers, exports et dépendances orphelins.
- `build` produit les entrées enseignant et administration ainsi que le service worker.
- `check` exécute toute la chaîne de qualité.

## Technologies

React 19, TypeScript, Vite, Tailwind CSS, Radix UI, Font Awesome, Immer, MathJax, Vercel Functions, Upstash Redis, Workbox et Capacitor.

## Sécurité et robustesse

- Sessions signées dans des cookies `HttpOnly`.
- Mots de passe hachés avec `scrypt`.
- Synchronisation par classe et travail hors ligne.
- Notifications web push avec validation centralisée des types.
- Contrôle des dépendances par `npm audit`.
- Budget de 220 kB par chunk non compressé ; les écrans lourds, les modales et MathJax sont chargés à la demande.
- Le suivi analytics est différé pour ne pas ralentir le premier affichage.

## Règles de maintenance

- Une fonctionnalité d’écran appartient à son dossier `features/<domaine>`.
- Un composant va dans `components/ui` seulement s’il est réellement transversal et sans logique métier.
- Toute règle de date, progression, horaire ou calendrier reste dans `utils`.
- Les imports inter-domaines utilisent l’alias `@/` ; les imports internes à une feature restent relatifs.
- Aucun fichier temporaire, rendu PDF, script ponctuel ou ancienne maquette ne doit être versionné.
- Toute suppression doit être confirmée par `npm run check:unused`, puis par TypeScript et le build.
