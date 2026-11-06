# Deep dive — optimisation et montée en qualité

**Date :** 6 novembre 2026 · **Version examinée :** 1.2.17 (Android 19)

## 0. Verdict

L'application est déjà très au-dessus d'un projet React ordinaire : routes
paresseuses, tableau virtualisé au-delà de 140 lignes, budgets de bundle
automatisés, PWA hors ligne, stockage local prioritaire, mémoïsation fine des
lignes et des formateurs `Intl`. Les gros chantiers ne sont donc plus dans les
fondations, mais dans **le travail refait plusieurs fois pour un même rendu** et
dans **le poids du chemin critique**.

Ce deep dive a mesuré ce coût, puis corrigé neuf points sans changer l'apparence
ni le comportement :

| Correction | Effet mesuré ou attendu |
| --- | --- |
| Groupement des séances avec absences mémoïsé | 2ᵉ appel : **~15 ms → ~0,001 ms** sur 1 260 lignes |
| Signatures d'impression calculées seulement à l'ouverture | **~13 ms** économisés à chaque sauvegarde hors impression |
| Plus de double écriture d'état au montage | 1 rendu complet évité par surface (App, tableau de bord, éditeur) |
| Google Fonts retiré de `index.html` | 2 connexions tierces et une feuille **bloquante** en moins |
| Fontes dupliquées supprimées | **−0,53 Mo** dans `public/`, précache PWA allégé d'autant |
| Formateur de date mémoïsé par locale | plus d'objet d'options ni de clé JSON par cellule |
| Analyse des sujets inline mémoïsée | plus de parcours du cahier à chaque sélection |
| Persistance hors de l'updater React | updater pur, StrictMode/concurrent sans double écriture |
| Identité stable des classes en séance | plus de relance d'analyse à chaque trame de compte à rebours |

Le build et les budgets passent : **967,7 Ko gzip de JS** (plafond 1 150) et
**117,2 Ko gzip de CSS** (plafond 160). Aucun test représentatif n'a régressé.

---

## 1. Méthode et mesures

- Cartographie statique : 550 fichiers dans `src/` (315 `.ts`, 164 `.tsx`,
  71 `.css`), 3,8 Mo de source.
- Mesure du bundle livré avec `scripts/validation/check-bundle-budget.mjs`
  (gzip niveau 9, ce que reçoit réellement un téléphone).
- Benchmark synthétique reproductible :
  `scripts/benchmarks/benchmark-editor-projection.ts` (`npm run bench:editor`).
  Cahier de **1 260 lignes** (12 chapitres × 4 sections × 25 contenus), une
  absence, formules et remarques. Aucune donnée utilisateur, aucun réseau.
- Les temps sont des **mécanismes** : ils varient avec la charge du poste. Les
  rapports (×1 000 sur le cache, ×2 sur les signatures) sont stables.

Commandes de contrôle :

```bash
npm run lint
npm run build
node scripts/validation/check-bundle-budget.mjs
npm run bench:editor
```

---

## 2. Chemin critique réel

Fragments **préchargés** par `dist/index.html` (gzip) :

| Fragment | Rôle | gzip |
| --- | --- | ---: |
| `react-*.js` | React + React DOM | 67,2 Ko |
| `i18n-*.js` | **les 3 langues** (1 288 clés × 3) | 64,1 Ko |
| `main-*.js` | entrée, providers, coque | 49,5 Ko |
| `ui-*.js` | framer-motion, lucide, primitives | 48,7 Ko |
| `index-*.js` | socle partagé de dépendances | 37,2 Ko |
| `printMeta-*.js` | impression, projection des lignes | 26,6 Ko |
| `index-*.css` | Tailwind + socle + surfaces | 68,3 Ko |
| divers | timetable, policy, haptics, CSS | 6,8 Ko |
| **Total avant premier écran** | | **≈ 368 Ko** |

Le tableau de bord ajoute immédiatement `Dashboard` (21,6 Ko) et sa feuille
(3,4 Ko), soit **≈ 393 Ko gzip** avant la première classe affichée. C'est
correct pour une PWA métier, mais trois postes concentrent l'essentiel :
**i18n (64 Ko), framer-motion/UI (49 Ko), CSS initial (72 Ko)**.

Le tableau `math-*.js` (77 Ko) n'est **pas** préchargé : KaTeX reste bien hors
du chemin critique. `ClassAssistant` (70 Ko) et `ClassEvaluationsSheet` (54 Ko)
sont également différés.

---

## 3. Constats priorisés

### P1 — corrigés

#### F-01 · Le groupement des séances était calculé deux fois par rendu

`groupRowsWithAbsences` projette toutes les lignes pour intercaler les
certificats d'absence, puis `groupLessonRows` fusionne les séances. Le résultat
n'était pas mémoïsé : l'éditeur l'appelait pour ses cibles d'édition, puis
`MainTable` le recalculait pour l'affichage.

Mesure sur 1 260 lignes, une absence :

| Appel | médiane | p95 |
| --- | ---: | ---: |
| Sans cache (ancien comportement) | 15,2 ms | 21,6 ms |
| Avec cache (même rendu) | **0,001 ms** | 0,038 ms |

Sur un téléphone d'entrée de gamme, ces 15 ms peuvent représenter une trame
perdue à chaque édition. Correctif :
[`absenceSessions.ts:62`](../../src/domain/notebook/absenceSessions.ts#L62).
La clé est un couple de `WeakMap` (liste source, séances) : aucune fuite
mémoire, le cache disparaît avec le cahier et la configuration.

#### F-02 · Les signatures d'impression étaient recalculées à chaque frappe

`printStats` parcourt tout le cahier, normalise chaque champ scalaire et hache
chaque séance pour savoir ce qui est « nouveau depuis la dernière impression ».
Il était recalculé à chaque changement de `lessonsData`, même modale fermée.

Mesure : **12,7 ms médiane, 21,8 ms p95** sur le cahier de 1 260 lignes.
Correctif : [`Editor.tsx:96`](../../src/features/editor/Editor.tsx#L96) et
[`Editor.tsx:957`](../../src/features/editor/Editor.tsx#L957). Le calcul ne part
plus qu'à l'ouverture de la modale ; le bouton d'impression recalcule déjà ses
propres dates au moment du clic.

#### F-03 · Chaque surface relisait et réémettait sa configuration au montage

`useConfigManager` parsait la configuration une première fois dans
l'initialiseur, puis **reparsait et repoussait un objet neuf** dans un effet de
montage. `useClassManager` faisait de même avec le tableau des classes. Résultat :
un rendu complet supplémentaire de l'App, du tableau de bord et de l'éditeur à
chaque ouverture, pour une valeur identique.

Correctifs : [`useConfigManager.ts:191`](../../src/hooks/useConfigManager.ts#L191)
et [`useClassManager.ts:37`](../../src/hooks/useClassManager.ts#L37). La
comparaison est profonde (`dequal`) ou sérialisée, et l'état courant est conservé
si rien n'a changé.

#### F-04 · Google Fonts était chargé sans être utilisé

`index.html` demandait Barlow, Open Sans, Roboto, IBM Plex Sans Arabic et Noto
Naskh Arabic. Or :

- les piles typographiques de `typography.css` et `theme-tokens.css` utilisent
  Readex Pro, Latin Modern, Source Sans 3, Computer Modern et les fontes arabes
  embarquées ;
- Barlow, Open Sans, IBM Plex et Noto Naskh n'apparaissent dans **aucune** règle
  `font-family` ;
- les familles utiles sont déjà dans `src/styles/fonts.css`, y compris hors
  ligne et dans l'APK.

C'était donc deux `preconnect` + une feuille de style **bloquante** pour zéro
glyphe affiché, et une dépendance réseau contraire à la promesse
« premier affichage sans réseau tiers » de l'architecture. Retiré de
[`index.html:89`](../../index.html#L89).

#### F-05 · Fontes dupliquées dans le paquet

`public/` contenait une copie racine **et** une copie `public/fonts/` de
SamsungOne Arabic (408 Ko), Elgharib Medium (101 Ko) et KOMission (2 × 20 Ko).
Le service worker précachait les deux copies, l'APK aussi.

Correctif : une seule copie servie depuis `/fonts/`, Maghribi déplacé dans
`/fonts/`, URLs de `fonts.css` et `editor-surface.css` alignées. Gain :
**−0,53 Mo** dans `public/`, autant dans le précache, et `dist/` ne contient
plus que deux fontes racines (Arabswell et Elgharib Light, réellement
uniques).

#### F-06 · Un formateur `Intl` reconstruit par cellule datée

`TableRow.parseDate` appelait `numberFormat(locale, { minimumIntegerDigits: 2,
useGrouping: false })` pour chaque date de chaque ligne. Le cache interne
retrouvait bien l'instance, mais il fallait d'abord créer l'objet d'options puis
sérialiser la clé JSON. Correctif :
[`TableRow.tsx:60`](../../src/features/editor/TableRow.tsx#L60) — un formateur
mémoïsé par locale, trois locales possibles.

#### F-07 · Effet de bord dans un updater React

`useOptimizedLocalStorage` appelait `debouncedSave(nextValue)` **à l'intérieur**
du `setValue(prev => ...)`. React peut rejouer un updater (StrictMode, rendu
concurrent) : la sauvegarde était planifiée plusieurs fois, et l'updater n'était
plus pur. Correctif : [`useOptimizedLocalStorage.ts:63`](../../src/hooks/useOptimizedLocalStorage.ts#L63)
— la persistance part d'un effet après le rendu, le premier passage ne réécrit
pas la valeur lue.

#### F-08 · Parcours du cahier à chaque sélection

`useNotebookDocumentPreviews` appelait `hasInlineAssessmentContent(lessonsData)`
hors mémoïsation. Chaque clic de sélection, chaque ouverture de modale
reparcourait donc toutes les lignes pour savoir si un sujet est écrit dans le
cahier. Correctif : [`useNotebookDocumentPreviews.ts:66`](../../src/features/editor/hooks/useNotebookDocumentPreviews.ts#L66).

#### F-09 · `JSON.stringify` / `JSON.parse` à chaque rendu du tableau de bord

La liste des classes en séance était sérialisée puis reparsée à chaque rendu
pour obtenir une identité stable. Correctif :
[`Dashboard.tsx:160`](../../src/features/dashboard/Dashboard.tsx#L160) — une
comparaison élément par élément, avec réutilisation de la référence précédente.
La stabilité est conservée (le compagnon n'est pas relancé chaque minute) sans
coût de sérialisation.

### P2 — non corrigés, à arbitrer

| # | Chantier | Gain estimé | Risque |
| --- | --- | ---: | --- |
| U-01 | **Découper l'i18n par langue** et charger la langue active au démarrage | 20–35 Ko gzip | moyen : chargement asynchrone, fallback FR |
| U-02 | **Passer framer-motion à `m` + `LazyMotion`** pour les composants du socle | 20–25 Ko gzip | moyen : 16 fichiers, animations à revalider |
| U-03 | **Sortir les CSS d'écran du `index.css`** (éditeur, réglages, documents) | 8–12 Ko gzip | moyen : ordre de cascade, régression visuelle |
| U-04 | **Centraliser classes + configuration** dans un store d'espace de travail | moins de parses et de rendus en O(surfaces) | élevé : refonte transverse |
| U-05 | **Ne plus reparcourir les cahiers à chaque `dirty`** dans `useSessionAlerts` | quelques ms par sauvegarde | moyen : règles de rappel |
| U-06 | **Extraire push/pull de `SyncContext`** (839 lignes) | maintenabilité, testabilité | faible fonctionnel |
| U-07 | **Élaguer les familles de fontes mortes** (Barlow, Lato, Amiri, etc.) | ~1 Mo de précache | faible, mais dépendances et tests à ajuster |
| U-08 | **Unifier les budgets** 320 Ko non compressé / 90 Ko gzip | prévention de régression | faible |

### P3 — dette de finition

- `ClassAssistant` construit deux `Intl.NumberFormat` dans son rendu
  (`ClassAssistant.tsx:271`) : à mémoïser si le compagnon devient un point chaud.
- `printMeta` et `scheduleStatus` font des parcours complets à chaque édition :
  les caches de lignes amortissent déjà l'essentiel, mais un profil React
  DevTools sur un vrai cahier de 300 lignes confirmerait le reste.
- `api/admin.ts` (980 lignes) et `api/sync.ts` méritent un audit serveur séparé :
  lectures/écritures par lot, transactions Firestore, taille des snapshots.
- Les suites `.ui.ts` sont compilées par esbuild dans `npm test` et valident le
  DOM rendu, mais pas le rendu visuel réel : une revue d'écrans reste nécessaire
  pour U-02 et U-03.

---

## 4. Vérifications exécutées

| Contrôle | Résultat |
| --- | --- |
| `npm run lint` (`tsc --noEmit`) | ✅ 0 erreur |
| `npm run build` | ✅ 3 651 modules, 21,6 s |
| Budgets `check:bundle` | ✅ 967,7 / 1 150 Ko JS ; 117,2 / 160 Ko CSS |
| `test-absence-sessions` | ✅ 12/12 |
| `test-notebook-save` | ✅ 7/7 |
| `test-print-history` | ✅ 5/5 |
| `test-new-account-classes` | ✅ 2/2 |
| `test-pwa-offline` | ✅ 6/6 |
| `test-startup-resources` (nouveau) | ✅ 3/3 |
| Architecture / i18n / en-têtes | ✅ 479 modules, 0 clé manquante, 7/7 |
| `npm test` (suite complète) | ⚠️ **943 réussis**, 1 ignoré, **1 échec hors périmètre** |

L'unique échec de la suite complète est `test-mobile-layout` : le fichier
`src/features/settings/components/schedule.css` porte une modification
concurrente non validée (grille téléphone à `32rem`) alors que le test attend
toujours `26rem`. Ce fichier n'appartient pas à ce deep dive et n'a pas été
touché ici ; il doit être arbitré avec la refonte visuelle en cours.

Le nouveau test [`test-startup-resources.ts`](../../tests/test-startup-resources.ts)
verrouille les deux régressions les plus faciles à réintroduire : une ressource
distante dans `index.html`, ou une fonte déclarée qui n'existe plus dans
`public/`.

---

## 5. Feuille de route recommandée

1. **U-01 — i18n paresseux** (impact maximal sur le démarrage). Extraire les
   tables `fr`, `en`, `ar`, charger la langue active avant le montage, garder FR
   comme base compilée. Mesurer LCP avant/après sur un profil 4G lent.
2. **U-02 — framer-motion allégé**. Remplacer les `motion.*` du chemin critique
   par `m.*` + `LazyMotion features={domAnimation}`, ou par des transitions CSS
   pour la navigation. Vérifier `prefers-reduced-motion`.
3. **U-03 — CSS par surface**. Déplacer `editor-surface.css`,
   `settings-hub.css`, `document-sheet.css` et `claude-sheet.css` dans leurs
   chunks paresseux. Capturer les écrans avant/après (clair, sombre, FR, AR,
   téléphone) avant de valider.
4. **U-04 — store d'espace de travail**. Un provider unique pour `classes` et
   `config`, avec sélecteurs. Aujourd'hui App, Dashboard et Editor instancient
   chacun leur `useClassManager`/`useConfigManager` et relisent le stockage.
5. **U-07 — fontes mortes**. Retirer les `@font-face` non utilisés, puis les
   dépendances `@fontsource` correspondantes et le lockfile. Mettre à jour
   `test-typography` en conséquence.
6. **U-08 — budget unique**. Faire dériver le plugin Vite du même fichier que
   `check-bundle-budget.mjs`, avec un seul couple de seuils documenté.

---

## 6. Limites

- Les benchmarks sont **synthétiques** : ils mesurent le coût des fonctions,
  pas le rendu React complet ni le temps de peinture.
- Les temps varient fortement selon la charge du poste (le groupement non
  mémoïsé a été observé entre 4 et 18 ms selon les runs). Les rapports, eux,
  restent stables.
- Aucune capture d'écran de régression n'a été produite dans cette session. Les
  changements sont volontairement sans effet visuel : suppression d'une feuille
  distante inutilisée, déduplication de fichiers identiques, mémoïsation et
  déplacement d'effets. Une revue visuelle reste recommandée pour U-02/U-03.
- Le test runner complet a été exécuté hors bac à sable : 943 tests passent. Le
  seul échec (`test-mobile-layout`) vient d'une modification concurrente de
  `schedule.css` (32rem contre 26rem dans le test), sans lien avec ce deep dive.
- Le bac à sable de l'agent bloque `esbuild` (`spawn EPERM`) : les commandes
  standard `npm run build` et `npm test` doivent être lancées avec les
  permissions de processus normales.
- `npm run check:unused` signale `maquette/assets/maquette.css` et
  `maquette/assets/maquette.js`, deux fichiers historiques présents dans `HEAD`
  et non importés par l'application. Ils sont sans rapport avec ce deep dive ;
  leur sort doit être tranché avec la migration vers `maquette-html/`.
