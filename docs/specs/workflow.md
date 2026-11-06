# Workflow — circuits, connexions et chantiers d'amélioration

Ce document est la **carte d'ensemble** du produit : qui entre, par quelle porte,
quel circuit se déclenche, et où se situent les plus gros morceaux de code à
remplacer ou à moderniser. Il synthétise les documents spécialisés du dépôt et
ajoute trois chantiers prospectifs : une version Android **quasi native**, le
remplacement des **grands chantiers** par des API/packages éprouvés, et des
suggestions d'**infrastructure**.

Il décrit des circuits sans s'interdire de citer des fichiers : les parties
descriptives renvoient aux autres documents, les parties « améliorations »
citent des chemins, des paquets et des commandes pour être actionnables.

Pour la **philosophie visuelle** et le système de design, voir `design.md`
(style et philosophie « minimaliste futuriste »), `style.md` (tokens et
anatomie), `font.md` (typographie) et `mesur.md` (mesures).

Vocabulaire employé :

| Terme | Sens exact dans ce document |
|---|---|
| **Porte** | Un point d'entrée : page publique, connexion, console d'administration |
| **Espace de travail** | Les données locales rattachées à un propriétaire de compte |
| **Circuit** | Une chaîne de décisions qui produit un effet observable |
| **Branchement** | Ce qu'un circuit lit (dépend de) et ce qu'il déclenche |
| **Propriétaire** | Le seul endroit où une donnée est écrite ; ailleurs elle est reflétée |
| **Chantier** | Un gros morceau de code maison qu'un package établi pourrait remplacer |
| **Coque** | L'application Android qui embarque l'interface web |

---

## 1. La carte des connexions

```
                 ┌─────────────────────────────────────────────────────┐
                 │                PORTE PUBLIQUE                        │
                 │   landing.md — préparer la première classe            │
                 │   (aucun compte exigé pour découvrir)                 │
                 └───────────────▲──────────────────────┬──────────────┘
                                 │ se connecter          │ créer mon compte
                 ┌───────────────┴──────────────┐  ┌────▼──────────────────────┐
                 │          CONNEXION            │  │       INSCRIPTION         │
                 │  login.md — deux portes       │  │  login.md — trois chemins  │
                 │  prof (mot de passe/Google)   │  │  e-mail · téléphone · Google│
                 │  direction (code établissement)│ │  → classe d'essai facultative│
                 └───────────────┬──────────────┘  └────┬──────────────────────┘
                                 └────────────┬─────────┘
                                              ▼
                                 ┌───────────────────────────┐
                                 │      ONBOARDING           │
                                 │  onboarding.md — 4 étapes │
                                 │  cycles → matières →      │
                                 │  classe → emploi du temps │
                                 └───────────────┬───────────┘
                                                 ▼
                                 ┌───────────────────────────┐
                                 │   DASHBOARD « Mes classes »│
                                 │  carte-classe.md           │
                                 └───────────────┬───────────┘
                                                 ▼
                    ┌────────────────────────────┼─────────────────────────────┐
                    ▼                            ▼                             ▼
        ┌───────────────────┐        ┌───────────────────┐        ┌────────────────────┐
        │   ÉDITEUR (tableau)│        │    ÉVALUATIONS     │        │     PARAMÈTRES      │
        │  tabel.md          │◄──────►│  mecac2.md         │        │  profil · horaires   │
        │  mecac2.md         │ pont   │  modale-cc.md      │        │  notifications ·    │
        └───────────────────┘        └───────────────────┘        │  données · compte   │
                                                                  └────────────────────┘
```

**Console de la direction** : entrée **séparée**, compilée à part (`admin.html`,
`src/admin/`), cookie `cdt_admin`, jamais embarquée dans l'APK Android
(voir `login.md` §11 et §13 de `android.md`).

**Circuits transverses**, actifs à tout moment :

| Circuit | Document | Rôle |
|---|---|---|
| Synchronisation cloud | `cloude.md` | Pousse les cahiers, réglages, classes ; tire les corrections |
| Impression | `peint.md` | Document figé, signatures, mode économique |
| Notifications | `notification.md` | Rappels de séance, retards, messages de la direction |
| Coque Android | `android.md` | Activité unique, pont HTTP natif, plugins maison |
| Mécanique pédagogique | `mecanisme.md` | Règles de date, progression, retard |
| Formes de données | `json.md` | Ce qui est stocké, où, sous quelle forme |
| Compagnon | `bot.md` | Tâches « conflit », « devoir manquant », « liste incomplète » |
| Bulletin | `bulletin.md` | Feuille de notes et bulletin officiel |
| Logique générale | `cerveau.md` | Calculs partagés, invariants du « cerveau » |

---

## 2. Le parcours d'entrée

### 2.1 Landing → Inscription → Connexion

| Étape | Règle structurante | Document |
|---|---|---|
| **Landing** | La valeur avant le compte : la classe se prépare entièrement avant l'inscription. Un seul champ à la fois, une seule phrase de guidage, aucun réglage de confort demandé. | `landing.md` |
| **Inscription** | Trois chemins (e-mail, téléphone historique, Google), une seule règle de fin : jamais de compte fantôme, jamais d'écrasement de profil. | `login.md` §4 |
| **Connexion** | N'authentifie qu'une identité ; n'écrit jamais de donnée pédagogique. | `login.md` §1 |

**Branchements clés** :

| Circuit | Dépend de | Déclenche |
|---|---|---|
| Préparation de classe | Catalogue des niveaux, matières | Brouillon valide, aperçu fidèle |
| Inscription | Compte + préparation | Une classe d'essai rattachée au propriétaire |
| Session | Fournisseur d'identité, quotas, cookie `HttpOnly` | Adoption d'espace, réveil de la synchro |

### 2.2 Onboarding

Quatre décisions, deux obligatoires : **cycles** et **matières** (qui parle),
**classe** et **emploi du temps** (ce qui existe), facultatives. La reprise
calcule l'étape d'ouverture à partir de l'état réel ; le marqueur de fin vit
**sur le compte**, pas sur l'appareil (`onboarding.md`).

### 2.3 Règle d'or des connexions d'entrée

Une **identité stable** (jamais le numéro de contact), un **espace de travail
isolé par propriétaire**, et une **session locale qui autorise le travail mais
jamais la publication cloud** (`login.md` §13).

---

## 3. Le cœur enseignant

### 3.1 Éditeur (le tableau)

Le tableau est le **propriétaire du cours** : chapitres, sections, contenus,
dates, remarques. Ses mécanismes :

| Mécanisme | Effet |
|---|---|
| Fusion de séances | Les contenus d'une même date forment une séance ; un contenu répété sur plusieurs dates fusionne (`mergeType: 'content'`) |
| Remarque partagée | Une remarque identique s'affiche une fois, au bord de lecture et centrée en hauteur |
| Sélection | Une ligne pour un contenu distinct, un groupe pour les occurrences d’un même contenu |
| Assignation de date | Transactionnelle, avec garde intelligente (emploi du temps, fériés, vacances, absences) |
| Numérotation | « définition 1 », « exemple 2 »… par chapitre |
| Recherche | Différée, avec surlignage et reprise depuis le dashboard |

Voir [le Table Editor](tabel.md) pour les gestes, les badges et les alignements
et [les échanges avec la feuille](mecac2.md) pour les retours du suivi.

### 3.2 Le pont tableau ↔ évaluations

Le principe central de `mecac2.md` : **un propriétaire par donnée**.

- Le **tableau** saisit le cours, les dates et les remarques. Les évaluations
  et activités y sont saisies par bloc ou par remarque selon leur nature.
- La **feuille** reçoit les éléments capturés et gère le suivi, notamment
  les listes d'élèves, les notes et les sujets.
- La **réconciliation** lit le cahier complet et compare l'avant/après
  lorsqu'il est disponible. Elle produit un correctif idempotent.
- Les **ponts** reportent les changements de suivi sur les blocs ou
  annotations associés à une entrée existante.
- Les **pierres tombales** partagées rendent les suppressions durables.

### 3.3 Paramètres

Profil, emploi du temps (source de vérité `timetable`, `schedules` dérivés),
notifications, données, compte. Règle : l'emploi du temps **partiel n'est pas
exigé** — mieux vaut rien que faux.

---

## 4. La console de la direction

| Élément | Règle |
|---|---|
| Porte | Code d'accès partagé de l'établissement, cookie `cdt_admin` 12 h, distinct du cookie professeur |
| Quotas | 8 tentatives par adresse / 15 min, puis budgets d'écriture par famille (notifications, suppressions, imports…) |
| Vues | `overview`, `teacher`, `calendar`, `timetableClock`, `evaluationPolicy`, `bulletin`, `journal` — chacune à une adresse `#/…` |
| Compilation | Entrée séparée `admin.html` + `src/admin/`, jamais dans l'APK |
| Effet | Une session d'administration volée ne peut ni vider l'établissement ni inonder les professeurs |

Voir `route.ts` pour le routage par adresse et `login.md` §11 pour les quotas.

---

## 5. Les circuits transverses

### 5.1 Cloud (synchronisation)

`cloude.md` — producteurs découplés (`syncBus`) → file locale persistée →
consommateur (`useCloudSync`) → push découpé en lots → pull de réconciliation.
Règles : session vérifiée **et** propriétaire courant **et** espace courant ;
conflit `WRITE_CONFLICT` jamais résolu en silence ; un cahier trop gros part
seul et ne bloque pas la file.

### 5.2 Impression

`peint.md` — le `PrintView` n'est monté que pendant le circuit du parent, la
sélection est **figée** avant préparation, les dates déjà imprimées sont
mémorisées, les signatures empêchent une réimpression silencieuse.

### 5.3 Notifications

`notification.md` — canaux Android créés une seule fois, jeton lié au compte
**et** à l'installation, reprogrammation sans ouvrir l'application.

### 5.4 Coque Android

`android.md` — une activité, un pont HTTP natif (pot de cookies hors JavaScript),
cinq plugins maison, permissions minimales, release signée ou inexistante.

### 5.5 Compagnon, bulletin et « cerveau »

| Sous-système | Document | Rôle | Branchement |
|---|---|---|---|
| **Compagnon** (robot) | `bot.md` | Quatre postures (sereine, mineure, modérée, critique), antenne, clignotement | Constats croisés du cahier, des évaluations et des horaires → tâches « conflit », « devoir manquant », « liste incomplète » |
| **Bulletin** | `bulletin.md` | Feuille de notes et bulletin officiel | Liste de classe + devoirs + notes → calcul du bulletin |
| **« Cerveau »** | `cerveau.md` | Calculs partagés et invariants (progression, retard, prochaine séance) | `timetable` (source) → `schedules` dérivés → indicateurs compacts du dashboard |
| **Aide / guide** | fonctionnalité `guide` | Questions répliantes, recherche, réponses | Palette de commandes et centre d'aide, hors parcours obligatoire |

Le **compagnon** et le **bulletin** sont des *consommateurs* : ils lisent le
cahier et les évaluations sans jamais en devenir le propriétaire. Le
**« cerveau »** est le seul endroit où la règle métier (date, progression,
retard) est calculée — les vues n'implémentent pas une seconde version de ces
règles.

### 5.6 La chaîne de publication

Le code ne part pas « à la main » : un circuit de publication le vérifie avant
toute sortie.

| Étape | Outil | Effet |
|---|---|---|
| Commit local | `auto_commitv2.ps1` | Verrou récupérable, blocage des secrets, contrôle des motifs de conflit, message déduit, push **sans force-push** |
| Qualité | `npm run check` | Secrets, en-têtes HTTP, données, architecture, API, inutilisés, i18n, build, budget de bundle |
| TypeScript | `npm run lint` | `tsc --noEmit` |
| Architecture | `check:architecture` | Interdit dépendances domaine→React, imports d'écrans dans les primitives UI, imports client→API privées |
| Release Android | `android:release` | R8 + réduction, signature obligatoire (4 variables), APK **et** AAB, mapping R8 conservé, contrôle des ressources hors ligne, absence de l'admin |
| Intégration continue | `.github/workflows/ci.yml` | Rejoue la chaîne de qualité à chaque push |

**Règle d'or** : un arbre de travail non commité ou une version non incrémentée
est **signalé** dans le descriptif de release — on ne publie jamais « en
silence ».

---

## 6. Le cycle de vie d'une donnée

Toute donnée suit le même parcours : **édition → persistance locale → file de
synchronisation → cloud**, avec des garde-fous à chaque frontière.

### 6.1 De l'édition au cloud (séquence chronométrée)

```
1. Édition
   setState(recipe, action)          → Immer produit un nouvel état immuable
   → saveStatus = 'unsaved'          → l'interface affiche « non enregistré »

2. Autosauvegarde (débounce 1500 ms)
   persistCurrentData()
   → saveNotebook(classId, lessons, direction)
       → writeDurably(localStorage 'classData_v1_<id>')
       → touchClassSyncMeta + markClassDirty(classId)   [syncBus]
   → saveStatus = 'saved'

3. File locale persistée
   syncBus marque la classe « sale » (version incrémentée), émet 'dirty'

4. Départ cloud (fenêtre de cadence)
   useCloudSync → push → planPushBatches (lots ≈ 700 Ko)
   → requestSyncPush → serveur accepte → markClassSynced → clearPendingWork

5. Garde-fous de sortie
   pagehide / visibilitychange / Ctrl+S → persistCurrentData immédiat
   (jamais perte de la dernière saisie avant une fermeture rapide)
```

### 6.2 Les frontières et leurs garde-fous

| Frontière | Garde-fou |
|---|---|
| Édition → mémoire | Immer ne réécrit rien si l'état ne change pas (`newState === currentState`) |
| Mémoire → disque | `saveNotebook` ignore une réécriture identique ; met en quarantaine un cahier illisible avant remplacement |
| Disque → file | Version par classe : une modification pendant un push n'est pas effacée par l'acquittement de ce push |
| File → cloud | Session vérifiée **et** propriétaire courant **et** espace courant ; un cahier trop gros part seul sans bloquer la file |
| Cloud → disque | Pull appliqué seulement si aucune saisie non enregistrée (`reloadStoredNotebook` refuse pendant `selfPersisting`) |
| Conflit | `WRITE_CONFLICT` → sauvegarde d'une copie de secours, jamais d'écrasement silencieux |

### 6.3 Le cas particulier : une assignation de date

```
choisir une date
  → validation centralisée (emploi du temps + fériés + vacances + absences)
  → aucun écart : enregistrement
  → écart : dialogue « Modifier la date / J'ai compris, enregistrer »
  → journal d'activité local + synchronisation
```

Un écart est une information à **confirmer**, jamais une faute ni un toast
fugitif (`README.md`, `mecanisme.md`).

---

## 7. La carte du stockage local

Chaque donnée vit à un endroit précis, avec un **propriétaire** unique. Cette
carte est la vue « physique » des branchements décrits plus haut.

| Clé (localStorage) | Contenu | Propriétaire | Document |
|---|---|---|---|
| `classData_v1_<id>` | Le cahier : `lessonsData` + `contentDirection` | Le cahier (éditeur) | `json.md`, `mecac2.md` |
| `classManager_v1` | La liste des classes et leurs métadonnées | Gestionnaire de classes | `carte-classe.md` |
| `appConfig_v1` | Réglages (`AppConfig`) : horaires, absences, évaluations, notifications, rosters… | La configuration | `json.md` |
| `syncPending_v1` | File de synchro : versions « sales » par classe, suppressions, version de liste | Le bus de synchro | `cloude.md` |
| `syncMeta_v1` | Horodatage par classe (`localUpdatedAt`, `lastSyncedAt`) | Le bus de synchro | `cloude.md` |
| `settingsSyncMeta_v1` | Horodatage des réglages synchronisés | Le bus de synchro | `cloude.md` |

| Clé (sessionStorage) | Usage | Effacement |
|---|---|---|
| `dashboard_search_handoff_v1` | Reprise d'une recherche du dashboard vers l'éditeur | Après lecture |
| `config_initial_tab_v1` | Ouvre les paramètres sur l'onglet « emploi du temps » | Après lecture |
| `timetableNudge_v1_<id>` | Rappel discret « renseigner l'emploi du temps » | Persistant jusqu'à usage |

**Règle** : la donnée pédagogique (cahiers, classes, réglages) vit dans
`localStorage`, persiste hors session et suit le compte par la synchro ; les
signaux de navigation éphémères vivent dans `sessionStorage` et ne survivent
pas à l'onglet.

---

## 8. Matrice des branchements (récapitulatif)

| Circuit | Dépend de | Déclenche |
|---|---|---|
| Connexion | Fournisseur d'identité, quotas, profil | Cookie, adoption d'espace, réveil synchro |
| Adoption d'espace | Portée d'espace, écritures en cours | Vidage, relecture des classes/config |
| Onboarding | Compte, état réel | Marqueur d'accueil, dashboard |
| Carte de classe | Classes, indicateurs, notifications | Ouverture d'un cahier |
| Éditeur | `LessonsData`, `AppConfig`, fusion, sélection | Persistance, réconciliation |
| Réconciliation | Cahier, politique, état antérieur | Correctif d'évaluations |
| Ponts | Décisions de la feuille | Blocs datés, retraits durables |
| Impression | Cahier | Numéros gelés, signatures |
| Synchronisation | Session vérifiée, file locale | Push/pull, état synced/offline/error |
| Notifications | Canaux, jeton, compte | Rappels, messages |
| Direction | Code, quotas, cookies | Console, budgets d'écriture |

---

## 9. Android « quasi natif » — améliorations et paquets

L'objectif n'est pas de réécrire en Kotlin (coût énorme pour zéro gain
fonctionnel) mais de **réduire la distance perçue entre la WebView et une
application native**, en remplaçant les zones où la WebView fait défaut par des
plugins Capacitor/communautaires éprouvés.

### 9.1 Ce qui manque aujourd'hui et le paquet qui le comble

| Besoin | Situation actuelle | Paquet recommandé | Gain |
|---|---|---|---|
| Export/import de fichiers | `Blob` + téléchargement WebView (pas de partage natif) | `@capacitor/filesystem` + `@capacitor/share` + `@capawesome/capacitor-file-picker` | Feuille de partage Android native, choix de dossier réel |
| Stockage local fiable | `localStorage` seulement (quota ~5 Mo, purge possible) | `@capacitor-community/sqlite` | Base SQLite locale, migrations, aucun risque de purge WebView |
| Clavier | Contrôle maison dans `NativeShellPlugin` | `@capacitor/keyboard` | Hauteur réelle, `resize`, événements standard |
| Mises à jour | Plugin maison + téléchargement magasin | `@capgo/capacitor-updater` + `@capgo/native-market` | Live update sans Play Store, repli magasin unifié |
| Verrouillage de l'app | Aucun | `@capawesome/capacitor-app-lock` (biométrie/PIN) | Protection des cahiers d'enseignant |
| Orientation | Aucune | `@capawesome/capacitor-screen-orientation` | Verrouillage portrait/tablette |
| Accessibilité | Rien de natif | `@capacitor/screen-reader` | Pont TalkBack ↔ interface |
| Lien profond | Schéma `cahier://` maison | (déjà en place) `@capacitor/app` | — |

### 9.2 Réglages qui rapprochent du natif sans nouveau plugin

1. **Splash → première peinture** : réduire `launchShowDuration` (230 ms) et
   précharger la coque en amont ; le thème nuit évite déjà l'éclair blanc.
2. **Retour haptique systématique** : `@capacitor/haptics` est déjà présent —
   l'étendre à la validation, à la suppression et au glisser-déposer.
3. **Vue Web durcie** : conserver `webContentsDebuggingEnabled: false` et
   `allowMixedContent: false` ; ajouter un gestionnaire de `onPageStarted` qui
   refuse toute navigation hors `https://localhost`.
4. **Edge-to-edge** déjà réalisé : l'étendre à Android 15+ (`windowOptOutEdgeToEdgeEnforcement`
   si un repli est nécessaire).

### 9.3 Ce qu'il ne faut PAS faire (rappel `android.md` §12)

- Ne pas déclarer `USE_EXACT_ALARM` (rejet magasin).
- Ne pas réécrire les noms de canaux de notification à chaque version.
- Ne pas activer la sauvegarde système (les données passent par le cloud
  authentifié).
- Ne pas embarquer l'administration dans l'APK.

---

## 10. Remplacer les grands chantiers — APIs et packages

Les plus gros morceaux de code maison, classés par bénéfice de remplacement.

### 10.1 Virtualisation et tableau

| Chantier actuel | Problème | Remplacement |
|---|---|---|
| `useWindowVirtualizer` maison (`src/components/ui/virtual-list.tsx`) | Mesure, overscan, ancrage manuels | **`@tanstack/react-virtual`** (déjà présent dans l'écosystème TanStack) |
| Tableau en CSS Grid manuel | Logique de colonnes/rangées couplée au rendu | Adopter réellement **TanStack Table v9** (dépendance déjà déclarée) pour le modèle, garder le rendu CSS Grid |

**Recommandation** : `@tanstack/react-virtual` est le remplacement le plus sûr —
API de mesure éprouvée, prise en charge du SSR et du redimensionnement.

### 10.2 Glisser-déposer

| Chantier actuel | Remplacement |
|---|---|
| `useEditorRowReorder` maison (pointer/touch/clavier à la main) | **`@dnd-kit/core` + `@dnd-kit/sortable`** |

`dnd-kit` apporte le clavier, l'accessibilité, le tactile et les collisions
maintenus, et supprime un fichier de réglages CSS + un hook délicat.

### 10.3 Dates et calendrier

| Chantier actuel | Remplacement |
|---|---|
| `parseDateInput`, `addDaysIso`, `formatDateDDMMYYYY` (parsers maison) | **`@internationalized/date`** (React Aria) ou **`dayjs`** |

- `@internationalized/date` est le choix le plus cohérent avec une UI RTL et
  une locale arabe/française : gestion de fuseau, plages, comparaisons sûres.
- `dayjs` est plus léger si l'on veut seulement normaliser les formats.

### 10.4 Rendu de contenu (descriptions, documents)

| Chantier actuel | Remplacement |
|---|---|
| `ContentRenderer`, `textFormat`, `renderDescriptionWithBold` | **`react-markdown` + `remark-math` + `rehype-katex`** (optionnel) |

Le moteur maison est léger et **sûr** (pas de HTML exécuté). Si le besoin de
Markdown riche grandit (listes, tableaux), `react-markdown` avec un *allowlist*
de plugins est l'option standard. **À garder maison** sinon : la sécurité prime.

### 10.5 Internationalisation

| Chantier actuel | Remplacement |
|---|---|
| `src/i18n/messages.ts` + audit maison | **`i18next` + `react-i18next`** |

Apporte les pluriels, l'interpolation, la détection de langue et un écosystème
de linting. Migration possible sans tout réécrire (les clés FR/EN/AR existent).

### 10.6 API de bout en bout

| Chantier actuel | Remplacement |
|---|---|
| `apiFetch`, `requestSyncPush`, types de réponses manuels | **`tRPC`** ou **`ts-rest`** |

`tRPC` donne un typage bout en bout entre le client et les fonctions serverless,
supprimant la duplication des types de protocole de synchro. `ts-rest` est plus
léger si l'on préfère garder des routes HTTP classiques.

### 10.7 Tests

| Chantier actuel | Remplacement |
|---|---|
| Lanceurs `tests/run-all.mjs`, `tsx` + `node --test` | **Vitest** (unitaire) + **Playwright** (E2E/UI) |

`tests/test-workspace-navigation.ui.ts` suggère déjà une suite UI ; Playwright
l'unifierait avec des parcours visuels (dont un passage sur émulateur Android).

### 10.8 À ne pas remplacer (déjà le bon choix)

- **Zustand + Immer** pour l'état immuable.
- **Zod** pour la validation.
- **KaTeX** pour les formules.
- **react-hook-form** pour les formulaires.
- **Capacitor** comme coque (plutôt que Flutter/React Native) : le produit est
  une SPA offline-first, le coût de réécriture ne se justifie pas.

---

## 11. Suggestions d'infrastructure

### 11.1 Dossiers (l'existant est déjà sain)

La structure `app / features / domain / infrastructure / components / hooks /
contexts / lib / platform / constants / i18n / admin / server / api` est cohérente
(voir `README.md`). Améliorations ciblées :

| Suggestion | Raison |
|---|---|
| Extraire un dossier `src/application/` (cas d'usage) entre `features` et `domain` | Découpler React des règles métier quand un cas d'usage traverse plusieurs domaines (ex. « ouvrir un cahier » touche calendrier + évaluations + impression) |
| Colocaliser les tests à côté des modules (`*.test.ts` voisins) **ou** garder `tests/` mais sous `vitest` | Réduire la distance entre code et test, supprimer les lanceurs maison |
| Grouper les scripts par domaine déjà fait ; ajouter `scripts/e2e/` | Isoler Playwright des scripts de build |
| Documenter `api/` (serverless) au même niveau que `server/` | La découverte Vercel dépend de leur position racine ; un `api/README.md` éviterait les déplacements accidentels |

### 11.2 Tests

- **Vitest** comme lanceur unique, **Playwright** pour les parcours navigateur.
- Un **test de fumée Android** existe déjà (`android:smoke`) ; l'étendre avec
  **Firebase Test Lab** ou un émulateur en CI pour valider les plugins natifs.
- Ajouter un **test de non-régression visuelle** sur les états clés (empty
  state, tableau daté, RTL) via Playwright.

### 11.3 CI/CD

- L'intégration continue existe (`.github/workflows/ci.yml`) ; ajouter :
  - le **diff de taille de bundle** par PR (`npm run analyze`),
  - le **lint d'architecture** comme porte d'entrée obligatoire (`check:architecture`),
  - la **vérification de signature Android** dans la CI de release.

### 11.4 Données

- Passer du `localStorage` à **SQLite locale** (`@capacitor-community/sqlite`)
  pour les cahiers volumineux, avec un chemin de migration depuis
  `classData_v1_<id>`.
- Garder **Firebase** pour la synchro serveur, mais centraliser le protocole de
  push dans un module typé (`tRPC`/`ts-rest`) plutôt que des types dispersés.

### 11.5 Observabilité (dans le respect de l'invariant)

Le produit refuse l'analytique tierce (`README.md`). En revanche, un **rapport
d'erreurs opt-in** (Sentry) pourrait être proposé à l'utilisateur, sans jamais
envoyer de donnée pédagogique — à condition de préserver l'invariant « aucun
script analytics tiers embarqué ».

---

## 12. Invariants transversaux

1. **Un propriétaire par donnée** ; partout ailleurs, une projection en lecture.
2. **Le cahier est la source de vérité du professeur** ; la feuille s'aligne.
3. **La valeur avant le compte** : on prépare la classe avant de s'inscrire.
4. **Une décision à la fois**, un seul message à la fois.
5. **Une session locale permet de travailler, jamais de publier.**
6. **Aucun message ne révèle l'existence d'un compte.**
7. **L'emploi du temps partiel n'est pas exigé** : mieux vaut rien que faux.
8. **Un numéro de devoir maison est global**, jamais recalculé à 1.
9. **Une seule écriture par cycle**, donc une seule annulation.
10. **Sans état antérieur, aucune suppression.**
11. **La release Android est signée ou n'existe pas.**
12. **L'administration n'est jamais embarquée dans l'APK.**
13. **Aucun script analytics tiers** n'est embarqué.
14. **Un wrapper réseau tiers ne peut pas couper l'application** : le natif
    reste le filet de sécurité.
