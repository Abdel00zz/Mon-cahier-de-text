# Vérification fichier par fichier de `src/`

**Date :** 6 novembre 2026 · **Instantané :** 16:21:13
**Périmètre :** 559 fichiers, 82 682 lignes, 3 992 805 octets
**Empreinte SHA-256 de l’instantané :** `ac8f7bc11dc3e0c3424013027bfe0f630ba18d5f00b8bf4fcd2d5a66d80d2f49`

> **Mise à jour post-audit :** `src/i18n/messages.ts`, `src/types.ts` et
> `src/components/typography/textFormat.ts` ont depuis été découpés en modules
> (voir [Workflow qualité](../quality/workflow.md)). Le présent tableau reste
> la photographie de l’instantané 16:21:13 et sert de référence historique.

> Le dossier `src/` a été modifié par un autre processus pendant l’audit
> (refonte Paramètres/Aide). Les anomalies transitoires observées en cours de
> route (props manquantes de `AbsencesTab`, `SettingsTabNavigation` supprimé)
> ont disparu. Le tableau final décrit l’instantané ci-dessus ; si l’arbre de
> travail a changé depuis, relancer `node tmp/verify-src.mjs` sur le nouvel
> instantané.

## 1. Résumé

| Contrôle | Résultat |
| --- | ---: |
| Fichiers analysés | **559** (319 `.ts`, 167 `.tsx`, 73 `.css`) |
| Erreurs de syntaxe TypeScript | **0** |
| Imports non résolus (2 485 imports) | **0** |
| Fichiers CSS non référencés | **0** |
| Fichiers/exports inutilisés (`knip`) | **0 dans `src/`** |
| `TODO` / `FIXME` / `@ts-ignore` | **0 / 0** |
| `eslint-disable` | **2**, documentés (dépendances volontairement partielles) |
| `dangerouslySetInnerHTML` | **3** + 1 site `cloneElement`, tous KaTeX `trust: false` |
| `catch` silencieux (sans commentaire) | **4** dans 2 fichiers, volontaires |
| `any` / `as any` | **55 / 22**, confinés aux frontières du modèle de cahier |
| `localStorage` hors couche stockage | **18 fichiers**, lecture/écriture locale assumée |
| Captures vides / fichiers vides | **0** |
| Collisions de casse de chemins | **0** |
| `npm run lint` | ✅ |
| `tsc --noUnusedLocals --noUnusedParameters` | ✅ (après correction) |
| `check:architecture` | ✅ 486 modules |
| `npm run build` | ✅ 3 660 modules |
| Budgets bundle | ✅ 970,4 / 1 150 Ko JS ; 117,6 / 160 Ko CSS |
| `npm test` | ⚠️ 942 réussis, 1 ignoré, **2 échecs de refonte en cours** |

Les deux échecs restants ne viennent pas de cette vérification :

- `test-mobile-layout` : `schedule.css` est passé à une grille téléphone
  `32rem` alors que le test attend encore `26rem` ;
- `test-settings-layout` : le test cherche le menu bureau dans
  `settingsSections.ts`, mais la refonte l’a déplacé vers `ConfigModal`.

Ils doivent être arbitrés avec la refonte visuelle/Paramètres en cours.

## 2. Méthode

Pour chaque fichier :

1. lecture et comptage (lignes, octets, imports, exports) ;
2. analyse AST TypeScript (syntaxe, imports statiques/dynamiques, `any`,
   `as any`, `catch`, `dangerouslySetInnerHTML`, timers, écouteurs,
   `localStorage`, `console`, assertions non nulles) ;
3. résolution de chaque import relatif, `@/` et `.js` vers sa source réelle ;
4. analyse PostCSS pour les 73 feuilles (imports, `url()`, `@font-face`,
   `!important`, couleurs, variables) ;
5. vérification de référencement de tous les CSS et de tous les fichiers ;
6. relecture manuelle des 11 fichiers porteurs d’un motif sensible.

Commandes de contrôle :

```bash
npm run lint
npx tsc --noEmit --noUnusedLocals --noUnusedParameters
node scripts/validation/check-architecture.mjs
npx knip --no-progress
npm run build
npm test
```

## 3. Constats

### P1 — corrigés pendant la vérification

#### V-01 · La déconnexion pouvait être bloquée par un stockage plein

`AuthContext.logout` écrivait `authSignedOut_v1` **avant** son `try` de reprise.
En mode privé ou quota plein, `localStorage.setItem` lève : la promesse de
déconnexion rejette avant le changement d’espace, et l’utilisateur peut rester
connecté localement. Même problème pour `deleteAccount`, après une suppression
serveur déjà effectuée.

- Fichier : [`AuthContext.tsx:334`](../../src/contexts/AuthContext.tsx#L334) et
  [`AuthContext.tsx:387`](../../src/contexts/AuthContext.tsx#L387).
- Correction : écriture et restauration du drapeau en *best effort* ; la
  fermeture de session et le nettoyage local continuent même si le stockage est
  indisponible.
- Vérification : `test-auth-identities`, `test-auth-ui`, `test-entry-flow`
  passent (4 + 14 + 19 tests).

#### V-02 · Un import inutilisé faisait échouer `check:architecture`

`AppearanceTab` importait `SettingsRow` sans l’utiliser. `npm run lint` passait,
mais `tsc --noUnusedLocals` échouait — donc la commande `check:architecture`
de la CI aussi.

- Fichier : [`AppearanceTab.tsx:7`](../../src/features/settings/components/AppearanceTab.tsx#L7).
- Correction : import retiré ; `tsc` avec `noUnusedLocals` passe désormais.

### P2 — à traiter

#### V-03 · Effet de bord dans un initialiseur `useState`

`SettingsOverview` consomme la cible de navigation (`sessionStorage`) **dans**
l’initialiseur de `useState`. En StrictMode, React appelle l’initialiseur deux
fois : la première consommation retire la valeur, la seconde retourne
`undefined`. La cible peut donc être perdue selon le résultat retenu. C’est
aussi une violation de la pureté du rendu (rendu concurrent).

- Fichier : [`SettingsOverview.tsx:20`](../../src/features/settings/SettingsOverview.tsx#L20).
- Recommandation : `useState<SettingsCategory>()` + `useEffect(() =>
  setRequested(consumeSettingsTarget()), [])`, ou consommer la valeur dans un
  effet avant de faire défiler.

#### V-04 · La file de synchronisation peut lever sur quota après une sauvegarde réussie

`persistPendingState` appelle `writeDurably`, qui lève `LocalQuotaError`.
`markClassDirty` est appelé par `saveNotebook` **après** l’écriture du cahier.
Un quota plein peut donc :

1. sauvegarder le cahier,
2. lever en marquant la classe « dirty »,
3. faire afficher « sauvegarde impossible » au professeur,
4. laisser la file non persistée pour le prochain démarrage.

De plus, `saveNotebook` retourne tôt si le JSON est identique
([`saveNotebook.ts:20`](../../src/infrastructure/storage/saveNotebook.ts#L20)),
donc un nouvel appui sur « Enregistrer » sans modification ne réessaiera pas le
marquage.

- Fichiers : [`syncBus.ts:93`](../../src/infrastructure/sync/syncBus.ts#L93),
  [`syncBus.ts:196`](../../src/infrastructure/sync/syncBus.ts#L196),
  [`saveNotebook.ts:20`](../../src/infrastructure/storage/saveNotebook.ts#L20).
- Recommandation : rendre la persistance de la file *best effort* avec un
  drapeau mémoire, et/ou re-marquer la classe quand `previous === serialized`
  mais que la file ne contient pas la version courante.

#### V-05 · CSS d’inscription dupliqué et contradictoire

Les classes `registration-*` sont définies dans **deux** feuilles :

- [`landing.css:4`](../../src/features/auth/landing.css#L4) — chargée avec
  `RegistrationOnboarding` (lazy) ;
- [`onboarding.css:71`](../../src/styles/onboarding.css#L71) — chargée
  globalement par `styles/index.css`.

Les valeurs divergent : `.registration-studio` a un padding
`8px 20px 64px` d’un côté et `24px` de l’autre ; `.registration-dock` est
`static`/transparent dans `landing.css` mais `fixed` avec `backdrop-filter`
dans `onboarding.css` à 420 px. Seul `RegistrationOnboarding` utilise ces
classes. Comme `landing.css` arrive après `index.css`, il gagne dans les
parcours qui l’ont chargé ; le résultat dépend donc du parcours utilisateur.

- Recommandation : supprimer le bloc `registration-*` de `onboarding.css`
  (devenu inutilisé) ou le déplacer dans une feuille partagée unique.

#### V-06 · Réponse administrateur non validée à la frontière

`fetchTeacher` renvoie directement le JSON du serveur typé `TeacherDetail`.
Les autres appels valident au moins les tableaux (`fetchOverview`,
`fetchTeacherMessages`). Une réponse proxy/dev incomplète peut donc propager
`undefined` dans `TeacherDetail` et casser la console.

- Fichier : [`admin/api.ts:105`](../../src/admin/api.ts#L105).
- Recommandation : valider la forme minimale (`user`, `classes`, `documents`,
  `activities`, `printSettings`) avant retour, comme `fetchOverview`.

#### V-07 · Deux minuteries d’interface sans nettoyage

- [`animated-submit-button.tsx:63`](../../src/components/ui/animated-submit-button.tsx#L63) :
  `setTimeout(..., 2000)` remet le succès à zéro ; si le bouton est démonté
  avant, l’écriture d’état est ignorée mais la minuterie survit.
- [`StudentNamesEditor.tsx:161`](../../src/features/evaluations/components/StudentNamesEditor.tsx#L161) :
  même schéma pour le badge « copié ».

Impact limité (deux secondes, pas de fuite de données), mais le motif mérite
un `useRef` + `clearTimeout` au démontage.

#### V-08 · Préchargement de tous les écrans lourds à l’inactivité

`startIdlePrefetch` charge `Dashboard`, `Editor`, `SettingsPage`,
`ClassEvaluationsSheet` et `Guide` dès le premier temps mort
([`prefetch.ts:22`](../../src/app/prefetch.ts#L22)). C’est un choix assumé
(navigation sans attente), mais il annule une partie du bénéfice des routes
paresseuses sur un téléphone d’entrée de gamme : ~150 Ko gzip sont demandés
après le premier écran. Le garde-fou `saveData`/2G existe déjà.
Recommandation : ne précharger que `dashboard` + `editor` par défaut, et
déclencher les autres au survol/à l’approche du geste.

### P3 — dette de finition

- **`!important`** : 97 dans `evaluationReference.css`, 83 dans
  `createClassModal.css`, 65 dans `classCards.css`, 61 dans `print.css`.
  Une part relève de l’impression, mais le volume empêche de raisonner sur la
  cascade. À traiter par tokens de thème.
- **`any`** : 55 occurrences / 22 `as any`, concentrées dans
  `dataUtils.ts`, `printMeta.ts`, `tableRows.ts`, `useSelectionData.ts` et les
  composants de ligne. Elles décrivent des arbres hétérogènes, pas des données
  réseau non validées ; une modélisation discriminée les réduirait sans
  changement fonctionnel.
- **`localStorage` hors `infrastructure/storage`** : 18 fichiers. Les lectures
  synchrones sont souvent volontaires (démarrage sans squelette), mais les
  écritures doivent rester enveloppées. `AuthContext` était la seule écriture
  non protégée trouvée.
- **Fins de ligne mixtes** : `main.tsx`, `editor-save.css`, `EditorSaveControl.tsx`,
  `header.css`, `notebookRefresh.ts`. Aucun impact fonctionnel, mais les diffs
  Git deviennent bruités.
- **`PAGE_SECTIONS`** dans `SettingsOverview.tsx` utilise `!` sur
  `SETTINGS_SECTIONS.find(...)` : une rubrique renommée ferait échouer le
  module au chargement. Un filtrage explicite serait plus sûr.

## 4. Revue ciblée des motifs sensibles

### HTML injecté — sûr

Les quatre sites (`ContentRenderer`, `math-text`, `math-title`, `textFormat`)
ne composent que du HTML KaTeX. `config/katex.ts` fixe `trust: false` et
`strict: false`; en cas d’échec, le fallback échappe `&`, `<`, `>`.
`textFormat` n’injecte que la ponctuation de collage, échappée pour `&` et `<`.
Aucun HTML utilisateur n’est injecté.

### Écouteurs — durée de vie applicative

`main.tsx`, `notificationActivation.ts` et `pwaInstall.ts` ajoutent des
écouteurs au niveau application ; ils sont retirés au démontage HMR ou jamais,
ce qui est correct pour une coque unique. Aucun écouteur par instance de
composant n’est laissé derrière.

### `catch` silencieux — volontaires

Les quatre `catch {}` sont :

- `App.tsx` : préférence d’affichage de la barre latérale ;
- `AssignDateModal.tsx` : haptique et `showPicker` (repli silencieux).

Aucun `catch` ne masque une erreur métier, réseau ou de sauvegarde.

### Timers

`SettingsPage` nettoie son timer de fermeture et ne garde que le rechargement
volontaire après import. `useMoroccoToday`, `useSessionAlerts`,
`useNativeReminders` et `AuthContext` nettoient leurs minuteries. Les deux
oublis restants sont V-07.

### Imports et fichiers morts

- 2 485 imports résolus, y compris les spécificateurs `.js` des modules ESM
  destinés à Node.
- 73 feuilles CSS toutes référencées.
- `knip` ne signale aucun fichier ni export de `src/` inutilisé ; les deux
  seuls fichiers signalés sont les anciens `maquette/assets/*`, hors `src/`.

## 5. Inventaire exhaustif

Chaque ligne est un fichier réel de l’instantané. `Statut` :

- **OK** : parse, imports et références valides, aucun motif sensible ;
- **INFO** : `any`/`as any`, `console`, `localStorage` ou `!important`
  localisé, sans défaut démontré ;
- **REVUE** : HTML injecté, revu manuellement (KaTeX sûr) ;
- **ATTENTION** : motif à qualifier (catch vide, écouteur, minuterie) ;
- **ERREUR** : import non résolu ou syntaxe invalide (aucun).


| Fichier | Lignes | Imports | Statut | Contrôles |
| --- | ---: | ---: | --- | --- |

**(racine)** (2 fichiers)

| Fichier | Lignes | Imports | Statut | Contrôles |
| --- | ---: | ---: | --- | --- |
| `src/types.ts` | 573 | 0 | OK | — |
| `src/vite-env.d.ts` | 9 | 0 | OK | — |

**admin** (22 fichiers)

| Fichier | Lignes | Imports | Statut | Contrôles |
| --- | ---: | ---: | --- | --- |
| `src/admin/AdminApp.tsx` | 231 | 16 | OK | — |
| `src/admin/api.ts` | 257 | 7 | INFO | any(1) |
| `src/admin/components/adminClassCreation.css` | 21 | 0 | INFO | !important(6) |
| `src/admin/components/AdminConversation.tsx` | 29 | 2 | OK | — |
| `src/admin/components/AdminDocumentPreview.tsx` | 93 | 9 | OK | — |
| `src/admin/components/AdminLogin.tsx` | 121 | 8 | OK | — |
| `src/admin/components/AuditLog.tsx` | 181 | 8 | OK | — |
| `src/admin/components/CalendarManager.tsx` | 124 | 7 | OK | — |
| `src/admin/components/ClassJsonImportModal.tsx` | 287 | 9 | OK | — |
| `src/admin/components/ClassProgression.tsx` | 214 | 9 | OK | — |
| `src/admin/components/ClassRosterModal.tsx` | 48 | 9 | OK | — |
| `src/admin/components/evaluationPolicy.css` | 226 | 0 | OK | — |
| `src/admin/components/EvaluationPolicyManager.tsx` | 437 | 8 | OK | — |
| `src/admin/components/OfficialBulletinManager.tsx` | 208 | 7 | OK | — |
| `src/admin/components/TeacherDetail.tsx` | 1396 | 38 | INFO | any(2) |
| `src/admin/components/TeacherList.tsx` | 683 | 14 | OK | — |
| `src/admin/components/TimetableClockManager.tsx` | 254 | 7 | OK | — |
| `src/admin/establishments.ts` | 15 | 0 | OK | — |
| `src/admin/index.tsx` | 23 | 6 | OK | — |
| `src/admin/overviewTools.ts` | 118 | 0 | OK | — |
| `src/admin/route.ts` | 69 | 0 | OK | — |
| `src/admin/utils.ts` | 31 | 2 | OK | — |

**app** (7 fichiers)

| Fichier | Lignes | Imports | Statut | Contrôles |
| --- | ---: | ---: | --- | --- |
| `src/app/App.tsx` | 438 | 49 | ATTENTION | catch vide(2), localStorage |
| `src/app/main.tsx` | 102 | 14 | ATTENTION | console(1), écouteur |
| `src/app/navigation/appRoutes.ts` | 30 | 3 | OK | — |
| `src/app/navigation/GuideNavigationContext.ts` | 6 | 2 | OK | — |
| `src/app/navigation/useAppNavigation.ts` | 136 | 4 | OK | — |
| `src/app/prefetch.ts` | 89 | 7 | OK | — |
| `src/app/preload.ts` | 19 | 2 | OK | — |

**components** (76 fichiers)

| Fichier | Lignes | Imports | Statut | Contrôles |
| --- | ---: | ---: | --- | --- |
| `src/components/curriculum/CurriculumChapterProgress.tsx` | 40 | 3 | OK | — |
| `src/components/curriculum/CurriculumLinkView.tsx` | 124 | 10 | INFO | localStorage |
| `src/components/curriculum/CurriculumProgramView.tsx` | 32 | 5 | OK | — |
| `src/components/documents/DocumentPreview.tsx` | 106 | 10 | OK | — |
| `src/components/documents/documentPrint.css` | 95 | 0 | INFO | !important(34) |
| `src/components/documents/DocumentPrintButton.tsx` | 95 | 14 | OK | — |
| `src/components/documents/documentSheet.css` | 187 | 0 | INFO | !important(7) |
| `src/components/documents/DocumentSheetHeader.tsx` | 30 | 1 | OK | — |
| `src/components/MotionFilmCanvas.tsx` | 1318 | 4 | OK | — |
| `src/components/navigation/DesktopSidebar.tsx` | 30 | 4 | OK | — |
| `src/components/navigation/MobileTabBar.tsx` | 34 | 3 | OK | — |
| `src/components/navigation/navigation.css` | 128 | 0 | OK | — |
| `src/components/navigation/NavigationButton.tsx` | 40 | 5 | OK | — |
| `src/components/navigation/navigationConfig.ts` | 21 | 1 | OK | — |
| `src/components/navigation/TabBar.tsx` | 29 | 9 | OK | — |
| `src/components/navigation/useNavigationGestures.ts` | 66 | 4 | OK | — |
| `src/components/support/SupportWhatsAppBlock.tsx` | 75 | 2 | OK | — |
| `src/components/typography/ordinalTypography.tsx` | 61 | 1 | OK | — |
| `src/components/typography/textFormat.ts` | 910 | 8 | OK | — |
| `src/components/ui/action-tile.css` | 56 | 0 | OK | — |
| `src/components/ui/animated-submit-button.tsx` | 118 | 6 | ATTENTION | any(1), as any(1), minuteur |
| `src/components/ui/AnimatedTrashButton.css` | 119 | 0 | OK | — |
| `src/components/ui/AnimatedTrashButton.tsx` | 136 | 4 | OK | — |
| `src/components/ui/AppErrorBoundary.tsx` | 106 | 2 | INFO | console(1) |
| `src/components/ui/badge.tsx` | 31 | 3 | OK | — |
| `src/components/ui/bloub-avatar.css` | 21 | 0 | OK | — |
| `src/components/ui/BloubAvatar.tsx` | 159 | 4 | OK | — |
| `src/components/ui/button.tsx` | 56 | 4 | OK | — |
| `src/components/ui/card.tsx` | 29 | 2 | OK | — |
| `src/components/ui/checkbox.tsx` | 67 | 4 | OK | — |
| `src/components/ui/CommandPalette.tsx` | 284 | 6 | OK | — |
| `src/components/ui/confirm-dialog.tsx` | 250 | 11 | OK | — |
| `src/components/ui/DeferredMount.tsx` | 9 | 1 | OK | — |
| `src/components/ui/dropdown-menu.tsx` | 96 | 3 | OK | — |
| `src/components/ui/dual-progress-bar.tsx` | 34 | 2 | OK | — |
| `src/components/ui/dynamic-illustrations.css` | 119 | 0 | OK | — |
| `src/components/ui/DynamicIllustration.tsx` | 332 | 4 | OK | — |
| `src/components/ui/error-boundary.css` | 156 | 0 | OK | — |
| `src/components/ui/form-field.ts` | 34 | 1 | OK | — |
| `src/components/ui/GlobalTooltip.tsx` | 280 | 3 | OK | — |
| `src/components/ui/icons.css` | 27 | 0 | OK | — |
| `src/components/ui/icons.ts` | 201 | 1 | OK | — |
| `src/components/ui/import-summary.tsx` | 43 | 2 | OK | — |
| `src/components/ui/input.tsx` | 24 | 3 | OK | — |
| `src/components/ui/loading-hint.css` | 35 | 0 | OK | — |
| `src/components/ui/loading-spinner.css` | 77 | 0 | OK | — |
| `src/components/ui/LoadingHint.tsx` | 27 | 3 | OK | — |
| `src/components/ui/LoadingSpinner.tsx` | 21 | 1 | OK | — |
| `src/components/ui/math-text.tsx` | 59 | 3 | REVUE | HTML(1) |
| `src/components/ui/math-title.tsx` | 25 | 3 | REVUE | HTML(1) |
| `src/components/ui/modal-animations.ts` | 52 | 1 | OK | — |
| `src/components/ui/modal-bottom-sheet.tsx` | 183 | 10 | OK | — |
| `src/components/ui/modal-motion.css` | 300 | 1 | INFO | !important(8) |
| `src/components/ui/modal.tsx` | 12 | 1 | OK | — |
| `src/components/ui/ModalEmptyState.tsx` | 148 | 6 | OK | — |
| `src/components/ui/motion-surface.css` | 10 | 0 | OK | — |
| `src/components/ui/MotionSurface.tsx` | 22 | 4 | OK | — |
| `src/components/ui/motionSurfaceController.ts` | 126 | 1 | OK | — |
| `src/components/ui/page-loading.css` | 50 | 0 | OK | — |
| `src/components/ui/PageSkeleton.tsx` | 158 | 8 | OK | — |
| `src/components/ui/paper-controls.css` | 59 | 0 | OK | — |
| `src/components/ui/segmented.tsx` | 74 | 4 | OK | — |
| `src/components/ui/select.tsx` | 141 | 6 | OK | — |
| `src/components/ui/skeleton.tsx` | 17 | 2 | OK | — |
| `src/components/ui/sonner.tsx` | 43 | 3 | OK | — |
| `src/components/ui/SquareActionButton.tsx` | 60 | 4 | OK | — |
| `src/components/ui/status-notice.tsx` | 37 | 3 | OK | — |
| `src/components/ui/switch.css` | 32 | 0 | OK | — |
| `src/components/ui/switch.tsx` | 29 | 4 | OK | — |
| `src/components/ui/sync-strip.css` | 43 | 0 | OK | — |
| `src/components/ui/SyncStrip.tsx` | 17 | 3 | OK | — |
| `src/components/ui/tabs.tsx` | 57 | 3 | OK | — |
| `src/components/ui/textarea.tsx` | 27 | 3 | OK | — |
| `src/components/ui/virtual-list.tsx` | 250 | 5 | OK | — |
| `src/components/ui/workspace-page.css` | 18 | 0 | OK | — |
| `src/components/ui/WorkspacePage.tsx` | 22 | 2 | OK | — |

**config** (2 fichiers)

| Fichier | Lignes | Imports | Statut | Contrôles |
| --- | ---: | ---: | --- | --- |
| `src/config/features.ts` | 11 | 0 | OK | — |
| `src/config/katex.ts` | 173 | 2 | OK | — |

**constants** (36 fichiers)

| Fichier | Lignes | Imports | Statut | Contrôles |
| --- | ---: | ---: | --- | --- |
| `src/constants/class-levels.ts` | 722 | 2 | OK | — |
| `src/constants/classTitleTypography.ts` | 81 | 2 | OK | — |
| `src/constants/contentDocument.ts` | 15 | 0 | OK | — |
| `src/constants/guide/about.ts` | 48 | 1 | OK | — |
| `src/constants/guide/appearance.ts` | 52 | 1 | OK | — |
| `src/constants/guide/assessments.ts` | 64 | 1 | OK | — |
| `src/constants/guide/backup.ts` | 52 | 1 | OK | — |
| `src/constants/guide/classes.ts` | 58 | 1 | OK | — |
| `src/constants/guide/content.ts` | 44 | 1 | OK | — |
| `src/constants/guide/curriculum.ts` | 50 | 1 | OK | — |
| `src/constants/guide/dates.ts` | 58 | 1 | OK | — |
| `src/constants/guide/devices.ts` | 86 | 1 | OK | — |
| `src/constants/guide/editor.ts` | 64 | 1 | OK | — |
| `src/constants/guide/groups.ts` | 8 | 0 | OK | — |
| `src/constants/guide/legal.ts` | 134 | 1 | OK | — |
| `src/constants/guide/math.ts` | 52 | 1 | OK | — |
| `src/constants/guide/model.ts` | 26 | 0 | OK | — |
| `src/constants/guide/navigation.ts` | 10 | 1 | OK | — |
| `src/constants/guide/notifications.ts` | 72 | 1 | OK | — |
| `src/constants/guide/print.ts` | 70 | 1 | OK | — |
| `src/constants/guide/profile.ts` | 48 | 1 | OK | — |
| `src/constants/guide/schedule.ts` | 46 | 1 | OK | — |
| `src/constants/guide/searchText.ts` | 5 | 0 | OK | — |
| `src/constants/guide/start.ts` | 84 | 1 | OK | — |
| `src/constants/guide/students.ts` | 58 | 1 | OK | — |
| `src/constants/guide/troubleshooting.ts` | 58 | 1 | OK | — |
| `src/constants/guide/types.ts` | 62 | 1 | OK | — |
| `src/constants/guides.ts` | 51 | 24 | OK | — |
| `src/constants/index.ts` | 30 | 5 | OK | — |
| `src/constants/pedagogicalTips.ts` | 368 | 1 | OK | — |
| `src/constants/subjects.ts` | 110 | 1 | OK | — |
| `src/constants/support.ts` | 43 | 0 | OK | — |
| `src/constants/top-level-types.ts` | 30 | 1 | OK | — |
| `src/constants/type-domains.ts` | 83 | 0 | OK | — |
| `src/constants/type-keys.ts` | 232 | 0 | OK | — |
| `src/constants/type-maps.ts` | 44 | 6 | OK | — |

**contexts** (4 fichiers)

| Fichier | Lignes | Imports | Statut | Contrôles |
| --- | ---: | ---: | --- | --- |
| `src/contexts/AuthContext.tsx` | 439 | 14 | INFO | localStorage |
| `src/contexts/SubjectScopeContext.tsx` | 27 | 1 | OK | — |
| `src/contexts/SyncContext.tsx` | 840 | 34 | INFO | localStorage |
| `src/contexts/TeacherMessagingContext.tsx` | 7 | 3 | OK | — |

**domain** (113 fichiers)

| Fichier | Lignes | Imports | Statut | Contrôles |
| --- | ---: | ---: | --- | --- |
| `src/domain/admin/auditLog.ts` | 85 | 0 | OK | — |
| `src/domain/assistant/classGuidance.ts` | 181 | 6 | OK | — |
| `src/domain/assistant/companionBrain.ts` | 240 | 15 | OK | — |
| `src/domain/assistant/companionCalendar.ts` | 66 | 5 | OK | — |
| `src/domain/assistant/companionDecision.ts` | 99 | 4 | OK | — |
| `src/domain/assistant/companionHelp.ts` | 38 | 3 | OK | — |
| `src/domain/assistant/companionPedagogicalBehavior.ts` | 118 | 1 | OK | — |
| `src/domain/assistant/contentSuggestion.ts` | 119 | 5 | OK | — |
| `src/domain/assistant/notebookActivity.ts` | 30 | 0 | OK | — |
| `src/domain/assistant/notebookFollowup.ts` | 74 | 8 | OK | — |
| `src/domain/assistant/notebookSnapshot.ts` | 24 | 1 | OK | — |
| `src/domain/assistant/pedagogicalTasks.ts` | 74 | 3 | OK | — |
| `src/domain/auth/accountIdentity.ts` | 6 | 0 | OK | — |
| `src/domain/auth/onboardingCompletion.ts` | 6 | 0 | OK | — |
| `src/domain/auth/profilePhone.ts` | 16 | 0 | OK | — |
| `src/domain/calendar/calendar.ts` | 461 | 3 | OK | — |
| `src/domain/calendar/dateOrder.ts` | 116 | 5 | OK | — |
| `src/domain/calendar/dateValidation.ts` | 184 | 5 | OK | — |
| `src/domain/calendar/lateness.ts` | 155 | 5 | OK | — |
| `src/domain/calendar/sessionScheduleStatus.ts` | 298 | 4 | OK | — |
| `src/domain/calendar/timetable.ts` | 362 | 2 | OK | — |
| `src/domain/classes/classAbbreviation.ts` | 249 | 4 | OK | — |
| `src/domain/classes/classColors.ts` | 111 | 5 | OK | — |
| `src/domain/classes/classCurriculumSettings.ts` | 14 | 1 | OK | — |
| `src/domain/classes/classGroup.ts` | 41 | 0 | OK | — |
| `src/domain/classes/classIdentity.ts` | 254 | 4 | OK | — |
| `src/domain/classes/classLevelParts.ts` | 53 | 2 | OK | — |
| `src/domain/classes/classMetadata.ts` | 29 | 3 | OK | — |
| `src/domain/classes/classOrder.ts` | 47 | 1 | OK | — |
| `src/domain/classes/moroccoEducation.ts` | 192 | 0 | OK | — |
| `src/domain/classes/subjectPolicy.ts` | 368 | 2 | OK | — |
| `src/domain/classes/subjectScope.ts` | 66 | 1 | OK | — |
| `src/domain/classes/teacherCycles.ts` | 9 | 2 | OK | — |
| `src/domain/classes/teacherIdentity.ts` | 46 | 1 | OK | — |
| `src/domain/curriculum/chapterLifecycle.ts` | 115 | 4 | OK | — |
| `src/domain/curriculum/officialCurriculum.ts` | 185 | 8 | OK | — |
| `src/domain/curriculum/predefinedContent.ts` | 391 | 3 | OK | — |
| `src/domain/curriculum/progression.ts` | 204 | 6 | INFO | any(4) |
| `src/domain/evaluations/activityDocumentPreviews.ts` | 82 | 8 | OK | — |
| `src/domain/evaluations/activityTitle.ts` | 45 | 2 | OK | — |
| `src/domain/evaluations/adminDocuments.ts` | 94 | 2 | OK | — |
| `src/domain/evaluations/assessmentAbsences.ts` | 44 | 3 | OK | — |
| `src/domain/evaluations/assessmentRules.ts` | 163 | 0 | OK | — |
| `src/domain/evaluations/assessments.ts` | 519 | 5 | OK | — |
| `src/domain/evaluations/assessmentSync.ts` | 220 | 3 | OK | — |
| `src/domain/evaluations/classRosterSync.ts` | 83 | 4 | OK | — |
| `src/domain/evaluations/dateRange.ts` | 46 | 0 | OK | — |
| `src/domain/evaluations/documentRequirement.ts` | 57 | 2 | OK | — |
| `src/domain/evaluations/documentSheet.ts` | 420 | 2 | OK | — |
| `src/domain/evaluations/documentSync.ts` | 59 | 2 | OK | — |
| `src/domain/evaluations/evaluationConflicts.ts` | 129 | 9 | OK | — |
| `src/domain/evaluations/evaluationPolicy.ts` | 236 | 2 | OK | — |
| `src/domain/evaluations/homeworkCorrectionContent.ts` | 72 | 9 | OK | — |
| `src/domain/evaluations/homeworkCorrectionIdentity.ts` | 18 | 4 | OK | — |
| `src/domain/evaluations/homeworkCycle.ts` | 230 | 2 | OK | — |
| `src/domain/evaluations/homeworkIds.ts` | 15 | 0 | OK | — |
| `src/domain/evaluations/homeworkNumbering.ts` | 362 | 3 | OK | — |
| `src/domain/evaluations/homeworkPlacement.ts` | 76 | 5 | OK | — |
| `src/domain/evaluations/homeworkSubmissions.ts` | 48 | 1 | OK | — |
| `src/domain/evaluations/kindAvailability.ts` | 59 | 1 | OK | — |
| `src/domain/evaluations/notebookCheckRemarks.ts` | 114 | 2 | OK | — |
| `src/domain/evaluations/notebookConditions.ts` | 23 | 1 | OK | — |
| `src/domain/evaluations/notebookReconciliation.ts` | 356 | 11 | OK | — |
| `src/domain/evaluations/notebookSyncBridge.ts` | 369 | 9 | OK | — |
| `src/domain/evaluations/officialStudentEvents.ts` | 264 | 6 | OK | — |
| `src/domain/evaluations/pedagogicalActivities.ts` | 134 | 1 | OK | — |
| `src/domain/evaluations/sessionActivityRemarks.ts` | 112 | 7 | OK | — |
| `src/domain/evaluations/sessionRemarkChanges.ts` | 214 | 12 | OK | — |
| `src/domain/evaluations/studentRoster.ts` | 52 | 1 | OK | — |
| `src/domain/intelligence/fingerprint.ts` | 61 | 1 | OK | — |
| `src/domain/intelligence/notebookAdvisor.ts` | 110 | 5 | OK | — |
| `src/domain/intelligence/pedagogicalBrain.ts` | 461 | 12 | OK | — |
| `src/domain/messages/conversation.ts` | 11 | 1 | OK | — |
| `src/domain/notebook/absenceInjection.ts` | 171 | 4 | OK | — |
| `src/domain/notebook/absenceSessions.ts` | 118 | 5 | OK | — |
| `src/domain/notebook/chapterExport.ts` | 67 | 4 | OK | — |
| `src/domain/notebook/classSessionDates.ts` | 82 | 3 | OK | — |
| `src/domain/notebook/contentDiagnostics.ts` | 236 | 11 | OK | — |
| `src/domain/notebook/contentDirection.ts` | 121 | 3 | OK | — |
| `src/domain/notebook/contentDraft.ts` | 50 | 3 | OK | — |
| `src/domain/notebook/contentEditing.ts` | 186 | 9 | INFO | any(1), as any(1) |
| `src/domain/notebook/contentNumbering.ts` | 98 | 4 | OK | — |
| `src/domain/notebook/contentReorder.ts` | 526 | 7 | OK | — |
| `src/domain/notebook/dataUtils.ts` | 476 | 7 | INFO | any(9), as any(3) |
| `src/domain/notebook/freeContent.ts` | 55 | 4 | OK | — |
| `src/domain/notebook/freeLineType.ts` | 17 | 0 | OK | — |
| `src/domain/notebook/importLimits.ts` | 3 | 0 | OK | — |
| `src/domain/notebook/importPipeline.ts` | 322 | 10 | OK | — |
| `src/domain/notebook/importPreview.ts` | 21 | 3 | OK | — |
| `src/domain/notebook/jsonInput.ts` | 10 | 0 | OK | — |
| `src/domain/notebook/lessonRows.ts` | 98 | 2 | OK | — |
| `src/domain/notebook/notebookOpening.ts` | 14 | 2 | OK | — |
| `src/domain/notebook/notebookSchema.ts` | 72 | 1 | OK | — |
| `src/domain/notebook/notebookTraversal.ts` | 162 | 2 | OK | — |
| `src/domain/notebook/notebookValidation.ts` | 33 | 3 | OK | — |
| `src/domain/notebook/separateAbsenceContent.ts` | 29 | 2 | OK | — |
| `src/domain/notebook/sessionEditing.ts` | 50 | 4 | OK | — |
| `src/domain/notebook/sessionProgression.ts` | 91 | 3 | OK | — |
| `src/domain/notebook/starterDiagnostic.ts` | 74 | 1 | OK | — |
| `src/domain/notebook/tableRows.ts` | 225 | 5 | INFO | any(3), as any(3) |
| `src/domain/notebook/textSignals.ts` | 23 | 0 | OK | — |
| `src/domain/notifications/appBadge.ts` | 25 | 0 | OK | — |
| `src/domain/notifications/nativeReminderPlan.ts` | 64 | 7 | OK | — |
| `src/domain/notifications/notificationPresentation.ts` | 81 | 3 | OK | — |
| `src/domain/notifications/notificationTypes.ts` | 41 | 0 | OK | — |
| `src/domain/notifications/sessionAlertEngine.ts` | 62 | 7 | OK | — |
| `src/domain/notifications/sessionNotificationCopy.ts` | 38 | 8 | OK | — |
| `src/domain/notifications/sessionReminderTiming.ts` | 14 | 2 | OK | — |
| `src/domain/sync/bootScreen.ts` | 36 | 0 | OK | — |
| `src/domain/sync/bootstrapProgress.ts` | 43 | 0 | OK | — |
| `src/domain/sync/editorSyncTone.ts` | 7 | 0 | OK | — |
| `src/domain/sync/syncStatusLabel.ts` | 39 | 0 | OK | — |
| `src/domain/validation/schemas.ts` | 114 | 1 | OK | — |

**features** (182 fichiers)

| Fichier | Lignes | Imports | Statut | Contrôles |
| --- | ---: | ---: | --- | --- |
| `src/features/assistant/AssistantExplorer.tsx` | 65 | 8 | OK | — |
| `src/features/assistant/assistantPlacement.ts` | 82 | 1 | OK | — |
| `src/features/assistant/AssistantPopover.tsx` | 230 | 15 | OK | — |
| `src/features/assistant/assistantPopoverController.ts` | 27 | 0 | OK | — |
| `src/features/assistant/AssistantTips.tsx` | 98 | 5 | OK | — |
| `src/features/assistant/ClassAssistant.tsx` | 304 | 26 | OK | — |
| `src/features/assistant/companion.css` | 146 | 0 | OK | — |
| `src/features/assistant/companionCalendarCopy.ts` | 42 | 5 | OK | — |
| `src/features/assistant/companionClassName.ts` | 13 | 2 | OK | — |
| `src/features/assistant/companionCopy.ts` | 404 | 5 | OK | — |
| `src/features/assistant/companionHelpCopy.ts` | 10 | 1 | OK | — |
| `src/features/assistant/companionPresentation.ts` | 36 | 8 | OK | — |
| `src/features/assistant/companionSearch.ts` | 53 | 7 | OK | — |
| `src/features/assistant/companionServiceCopy.ts` | 36 | 2 | OK | — |
| `src/features/assistant/CompanionText.tsx` | 25 | 1 | OK | — |
| `src/features/assistant/contentSuggestionCopy.ts` | 107 | 5 | OK | — |
| `src/features/assistant/notebookActivityCopy.ts` | 24 | 2 | OK | — |
| `src/features/assistant/notebookFollowupCopy.ts` | 27 | 4 | OK | — |
| `src/features/assistant/PwaInstallModal.tsx` | 158 | 7 | OK | — |
| `src/features/assistant/useCompanionGuide.ts` | 29 | 4 | OK | — |
| `src/features/assistant/useCompanionRevision.ts` | 36 | 2 | OK | — |
| `src/features/assistant/welcomeSession.ts` | 41 | 1 | OK | — |
| `src/features/auth/auth-layout.css` | 63 | 0 | OK | — |
| `src/features/auth/authErrors.ts` | 24 | 0 | OK | — |
| `src/features/auth/authForm.ts` | 20 | 0 | OK | — |
| `src/features/auth/authMotion.css` | 66 | 0 | OK | — |
| `src/features/auth/authNavigation.ts` | 27 | 0 | OK | — |
| `src/features/auth/AuthPage.tsx` | 748 | 17 | OK | — |
| `src/features/auth/GoogleSignInButton.tsx` | 17 | 1 | OK | — |
| `src/features/auth/landing.css` | 60 | 0 | OK | — |
| `src/features/auth/LandingPage.tsx` | 22 | 5 | OK | — |
| `src/features/auth/RegistrationOnboarding.tsx` | 356 | 12 | OK | — |
| `src/features/auth/registrationSetup.ts` | 184 | 4 | OK | — |
| `src/features/dashboard/addClassCard.css` | 196 | 0 | INFO | !important(8) |
| `src/features/dashboard/AddClassCard.tsx` | 47 | 7 | OK | — |
| `src/features/dashboard/ClassActionsMenu.tsx` | 155 | 10 | OK | — |
| `src/features/dashboard/classActionsSheet.css` | 68 | 0 | INFO | !important(9) |
| `src/features/dashboard/ClassCard.tsx` | 167 | 17 | OK | — |
| `src/features/dashboard/classCardLoading.css` | 30 | 0 | OK | — |
| `src/features/dashboard/classCards.css` | 847 | 0 | INFO | !important(65) |
| `src/features/dashboard/classDisplayMode.ts` | 17 | 0 | OK | — |
| `src/features/dashboard/ClassGroupWatermark.tsx` | 62 | 2 | OK | — |
| `src/features/dashboard/ClassListItem.tsx` | 143 | 15 | OK | — |
| `src/features/dashboard/Dashboard.tsx` | 640 | 37 | OK | — |
| `src/features/dashboard/dashboardActions.css` | 53 | 0 | OK | — |
| `src/features/dashboard/DashboardActions.tsx` | 54 | 6 | OK | — |
| `src/features/dashboard/dashboardCanvas.css` | 159 | 0 | INFO | !important(18) |
| `src/features/dashboard/dashboardCanvas.ts` | 192 | 4 | OK | — |
| `src/features/dashboard/dashboardClassGroups.ts` | 45 | 2 | OK | — |
| `src/features/dashboard/departmentPalette.ts` | 115 | 1 | OK | — |
| `src/features/dashboard/hooks/useCardSurface.ts` | 38 | 1 | OK | — |
| `src/features/dashboard/hooks/useClassPress.ts` | 63 | 2 | OK | — |
| `src/features/dashboard/modals/classCreationFlow.ts` | 135 | 7 | OK | — |
| `src/features/dashboard/modals/ClassCreationProgress.tsx` | 76 | 2 | OK | — |
| `src/features/dashboard/modals/ClassRosterFields.tsx` | 58 | 6 | OK | — |
| `src/features/dashboard/modals/createClassModal.css` | 1153 | 0 | INFO | !important(83) |
| `src/features/dashboard/modals/CreateClassModal.tsx` | 790 | 28 | OK | — |
| `src/features/dashboard/onboarding/content.ts` | 153 | 4 | OK | — |
| `src/features/dashboard/onboarding/gettingStarted.ts` | 19 | 1 | OK | — |
| `src/features/dashboard/onboarding/navigation.ts` | 24 | 3 | OK | — |
| `src/features/dashboard/onboarding/OnboardingShell.tsx` | 263 | 9 | OK | — |
| `src/features/dashboard/onboarding/steps/ClassesStep.tsx` | 473 | 9 | OK | — |
| `src/features/dashboard/onboarding/steps/ProfileStep.tsx` | 121 | 7 | OK | — |
| `src/features/dashboard/onboarding/steps/ScheduleStep.tsx` | 18 | 3 | OK | — |
| `src/features/dashboard/onboarding/steps/SubjectsStep.tsx` | 145 | 9 | OK | — |
| `src/features/dashboard/onboarding/types.ts` | 93 | 2 | OK | — |
| `src/features/dashboard/onboarding/useOnboardingNavigation.ts` | 42 | 3 | OK | — |
| `src/features/dashboard/OnboardingPage.tsx` | 189 | 14 | OK | — |
| `src/features/editor/ContentRenderer.tsx` | 459 | 17 | REVUE | any(1), HTML(1) |
| `src/features/editor/editor-save.css` | 82 | 0 | OK | — |
| `src/features/editor/Editor.tsx` | 1527 | 77 | INFO | any(1), eslint-disable, localStorage |
| `src/features/editor/EditorBackButton.tsx` | 11 | 1 | OK | — |
| `src/features/editor/editorFontLoading.ts` | 36 | 0 | OK | — |
| `src/features/editor/EditorModals.tsx` | 229 | 18 | OK | — |
| `src/features/editor/editorRowReorder.css` | 90 | 0 | OK | — |
| `src/features/editor/editorRowStates.css` | 40 | 0 | OK | — |
| `src/features/editor/EditorSaveControl.tsx` | 25 | 5 | OK | — |
| `src/features/editor/editorTypography.css` | 138 | 0 | INFO | !important(20) |
| `src/features/editor/header.css` | 92 | 0 | OK | — |
| `src/features/editor/Header.tsx` | 89 | 7 | OK | — |
| `src/features/editor/hooks/useBulkOperations.ts` | 50 | 6 | OK | — |
| `src/features/editor/hooks/useHistoryState.ts` | 106 | 2 | INFO | any(1), as any(1) |
| `src/features/editor/hooks/useLessonSearch.ts` | 12 | 4 | OK | — |
| `src/features/editor/hooks/useNotebookDocumentPreviews.ts` | 100 | 8 | OK | — |
| `src/features/editor/hooks/useNotebookOpeningFocus.ts` | 26 | 3 | OK | — |
| `src/features/editor/hooks/useSelectionData.ts` | 31 | 3 | INFO | any(5), as any(5) |
| `src/features/editor/hooks/useSelectionEngine.ts` | 121 | 6 | OK | — |
| `src/features/editor/hooks/useSessionAssignment.ts` | 94 | 7 | OK | — |
| `src/features/editor/hooks/useTableSearch.ts` | 75 | 1 | OK | — |
| `src/features/editor/initialNotebook.ts` | 62 | 4 | OK | — |
| `src/features/editor/MainTable.tsx` | 394 | 22 | INFO | any(2), as any(2) |
| `src/features/editor/modals/AnalysisModal.tsx` | 189 | 16 | INFO | any(2) |
| `src/features/editor/modals/AssignDateModal.premium.css` | 251 | 0 | INFO | !important(6) |
| `src/features/editor/modals/AssignDateModal.tsx` | 868 | 29 | ATTENTION | catch vide(2) |
| `src/features/editor/modals/ContentFields.tsx` | 161 | 15 | OK | — |
| `src/features/editor/modals/ContentModal.tsx` | 551 | 18 | INFO | any(2), as any(2) |
| `src/features/editor/modals/contextualDescriptionEditor.css` | 75 | 0 | OK | — |
| `src/features/editor/modals/ContextualDescriptionEditor.tsx` | 308 | 9 | OK | — |
| `src/features/editor/modals/DataTransferModal.tsx` | 393 | 14 | INFO | eslint-disable |
| `src/features/editor/modals/DateReviewModal.tsx` | 78 | 5 | OK | — |
| `src/features/editor/modals/ManageLessonsModal.tsx` | 395 | 14 | OK | — |
| `src/features/editor/modals/paperFormModal.css` | 113 | 0 | OK | — |
| `src/features/editor/modals/PrintModal.css` | 77 | 0 | OK | — |
| `src/features/editor/modals/PrintModal.tsx` | 428 | 12 | OK | — |
| `src/features/editor/modals/TimetableNudgeModal.tsx` | 114 | 6 | OK | — |
| `src/features/editor/NotebookEmptyState.tsx` | 83 | 6 | OK | — |
| `src/features/editor/notebookRefresh.ts` | 30 | 4 | OK | — |
| `src/features/editor/print.css` | 485 | 0 | INFO | !important(61) |
| `src/features/editor/PrintView.tsx` | 449 | 22 | OK | — |
| `src/features/editor/SelectionBar.tsx` | 238 | 6 | OK | — |
| `src/features/editor/SessionDocuments.tsx` | 21 | 3 | OK | — |
| `src/features/editor/SessionGroupRow.tsx` | 337 | 13 | INFO | any(2), as any(2) |
| `src/features/editor/TableRow.tsx` | 683 | 17 | INFO | any(1) |
| `src/features/editor/tableSortAttributes.ts` | 18 | 3 | OK | — |
| `src/features/editor/Toolbar.tsx` | 192 | 8 | OK | — |
| `src/features/editor/useEditorRowReorder.ts` | 419 | 3 | OK | — |
| `src/features/evaluations/ClassEvaluationsSheet.tsx` | 73 | 8 | OK | — |
| `src/features/evaluations/components/ActionIcon.tsx` | 21 | 1 | OK | — |
| `src/features/evaluations/components/ActivitiesEmptyState.tsx` | 36 | 4 | OK | — |
| `src/features/evaluations/components/choiceSelect.css` | 192 | 0 | OK | — |
| `src/features/evaluations/components/ChoiceSelect.tsx` | 128 | 6 | OK | — |
| `src/features/evaluations/components/contentDocument.css` | 153 | 0 | OK | — |
| `src/features/evaluations/components/ContentDocumentModal.tsx` | 297 | 19 | OK | — |
| `src/features/evaluations/components/dateCalendar.css` | 290 | 0 | INFO | !important(34) |
| `src/features/evaluations/components/DevoirsModals.tsx` | 420 | 28 | OK | — |
| `src/features/evaluations/components/EventDateModal.tsx` | 461 | 11 | OK | — |
| `src/features/evaluations/components/KindChooser.tsx` | 245 | 8 | OK | — |
| `src/features/evaluations/components/KindGroupHeader.tsx` | 56 | 2 | OK | — |
| `src/features/evaluations/components/ManualAssessmentEditor.tsx` | 205 | 12 | OK | — |
| `src/features/evaluations/components/NotebookConditionList.tsx` | 192 | 13 | OK | — |
| `src/features/evaluations/components/notebookTracking.css` | 885 | 0 | OK | — |
| `src/features/evaluations/components/oralTracking.css` | 145 | 0 | OK | — |
| `src/features/evaluations/components/PedagogicalEventsSection.tsx` | 203 | 15 | OK | — |
| `src/features/evaluations/components/SectionPanelBadge.tsx` | 116 | 1 | OK | — |
| `src/features/evaluations/components/StudentNamesEditor.tsx` | 354 | 15 | ATTENTION | minuteur |
| `src/features/evaluations/components/StudentReviewDialog.tsx` | 20 | 3 | OK | — |
| `src/features/evaluations/components/StudentSearchBar.tsx` | 66 | 5 | OK | — |
| `src/features/evaluations/DevoirsView.tsx` | 712 | 35 | OK | — |
| `src/features/evaluations/evaluationReference.css` | 908 | 1 | INFO | !important(97) |
| `src/features/evaluations/evaluationsBoard.css` | 528 | 0 | INFO | !important(35) |
| `src/features/evaluations/evaluationsResponsive.css` | 24 | 0 | OK | — |
| `src/features/evaluations/evaluationTypography.css` | 13 | 0 | OK | — |
| `src/features/evaluations/hooks/useEvaluationActions.ts` | 152 | 6 | OK | — |
| `src/features/evaluations/hooks/useEvaluationConflictGuard.tsx` | 38 | 6 | OK | — |
| `src/features/evaluations/hooks/useEvaluationModals.ts` | 49 | 3 | OK | — |
| `src/features/evaluations/hooks/useEvaluationNotebook.ts` | 71 | 10 | INFO | localStorage |
| `src/features/evaluations/kindCatalog.ts` | 146 | 3 | OK | — |
| `src/features/guide/guide.css` | 167 | 0 | INFO | !important(8) |
| `src/features/guide/GuideContent.tsx` | 129 | 9 | OK | — |
| `src/features/guide/GuideFigure.tsx` | 44 | 2 | OK | — |
| `src/features/guide/GuideModal.tsx` | 27 | 5 | OK | — |
| `src/features/guide/GuidePage.tsx` | 73 | 9 | OK | — |
| `src/features/guide/GuideText.tsx` | 34 | 0 | OK | — |
| `src/features/messages/AdminMessageModal.tsx` | 80 | 7 | OK | — |
| `src/features/messages/conversation.css` | 358 | 0 | OK | — |
| `src/features/messages/conversationCopy.ts` | 54 | 1 | OK | — |
| `src/features/messages/NotebookSupport.tsx` | 31 | 9 | OK | — |
| `src/features/messages/TeacherConversation.tsx` | 146 | 10 | OK | — |
| `src/features/messages/WhatsAppContact.tsx` | 46 | 6 | OK | — |
| `src/features/settings/components/absencesTab.css` | 13 | 0 | OK | — |
| `src/features/settings/components/AbsencesTab.tsx` | 135 | 11 | OK | — |
| `src/features/settings/components/AccountDataTab.tsx` | 51 | 7 | OK | — |
| `src/features/settings/components/AccountTab.tsx` | 117 | 11 | OK | — |
| `src/features/settings/components/AppearanceTab.tsx` | 131 | 7 | OK | — |
| `src/features/settings/components/ArchivesSection.tsx` | 130 | 10 | OK | — |
| `src/features/settings/components/DescriptionVisibilityControl.tsx` | 140 | 6 | OK | — |
| `src/features/settings/components/NotificationControls.tsx` | 87 | 5 | OK | — |
| `src/features/settings/components/NotificationsTab.tsx` | 333 | 15 | OK | — |
| `src/features/settings/components/ProfileTab.tsx` | 193 | 9 | OK | — |
| `src/features/settings/components/PushActivationCard.tsx` | 139 | 5 | OK | — |
| `src/features/settings/components/schedule.css` | 262 | 0 | OK | — |
| `src/features/settings/components/ScheduleTab.tsx` | 332 | 15 | OK | — |
| `src/features/settings/components/SettingsPrimitives.tsx` | 128 | 2 | OK | — |
| `src/features/settings/ConfigModal.tsx` | 227 | 13 | OK | — |
| `src/features/settings/ImportPlatformModal.tsx` | 177 | 11 | OK | — |
| `src/features/settings/SettingsContent.tsx` | 48 | 12 | OK | — |
| `src/features/settings/settingsModal.css` | 167 | 0 | OK | — |
| `src/features/settings/SettingsOverview.tsx` | 44 | 9 | OK | — |
| `src/features/settings/settingsPage.css` | 24 | 0 | OK | — |
| `src/features/settings/SettingsPage.tsx` | 138 | 11 | ATTENTION | minuteur |
| `src/features/settings/settingsSections.ts` | 26 | 1 | OK | — |
| `src/features/settings/useSettingsProfile.ts` | 60 | 3 | OK | — |

**hooks** (20 fichiers)

| Fichier | Lignes | Imports | Statut | Contrôles |
| --- | ---: | ---: | --- | --- |
| `src/hooks/useAdminMessages.ts` | 190 | 9 | OK | — |
| `src/hooks/useAssessments.ts` | 49 | 6 | OK | — |
| `src/hooks/useBootstrapProgress.ts` | 11 | 3 | OK | — |
| `src/hooks/useClassManager.ts` | 116 | 9 | INFO | localStorage |
| `src/hooks/useConfigManager.ts` | 268 | 12 | INFO | localStorage |
| `src/hooks/useCurriculumCatalog.ts` | 23 | 2 | OK | — |
| `src/hooks/useCurriculumProgress.ts` | 15 | 5 | OK | — |
| `src/hooks/useDebouncedCallback.ts` | 30 | 2 | INFO | any(2) |
| `src/hooks/useDeferredReady.ts` | 31 | 1 | OK | — |
| `src/hooks/useDevice.ts` | 78 | 2 | OK | — |
| `src/hooks/useHapticFeedback.ts` | 86 | 3 | OK | — |
| `src/hooks/useMediaQuery.ts` | 19 | 1 | OK | — |
| `src/hooks/useModalHaptics.ts` | 36 | 2 | OK | — |
| `src/hooks/useMoroccoToday.ts` | 45 | 4 | OK | — |
| `src/hooks/useNativeReminders.ts` | 31 | 5 | OK | — |
| `src/hooks/useOptimizedLocalStorage.ts` | 117 | 4 | INFO | localStorage |
| `src/hooks/useSessionAlerts.ts` | 134 | 15 | INFO | localStorage |
| `src/hooks/useSyncProgress.ts` | 14 | 2 | OK | — |
| `src/hooks/useTextHistory.ts` | 80 | 2 | OK | — |
| `src/hooks/useTheme.ts` | 93 | 3 | OK | — |

**i18n** (4 fichiers)

| Fichier | Lignes | Imports | Statut | Contrôles |
| --- | ---: | ---: | --- | --- |
| `src/i18n/domains/accountArchivesSchedule.ts` | 257 | 1 | OK | — |
| `src/i18n/domains/notifications.ts` | 269 | 1 | OK | — |
| `src/i18n/LocaleProvider.tsx` | 62 | 3 | OK | — |
| `src/i18n/messages.ts` | 2964 | 3 | OK | — |

**infrastructure** (32 fichiers)

| Fichier | Lignes | Imports | Statut | Contrôles |
| --- | ---: | ---: | --- | --- |
| `src/infrastructure/messages/inboxLongPoll.ts` | 58 | 1 | OK | — |
| `src/infrastructure/notifications/currentSessionNavigation.ts` | 69 | 0 | OK | — |
| `src/infrastructure/printing/documentMathLayout.ts` | 13 | 0 | OK | — |
| `src/infrastructure/printing/printLayout.ts` | 24 | 2 | OK | — |
| `src/infrastructure/printing/printMeta.ts` | 220 | 7 | INFO | any(9), as any(1), localStorage |
| `src/infrastructure/printing/printUtils.ts` | 80 | 3 | OK | — |
| `src/infrastructure/push/appBadge.ts` | 54 | 6 | INFO | localStorage |
| `src/infrastructure/push/nativePushCleanup.ts` | 33 | 0 | OK | — |
| `src/infrastructure/push/notificationDevicePreferences.ts` | 17 | 0 | OK | — |
| `src/infrastructure/push/push.ts` | 231 | 17 | INFO | localStorage |
| `src/infrastructure/push/pushResponse.ts` | 11 | 0 | OK | — |
| `src/infrastructure/storage/accountWorkspace.ts` | 154 | 1 | OK | — |
| `src/infrastructure/storage/archives.ts` | 117 | 2 | OK | — |
| `src/infrastructure/storage/backup.ts` | 234 | 7 | OK | — |
| `src/infrastructure/storage/classOpening.ts` | 5 | 0 | OK | — |
| `src/infrastructure/storage/companionActivity.ts` | 20 | 3 | OK | — |
| `src/infrastructure/storage/configStorage.ts` | 39 | 1 | OK | — |
| `src/infrastructure/storage/localClassStorage.ts` | 28 | 5 | OK | — |
| `src/infrastructure/storage/localJson.ts` | 19 | 0 | OK | — |
| `src/infrastructure/storage/notebookOrigin.ts` | 23 | 5 | OK | — |
| `src/infrastructure/storage/notebookStorage.ts` | 53 | 5 | OK | — |
| `src/infrastructure/storage/safeStorage.ts` | 109 | 0 | OK | — |
| `src/infrastructure/storage/saveNotebook.ts` | 37 | 5 | OK | — |
| `src/infrastructure/storage/storageBatch.ts` | 26 | 0 | OK | — |
| `src/infrastructure/sync/bootstrapStore.ts` | 29 | 2 | OK | — |
| `src/infrastructure/sync/localSnapshot.ts` | 20 | 4 | OK | — |
| `src/infrastructure/sync/pullHelpers.ts` | 274 | 10 | INFO | localStorage |
| `src/infrastructure/sync/settingsPush.ts` | 30 | 0 | OK | — |
| `src/infrastructure/sync/syncBus.ts` | 286 | 3 | INFO | localStorage |
| `src/infrastructure/sync/syncProtocol.ts` | 15 | 0 | OK | — |
| `src/infrastructure/sync/syncSettings.ts` | 234 | 4 | INFO | any(2), as any(1) |
| `src/infrastructure/sync/syncTransport.ts` | 140 | 3 | OK | — |

**lib** (14 fichiers)

| Fichier | Lignes | Imports | Statut | Contrôles |
| --- | ---: | ---: | --- | --- |
| `src/lib/formatters.ts` | 45 | 1 | OK | — |
| `src/lib/logger.ts` | 33 | 0 | INFO | any(4), console(4) |
| `src/lib/memoize.ts` | 2 | 1 | OK | — |
| `src/lib/motion-physics.ts` | 181 | 0 | OK | — |
| `src/lib/sound-engine.ts` | 288 | 1 | OK | — |
| `src/lib/text/directionProse.ts` | 17 | 1 | OK | — |
| `src/lib/text/handLists.ts` | 173 | 1 | OK | — |
| `src/lib/text/highlightMarkers.ts` | 119 | 0 | OK | — |
| `src/lib/text/htmlTags.ts` | 74 | 0 | OK | — |
| `src/lib/text/math.ts` | 78 | 1 | OK | — |
| `src/lib/text/textDirection.ts` | 79 | 1 | OK | — |
| `src/lib/text/textHistory.ts` | 116 | 0 | OK | — |
| `src/lib/text/textValue.ts` | 18 | 0 | OK | — |
| `src/lib/utils.ts` | 7 | 2 | OK | — |

**platform** (27 fichiers)

| Fichier | Lignes | Imports | Statut | Contrôles |
| --- | ---: | ---: | --- | --- |
| `src/platform/appUpdates.ts` | 133 | 3 | OK | — |
| `src/platform/appVersion.ts` | 6 | 1 | OK | — |
| `src/platform/appViewport.ts` | 75 | 1 | OK | — |
| `src/platform/errorReporting.ts` | 76 | 0 | INFO | console(1) |
| `src/platform/googleAuth.ts` | 49 | 5 | OK | — |
| `src/platform/keepTheme.ts` | 21 | 0 | OK | — |
| `src/platform/longPress.ts` | 85 | 0 | OK | — |
| `src/platform/mobileScheduling.ts` | 102 | 2 | OK | — |
| `src/platform/modalStack.ts` | 9 | 0 | OK | — |
| `src/platform/nativeBack.ts` | 21 | 0 | OK | — |
| `src/platform/nativeHttp.ts` | 47 | 1 | OK | — |
| `src/platform/nativeNotifications.ts` | 130 | 8 | INFO | localStorage |
| `src/platform/nativePush.ts` | 100 | 6 | INFO | localStorage |
| `src/platform/nativeRelease.ts` | 31 | 1 | OK | — |
| `src/platform/nativeRuntime.ts` | 97 | 13 | OK | — |
| `src/platform/nativeUpdates.ts` | 19 | 0 | OK | — |
| `src/platform/networkStatus.ts` | 60 | 0 | OK | — |
| `src/platform/notificationActivation.ts` | 216 | 6 | ATTENTION | écouteur |
| `src/platform/notificationNavigation.ts` | 37 | 1 | OK | — |
| `src/platform/performanceMarks.ts` | 64 | 0 | INFO | console(1) |
| `src/platform/pwaInstall.ts` | 303 | 5 | ATTENTION | écouteur, localStorage |
| `src/platform/safeUpdate.ts` | 89 | 0 | OK | — |
| `src/platform/scrollActivity.ts` | 14 | 0 | OK | — |
| `src/platform/stableFetch.ts` | 58 | 0 | OK | — |
| `src/platform/themeColor.ts` | 14 | 0 | OK | — |
| `src/platform/virtualGeometry.ts` | 27 | 0 | OK | — |
| `src/platform/webVitals.ts` | 196 | 0 | INFO | console(1) |

**stores** (1 fichiers)

| Fichier | Lignes | Imports | Statut | Contrôles |
| --- | ---: | ---: | --- | --- |
| `src/stores/useCommandPaletteStore.ts` | 16 | 1 | OK | — |

**styles** (17 fichiers)

| Fichier | Lignes | Imports | Statut | Contrôles |
| --- | ---: | ---: | --- | --- |
| `src/styles/admin-workspace.css` | 246 | 0 | INFO | !important(9) |
| `src/styles/class-tones.css` | 420 | 0 | OK | — |
| `src/styles/claude-sheet.css` | 782 | 0 | INFO | !important(9) |
| `src/styles/codex-modal.css` | 36 | 0 | OK | — |
| `src/styles/document-sheet.css` | 375 | 0 | OK | — |
| `src/styles/editor-surface.css` | 741 | 0 | INFO | !important(21) |
| `src/styles/elastic-morph.css` | 112 | 0 | OK | — |
| `src/styles/fonts.css` | 321 | 0 | OK | — |
| `src/styles/index.css` | 36 | 27 | OK | — |
| `src/styles/mobile-performance.css` | 84 | 0 | OK | — |
| `src/styles/modal-premium-tokens.css` | 86 | 0 | OK | — |
| `src/styles/onboarding.css` | 155 | 0 | OK | — |
| `src/styles/reset.css` | 48 | 0 | OK | — |
| `src/styles/settings-hub.css` | 412 | 0 | INFO | !important(11) |
| `src/styles/theme-tokens.css` | 734 | 0 | OK | — |
| `src/styles/typography.css` | 102 | 0 | OK | — |
| `src/styles/workspace-shell.css` | 189 | 0 | INFO | !important(7) |


## 6. Limites

- L’audit est statique : il vérifie la structure, les imports, les motifs et
  les types, pas le comportement runtime de chaque écran.
- Les 490 fichiers **OK** n’ont pas été relus ligne par ligne : ils ont passé
  le parse AST, la résolution d’imports, `tsc`, `knip` et l’absence de motif
  sensible. Les 69 fichiers **INFO/REVUE/ATTENTION** ont été relus sur leurs
  zones à risque.
- Les benchmarks et tests de la session précédente restent la référence pour
  les performances ; ce document vérifie la correction structurelle.
- Les deux échecs `npm test` relèvent de la refonte Paramètres/Emploi du temps
  en cours, pas des fichiers corrigés ici.
- Le dossier a été modifié par un autre processus pendant l’audit. L’empreinte
  SHA-256 et la date de l’instantané permettent de savoir si le tableau
  correspond encore à l’arbre courant.

## 7. Conclusion

Aucun fichier de `src/` n’est orphelin, aucun import n’est cassé, aucune
feuille CSS n’est non référencée et aucun `TODO`/`@ts-ignore` ne subsiste.
Les deux corrections P1 (déconnexion robuste, import inutilisé) sont appliquées
et vérifiées. Les points P2 restants sont des dettes ciblées, pas des pannes :
la plus sérieuse est la persistance de la file de synchronisation sur quota
(V-04), suivie de l’effet de bord `useState` de `SettingsOverview` (V-03) et de
la duplication CSS d’inscription (V-05).
