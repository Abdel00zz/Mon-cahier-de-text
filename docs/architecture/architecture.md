# Architecture du projet

## Objectif

L’architecture sépare les écrans par domaine, les primitives visuelles, l’état partagé, les règles métier et l’infrastructure serveur. Cette séparation réduit les dépendances croisées et permet de supprimer une fonctionnalité sans laisser de code orphelin.

## Vue d’ensemble

```text
src/
  app/                  main.tsx, App.tsx, préchargement
  admin/                entrée et écrans de la direction
  features/             écrans enseignant, composants et hooks locaux
  components/           UI, navigation, curriculum, support, typographie
  domain/               calendar, classes, curriculum, notebook,
                        evaluations, notifications
  infrastructure/       storage, sync, push, notifications, printing
  hooks/, contexts/     état React partagé
  i18n/                 messages.ts (sans React), LocaleProvider.tsx
  constants/, types.ts  vocabulaires et modèles
  lib/, platform/       outils génériques et intégration appareil
  pwa/, styles/         service worker et styles globaux
api/                    routes Vercel et helpers privés
server/                 serveur local, dev/mockApi.ts
build/                  plugins Vite, manifeste PWA, budget
tests/                  tests TypeScript et test PowerShell de publication
scripts/                validation, benchmarks, assets et aperçus
public/                 référentiels, polices et images publiques
assets/                 originaux graphiques et captures historiques non distribués
docs/                   architecture, guides, exploitation, audits, recherche
```

## Règle de dépendance

```text
App / Admin → Features → Hooks / Contexts → Infrastructure → Domaine
                     ↘ Components UI                      ↘ Lib / Types / Constantes
```

- Une primitive UI n’importe jamais une feature.
- Une règle métier n’importe jamais React.
- Une feature peut consommer une primitive, un hook, un contexte ou une règle.
- Deux features communiquent par une donnée ou une petite interface explicite, jamais par copie de logique.
- Le client ne partage pas directement les helpers secrets de `api/_lib`.

`npm run check:architecture` vérifie ces frontières sur le graphe d’imports réel, y compris les dépendances indirectes du domaine. L’alias `@/` résout exclusivement `src/`. Les fonctions Vercel importent les modules métier par un chemin relatif explicite.

Le test `tests/test-architecture.ts` couvre les imports indirects, les imports de types, les fuites serveur et les anciens emplacements, sur un petit projet temporaire. Les métadonnées de contenu (`constants/top-level-types.ts`) restent distinctes de leurs icônes (`constants/type-maps.ts`).

## Domaines

### `src/features/auth`

Connexion, inscription, validation locale du formulaire et présentation des erreurs d’authentification.

### `src/features/dashboard`

Accueil **Mes classes**, indicateurs compacts, notifications, cartes, création de cahier et onboarding. Le calendrier mensuel (`NotificationCalendar.tsx`) croise vacances, jours fériés, bulletin officiel, évaluations, absences et emploi du temps. Les calculs proviennent de `src/domain` et des hooks ; ils ne sont pas redéfinis ici.

### `src/features/editor`

Éditeur du cahier, tableau, lignes, sélection, impression, centre d’actions et modales propres à la saisie. Le journal d’activité est consultable depuis le centre de notifications global. Les modales sont chargées à la demande depuis `EditorModals.tsx`.

### `src/features/evaluations`

Évaluations de la classe active, parcours officiel, concours, activités pédagogiques et absences. Aucune sélection parallèle de classe n’est autorisée dans le panneau contextuel.

### `src/features/settings`

Profil, emploi du temps, notifications, données, archives et compte. Les formulaires internes restent dans `src/features/settings/components`.

### `src/features/guide`

Guide FR/AR, rendu Markdown léger, images et comportement RTL.

## Répertoires transversaux

### `src/components/ui`

Boutons, champs, sélecteurs, dialogues, feuilles, icônes, rendu mathématique et squelettes. Une primitive n’est conservée que si elle est importée. Les variantes non utilisées ne sont pas gardées « pour plus tard ».

### `src/hooks`

État utilisé par plusieurs parcours : classes, configuration, évaluations et alertes. L’historique, la recherche et la sélection du cahier vivent dans `src/features/editor/hooks` ; les gestes sur les cartes vivent dans `src/features/dashboard/hooks`. Un hook ne produit pas de mise en page.

### `src/contexts`

Session utilisateur et synchronisation réseau. Les effets globaux restent limités à ces responsabilités.

### `src/domain` et `src/infrastructure`

Les règles sont classées par métier, et ne dépendent pas de React : calendrier, identité de classe, curriculum, mutations du cahier, évaluations et messages de notification. Les chargeurs de référentiels associés restent dans leur module métier.

Les accès au stockage et les échanges réseau sont identifiables dans `src/infrastructure`. On y trouve aussi l’orchestration des notifications locales et de l’impression. Ces modules peuvent consommer les règles métier, mais ne composent aucun écran.

`src/lib/memoize.ts` ne charge aucun hook React. `src/hooks/useDebouncedCallback.ts` gère la temporisation React et `src/app/preload.ts` connaît les écrans à précharger. Les traductions hors interface viennent de `src/i18n/messages.ts`, jamais du provider React.

### `api`, `src/admin`, `server` et `build`

`api` contient les fonctions Vercel et `api/_lib` leurs helpers privés. `src/admin` possède sa propre entrée HTML et ne doit pas alourdir l’application enseignant. `server/index.ts` démarre le serveur local ; ses simulations sont dans `server/dev/mockApi.ts`. Le manifeste PWA et le plugin de budget sont dans `build/vite`, pour garder `vite.config.ts` court.

## Placement d’un nouveau fichier

1. Est-il propre à un écran ou parcours ? `src/features/<domaine>`, avec ses hooks et styles locaux.
2. Est-ce une primitive visuelle sans logique métier ? `src/components/ui`.
3. Est-ce un état React réutilisé par plusieurs parcours ? `src/hooks`.
4. Est-ce une règle ou transformation sans React ? Le sous-domaine adapté de `src/domain`.
5. Est-ce un secret, une session serveur ou un accès Redis ? `api/_lib`.
6. Est-ce une donnée officielle statique ? `public` avec validation côté code.
7. Est-ce une lecture de stockage, une sauvegarde ou un transport réseau ? `src/infrastructure`.
8. Est-ce un test, un outil ou un brouillon ? Respectivement `tests`, `scripts/<usage>` ou `tmp`.

## Vérification et nettoyage

- `npm test` : toutes les suites TypeScript, avec un lanceur dédié aux imports CSS de l’éditeur.
- `npm run check` : référentiels, TypeScript, architecture, code inutilisé et compilation des deux applications et de la PWA.
- `npm run check:i18n` : parité des traductions et contrôle des clés utilisées ; les brouillons dans `tmp` ne sont pas analysés.
- `tmp/architecture-backup` : copie locale des fichiers avant la réorganisation.
- `tmp/legacy-editor-refactor` : brouillons d’éditeur préservés, sans exécution ni suppression de leur contenu.

## Données et circuits

### Emploi du temps

`AppConfig.timetable` est la source enregistrée. `deriveSchedules` produit les créneaux consommés par les alertes. Aucune vue ne modifie directement un tableau dérivé.

### Cahier

Chaque classe possède ses `LessonsData`. Les opérations structurelles passent par `src/domain/notebook/dataUtils.ts`, l’annulation/rétablissement par `useHistoryState` et le journal d’activité par `src/infrastructure/storage/journal.ts`.

Le **moteur de tableau** est une chaîne unique, du plan aux pixels : `src/domain/notebook/lessonRows.ts` projette l’arbre en lignes ordonnées (`buildLessonRows`), `src/domain/notebook/tableRows.ts` les fusionne (`groupLessonRows` : même date, ou même contenu répété), puis `src/domain/notebook/contentEditing.ts` en dérive **deux cibles distinctes** — `buildContentEditTargets` (édition du contenu : une date partagée ne fusionne jamais des contenus distincts) et `buildSessionTargets` (remarque et déplacement : une séance fusionnée est **une seule ligne**, elle bouge et s’annote d’un seul lot). Toute écriture passe par une mutation Immer unique, donc une seule annulation (`applyContentEdit`, `applyRemarkEdit`) ; le déplacement passe par un plan validé (`src/domain/notebook/contentReorder.ts` : `planContentMove` / `applyContentMove`) qui refuse par sécurité toute sélection non contiguë ou à cheval sur deux parents.

La **remarque de séance** se saisit dans la modale de séance existante (`AssignDateModal`, ouverte depuis la cellule de date comme depuis la cellule de remarque) : une seule modale par séance, qui porte la date **et** la remarque. Cliquer la remarque d’une ligne fait donc porter la sélection sur la séance fusionnée entière, si bien que la date et la remarque s’appliquent au même lot.

À la **création**, une ligne libre naît à l’endroit de l’élément visé : juste après lui s’il s’agit d’une ligne de contenu, ou en **premier enfant** s’il s’agit d’un titre (donc directement sous le titre). Seule une création sans ancre retombe à la racine. Elle n’est un parent pour personne : une autre ligne libre posée sous elle reste une voisine.

**Suppression** : `deleteStructuralNodePromotingChildren` (`src/domain/notebook/dataUtils.ts`) traite tous les cas — une feuille (contenu typé ou ligne libre, où qu’elle soit posée, racine comprise) est retirée de sa liste ; un chapitre ou une évaluation de premier niveau part avec ses enfants ; une section remonte ses contenus et ses sous-titres (`subsubsections` devient `subsections`) pour ne jamais perdre de donnée. L’ordre du lot est une règle du moteur (`orderDeletionsDeepestFirst` dans `src/domain/notebook/contentEditing.ts`) : **le plus profond d’abord**, puis de la fin vers le début, sinon la remontée des enfants décale les coordonnées et l’on supprime une autre ligne. Le diagnostic initial n’est plus réinjecté au chargement : supprimer une ligne du cahier est définitif, seul un cahier vierge reçoit son diagnostic de départ (les imports et programmes prédéfinis, eux, l’ajoutent toujours s’il manque).

Une ligne libre se **déplace le long du plan** : `planContentRelocation` (`src/domain/notebook/contentReorder.ts`) la fait suivre l’ordre de lecture plutôt que ses seuls frères. Elle se pose avant/après une feuille, et **sous un titre** lorsqu’elle rencontre un nœud de structure (elle en devient le premier enfant, donc juste sous le titre) — y compris si cela change son parent. C’est ce qui permet de la glisser sous un paragraphe, une proposition ou n’importe quel type de contenu. Le reste du cahier garde la règle stricte : permutation entre frères uniquement (`planContentMove`), et refus de toute sélection non contiguë.

Le **diagnostic initial** (`evaluation_diagnostic`) est une ligne comme une autre : `withStarterDiagnostic` n’en crée un que s’il n’en existe aucun et, dès qu’il en existe un, il le laisse exactement où le professeur l’a placé — ni remontée forcée en tête, ni renommage.

Une **ligne libre** (`type: 'free'`) est un contenu du professeur **hors du plan** : ni chapitre, ni section, ni élément typé, sans parent ni niveau. Elle est rangée à la racine du cahier uniquement pour respecter l’ordre de lecture, et reconnue **par son type seul** (`src/domain/notebook/freeLineType.ts`) : aucune règle de plan ne peut la confondre avec un nœud de structure. Elle ne reçoit donc aucun numéro de contenu, ne pèse sur le cycle de vie d’aucun chapitre, et le sélecteur de contenu la présente dans son propre groupe « Rédaction libre », hors des structures du cours.

La sauvegarde locale est prioritaire : l’éditeur écrit après une courte temporisation et force aussi l’écriture lors du masquage, de `pagehide` et du démontage. Le cloud ne lit ensuite que cet instantané local marqué comme modifié.

Les projections de séance consommées par les cartes et les notifications partent des modules de `src/domain/curriculum` et `src/domain/notebook` : dates réellement passées, contenus futurs planifiés et ordre pédagogique du cahier. Une date future ne doit jamais être présentée comme « dernière séance ». `src/infrastructure/storage/notebookStorage.ts` partage les lectures JSON entre les moteurs du tableau de bord afin d’éviter les parsings répétés.

### Évaluations

`src/domain/evaluations/assessments.ts` valide le JSON officiel à l’exécution puis fusionne, dans une seule fonction métier, le planning officiel, les dates ajustées et les devoirs manuels. Les identifiants officiels incluent le millésime scolaire ; les anciennes clés sans année restent lisibles uniquement pour migration.

Les alertes, le modal d’évaluations et les rappels d’absences consomment la même liste résolue. `src/domain/evaluations/assessmentSync.ts` rapproche ensuite chaque devoir avec un bloc du cahier par type, numéro et proximité de date, sans réutiliser le même bloc. L’API valide les structures d’évaluation avant de les enregistrer dans Redis.

### Date

Toutes les entrées convergent vers `validateSessionDate`. Le dialogue de vérification reçoit une liste structurée de raisons, puis confirme ou renvoie vers la planification.

### Synchronisation

Les modifications marquent la classe ou la configuration comme sale dans `syncBus`. `SyncContext` regroupe, envoie et réconcilie les données. Le stockage local reste disponible hors connexion.

### Référentiels officiels

Les vacances, contenus et événements officiels vivent dans `public`. Les chargeurs valident leur schéma avant de les exposer aux features.

Le référentiel administratif marocain utilisé par le profil et l’impression est centralisé dans `src/domain/classes/moroccoEducation.ts` : 12 AREF, puis leurs provinces et préfectures. Les identifiants sont stables, afin que les sauvegardes et la synchronisation ne dépendent pas du libellé affiché.

### Notifications et cycle de vie mobile (choix d’ingénierie)

Le système sépare rigoureusement deux mécanismes aux garanties distinctes :

1. **Notifications Web Push serveur (`api/notify.ts`, `src/pwa/sw.ts`)** :
   - Déclenchées par le cron Vercel quotidien ou par un message de la direction.
   - Délivrées par le système d'exploitation via le push service du navigateur (FCM, Apple Push Service, etc.).
   - Fonctionnent **même lorsque l'application ou l'onglet est complètement fermé**.

2. **Rappels locaux de fin de séance (`src/hooks/useSessionAlerts.ts`, `src/infrastructure/push/push.ts`)** :
   - Déclenchés par les timers JavaScript de la page active (1 minute avant la fin et 5 minutes après si le cahier n'est pas daté).
   - Affichent un toast, émettent une vibration et affichent une notification système via `ServiceWorkerRegistration.showNotification()` si l'autorisation est accordée.
   - **Limitation assumée** : lorsque l'application est **complètement fermée** (processus tué ou déchargé par le système d'exploitation mobile), les timers JavaScript ne tournent plus. L'interface documente honnêtement cette limitation au lieu de faire croire à une fiabilité impossible en pur Web/PWA standard.

**Évolutions possibles pour réveiller le téléphone application fermée :**
- **Option A (Web Push serveur planifié)** : Un worker Upstash QStash ou un cron serveur qui planifie les envois Push aux heures de fin de séance déduites de l'emploi du temps synchronisé.
- **Option B (Notifications locales natives Capacitor)** : Utilisation du plugin natif `@capacitor/local-notifications` qui enregistre les réveils directement dans le système d'exploitation (`AlarmManager` sur Android, `UNUserNotificationCenter` sur iOS), garantissant la sonnerie même processus arrêté.


## Performance

- Les pages principales sont chargées avec `React.lazy`.
- Les modales lourdes de l’éditeur sont chargées à la demande.
- MathProvider partage la promesse de démarrage KaTeX entre les surfaces et les remontages React. Le contenu reste accessible pendant son chargement ; MathText compile seulement les blocs contenant du LaTeX.
- Aucun script de mesure tierce (analytics) n’est chargé : le premier affichage ne dépend d’aucun réseau externe.
- Administration et application enseignant sont deux entrées séparées.
- Workbox précache uniquement les ressources nécessaires.
- Le budget avertit au-delà de 320 kB par chunk non compressé.
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

## Circuit de rendu de l’éditeur

`buildLessonRows` aplatit le cahier en conservant les indices source. La recherche filtre ces lignes avec leurs ancêtres ; elle ne reconstruit pas un arbre aux indices différents. `groupLessonRows` regroupe les dates et les contenus consécutifs identiques, sans traverser les séparateurs ni les trous de recherche. Une cellule de contenu fusionnée sélectionne toutes ses entrées, dont les données restent distinctes. Les descriptions différentes empêchent leur fusion.

Le virtualiseur utilise l’intersection réelle avec la fenêtre, des mesures indexées par identité et des positions arrondies au pixel. Les groupes sont bornés à 24 entrées. Les corrections de hauteur au-dessus de la fenêtre préservent la position de lecture.

`splitMathText` protège les délimiteurs avant la mise en forme des listes ou le surlignage. KaTeX ne scanne pas globalement le DOM React : chaque MathText possède son rendu. Les badges occupent une colonne de grille centrée sur la ligne du titre ; les descriptions occupent les lignes suivantes.

Les écarts horaires et les classes sans créneau passent par le flux de notifications vers les repères du Centre de pilotage. Le panneau d’avertissements redondant des paramètres a été retiré.

Vérification des indices, fusions, dates multiples, virtualisation et délimiteurs : `npm run test:editor`.
