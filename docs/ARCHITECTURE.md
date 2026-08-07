# Architecture du projet

## Objectif

L’architecture sépare les écrans par domaine, les primitives visuelles, l’état partagé, les règles métier et l’infrastructure serveur. Cette séparation réduit les dépendances croisées et permet de supprimer une fonctionnalité sans laisser de code orphelin.

## Vue d’ensemble

```text
index.tsx / App.tsx
        │
        ├── features/auth
        ├── features/dashboard
        ├── features/editor
        ├── features/evaluations
        ├── features/settings
        └── features/guide
                 │
                 ├── components/ui     primitives partagées
                 ├── hooks             orchestration réutilisable
                 ├── contexts          session et synchronisation
                 ├── utils             règles métier pures
                 └── public            référentiels statiques

admin/index.tsx ── admin/components ── admin/api
api/*.ts ───────── api/_lib ────────── services externes
pwa/sw.ts ──────── Workbox
```

## Règle de dépendance

```text
Entrées → Features → Hooks/Contexts/Utils → infrastructure externe
                 ↘ Components UI
```

- Une primitive UI n’importe jamais une feature.
- Une règle métier n’importe jamais React.
- Une feature peut consommer une primitive, un hook, un contexte ou une règle.
- Deux features communiquent par une donnée ou une petite interface explicite, jamais par copie de logique.
- Le client ne partage pas directement les helpers secrets de `api/_lib`.

## Domaines

### `features/auth`

Connexion, inscription, validation locale du formulaire et présentation des erreurs d’authentification.

### `features/dashboard`

Accueil **Mes classes**, indicateurs compacts alignés à droite, centre de notifications, cartes, création de cahier et onboarding. Le centre de notifications contient aussi un calendrier mensuel unifié (`NotificationCalendar.tsx`) : il croise les vacances et jours fériés, le bulletin officiel (examens, concours, résultats), les évaluations personnalisées, les absences du professeur et son emploi du temps. Les calculs de progression ou de calendrier sont consommés depuis `utils` et les hooks ; ils ne sont pas redéfinis ici.

### `features/editor`

Éditeur du cahier, tableau, lignes, sélection, impression, centre d’actions et modales propres à la saisie. Le journal d’activité est consultable depuis le centre de notifications global. Les modales sont chargées à la demande depuis `EditorModals.tsx`.

### `features/evaluations`

Évaluations de la classe active, parcours officiel, concours, activités pédagogiques et absences. Aucune sélection parallèle de classe n’est autorisée dans le panneau contextuel.

### `features/settings`

Profil, emploi du temps, notifications, données, archives et compte. Les composants de formulaire internes restent dans `features/settings/components`.

### `features/guide`

Guide FR/AR, rendu Markdown léger, images et comportement RTL.

## Répertoires transversaux

### `components/ui`

Boutons, champs, sélecteurs, dialogues, feuilles, icônes, rendu mathématique et squelettes. Une primitive n’est conservée que si elle est importée. Les variantes non utilisées ne sont pas gardées « pour plus tard ».

### `hooks`

État réutilisable : classes, configuration, annulation/rétablissement, recherche, sélection, évaluations et alertes. Un hook ne produit pas de mise en page.

### `contexts`

Session utilisateur et synchronisation réseau. Les effets globaux restent limités à ces responsabilités.

### `utils`

Fonctions testables sans interface : calendrier, validation des dates, progression, emploi du temps, sauvegarde, import, journal, impression, notifications et synchronisation.

### `api` et `admin`

`api` contient les fonctions Vercel et `api/_lib` leurs helpers privés. `admin` possède sa propre entrée HTML et ne doit pas alourdir l’application enseignant.

## Placement d’un nouveau fichier

1. Est-il propre à un écran ou parcours ? Le placer dans `features/<domaine>`.
2. Est-ce une primitive visuelle sans logique métier ? `components/ui`.
3. Est-ce un état React réutilisé par plusieurs composants ? `hooks`.
4. Est-ce une règle ou transformation sans React ? `utils`.
5. Est-ce un secret, une session serveur ou un accès Redis ? `api/_lib`.
6. Est-ce une donnée officielle statique ? `public` avec validation côté code.

## Données et circuits

### Emploi du temps

`AppConfig.timetable` est la source enregistrée. `deriveSchedules` produit les créneaux consommés par les alertes. Aucune vue ne modifie directement un tableau dérivé.

### Cahier

Chaque classe possède ses `LessonsData`. Les opérations structurelles passent par `utils/dataUtils.ts`, l’annulation/rétablissement par `useHistoryState` et le journal d’activité par `utils/journal.ts`.

### Date

Toutes les entrées convergent vers `validateSessionDate`. Le dialogue de vérification reçoit une liste structurée de raisons, puis confirme ou renvoie vers la planification.

### Synchronisation

Les modifications marquent la classe ou la configuration comme sale dans `syncBus`. `SyncContext` regroupe, envoie et réconcilie les données. Le stockage local reste disponible hors connexion.

### Référentiels officiels

Les vacances, contenus et événements officiels vivent dans `public`. Les chargeurs valident leur schéma avant de les exposer aux features.

Le référentiel administratif marocain utilisé par le profil et l’impression est centralisé dans `utils/moroccoEducation.ts` : 12 AREF, puis leurs provinces et préfectures. Les identifiants sont stables, afin que les sauvegardes et la synchronisation ne dépendent pas du libellé affiché.

## Performance

- Les pages principales sont chargées avec `React.lazy`.
- Les modales lourdes de l’éditeur sont chargées à la demande.
- MathJax n’est initialisé qu’à l’ouverture d’un cahier, afin de garder l’accueil léger sur mobile.
- Les analytics sont chargées après le rendu de la surface principale, sans bloquer l’interface.
- Administration et application enseignant sont deux entrées séparées.
- Workbox précache uniquement les ressources nécessaires.
- Le budget avertit au-delà de 220 kB par chunk non compressé.
- Les dépendances directes correspondent aux imports réels ; Workbox est déclaré explicitement.

## Qualité

```bash
npm run lint
npm run check:architecture
npm run check:unused
npm run build
npm audit --omit=dev
```

Le contrôle `check:unused` connaît explicitement les entrées serverless et administration grâce à `knip.json`.

## Politique de nettoyage

- Supprimer uniquement après preuve d’absence d’import et compilation réussie.
- Ne jamais versionner `tmp/`, `dist/`, logs, captures de travail ou scripts ponctuels.
- Supprimer les anciens exports au lieu de maintenir une API interne fantôme.
- Ne pas conserver une primitive UI « au cas où ».
- Après un déplacement, utiliser `@/` pour les dépendances transversales et valider immédiatement TypeScript.
