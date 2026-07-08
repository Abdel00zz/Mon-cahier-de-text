# Cahier des charges — Améliorations Éditeur & Emploi du temps
### Projet : *Cahier de Textes Interactif*

> Version 3 — corrigée et alignée sur l'architecture réelle du projet (`V1.md` + `README.md` + analyse détaillée des moteurs/circuits de données).
> Corrections clés cumulées : (1) la fusion des créneaux concerne `ScheduleTab`, pas `MainTable` ; (2) l'import dans une classe existante déclenche déjà la synchro (Circuit 5) ; (3) la reconnexion réseau est déjà gérée (Circuit 3) ; (4) le vrai risque non traité est l'absence de merge LWW entre appareils (section N).

---

## A. Hiérarchie éditoriale — `TopLevelItem → Section → subsections/items`

Le mécanisme `+` existant s'appuie sur le modèle réel :

```
TopLevelItem (chapter | devoir_maison | controle_continu | ...) → sections[]
Section → subsections[] | items[]        ← arbre à 4 niveaux max
```

- Insertion via `EditItemModal` (« Ajouter ») → `addTopLevelItem` / `addSection` / `addItem`, **ancrée sur la sélection courante**, avec héritage du type du voisin (et de la date du séparateur, s'il y en a un).
- **Règle de dépendance à vérifier** : un `item`/`subsection` ne doit jamais pouvoir être créé sans `TopLevelItem` parent existant (garde déjà présente dans `dataUtils.findItem` ? à confirmer).
- **Réordonnancement** : `moveWithinParent` (frères uniquement) — bouton Monter/Descendre, sélection préservée. Vérifier que le déplacement respecte bien les 4 niveaux max et ne casse pas les `Indices`.
- **Numérotation** : `LessonItem.number` doit rester cohérent après réordonnancement/suppression (renumérotation automatique).

---

## B. Couleurs — `TOP_LEVEL_TYPE_CONFIG` ↔ fond de ligne (`MainTable`/`TableRow`)

- Chaque **type** de bloc (`chapter`, `devoir_maison`, `controle_continu`, …) possède déjà une icône **composant** (pas une chaîne de classe, cf. règle d'or n°9) dans `TOP_LEVEL_TYPE_CONFIG`. On y ajoute/utilise une **couleur associée**.
- Cette couleur doit se **répercuter sur le fond de la ligne** (`TableRow`) correspondant à ce `TopLevelItem` dans `MainTable` — synchronisation directe depuis la config du type, pas de champ couleur dupliqué à saisir manuellement.
- **Cartes statiques** (sélecteur de type dans `EditItemModal`) : les rendre plus **compactes** et **organisées**, cohérentes visuellement avec la couleur qu'elles injecteront dans le tableau.

> ⚠️ Tailwind v4 : ces couleurs doivent être des **chaînes de classes complètes** dans une map (`bg-emerald-100` etc.), jamais construites par interpolation (`bg-${color}` interdit — règle d'or n°8 déjà actée dans le projet).

---

## C. En-tête fusionné — `journal.ts` ↔ header de `MainTable`

- `utils/journal.ts` produit déjà la ligne **« Dernière modification »** (via `editJournal_v1_{classId}`, plafonné à 60 entrées, alimente aussi `HistoryModal`).
- Objectif : cette ligne (ex. *« Dernière modification : Affectation de date(s) · il y a 1 min »*) doit être **fusionnée visuellement** dans le **header de `MainTable`** — un seul bloc cohérent, pas deux zones superposées ou disjointes.
- **Cohérence des colonnes sur les lignes de titre** : les lignes de titre de `TopLevelItem` (chapitre, devoir maison…) doivent conserver une **cellule date** (même vide) pour ne jamais rompre visuellement la grille à 3 colonnes Date | Contenu | Remarque — cohérent avec le principe déjà en place des « séparations verticales Date|Contenu|Remarque visibles » (README, itération précédente).

---

## D. Fusion intelligente des créneaux — Onglet **Emploi du temps** (ScheduleTab / Paramètres)

**Correction importante :** cette règle ne concerne **pas** le tableau de l'Éditeur (`MainTable`/`TableRow`), qui a déjà son propre mécanisme de fusion visuelle de dates consécutives identiques (`applyDateMerges` : méta `isStart/isEnd/count`, cf. V1.md Phase 1). **Ne pas confondre les deux mécanismes.**

Le point concerne la **saisie de la grille jours × créneaux** dans `ScheduleTab` (`ConfigModal ▸ Emploi du temps`), qui alimente `config.timetable` (`TimetableEntry{day, slot, classId}`), lui-même dérivé en `schedules` par `utils/timetable.ts → deriveSchedules()`.

**Règle métier :**
- Si, pour un même **jour**, deux **créneaux consécutifs** (ex. 1ʳᵉ et 2ᵉ heure d'une matinée) sont assignés au **même `classId`**,
- → le système doit **détecter ce motif** et traiter ce bloc comme **une seule séance de 2h**, et non comme deux séances distinctes d'1h.

**Impacts à répercuter :**
1. **Visuel dans `ScheduleTab`** : les deux cases doivent apparaître **visuellement regroupées** (bordure commune / libellé « 2h ») pour que le prof comprenne que la saisie a été interprétée comme une séance continue.
2. **Calcul (`deriveSchedules()` → `countExpectedSessions` dans `utils/calendar.ts` → `utils/lateness.ts`)** : le nombre de **séances attendues** doit compter **1** pour ce bloc fusionné, pas 2. Sinon le moteur de retard réclamera 2 dates saisies dans l'Éditeur alors que le prof n'en saisit logiquement qu'**une seule** (une séance de 2h = une ligne datée dans le cahier) → fausses alertes de retard.
3. **Critère de détection** : `slot` n et n+1 consécutifs (sans creux dans la grille horaire définie), même `day`, même `classId`.
4. **Aucun impact sur `MainTable`** : ce mécanisme est purement côté configuration/calcul de retard, indépendant de l'affichage des lignes du cahier de textes.
5. **Précision issue de l'analyse infrastructure** : `classes:{phone}` (Redis) regroupe `classes + schedules + timetable + settings + classMeta` **dans le même blob**. Une modification dans `ScheduleTab` doit donc déclencher `markClassesListDirty()` (le marqueur du blob « classes »), **pas** `markClassDirty(classId)` (qui vise le blob `lessons:{phone}:{classId}`, un contenu différent). À corriger si le code actuel confond les deux.

---

## E. Auto-suggestion intelligente — types `devoir_maison` / `controle_continu`

`LessonItem{type, number, title, ...}` porte déjà un champ `number`. Mécanisme à ajouter :

| Saisie détectée dans `EditItemModal` | Comportement attendu |
|---|---|
| Type `controle_continu`, 1ʳᵉ occurrence dans la classe | Titre auto-suggéré : « Contrôle continu **1** » |
| Type `controle_continu`, occurrence suivante | Titre auto-suggéré avec `number` incrémenté |
| Type `devoir_maison` | Même logique |

- S'appuyer sur `findItem`/parcours de l'arbre pour compter les occurrences existantes du type dans la classe, plutôt qu'un compteur séparé à synchroniser.
- Rendre le mécanisme **générique** (basé sur `TOP_LEVEL_TYPE_CONFIG`), extensible à d'éventuels futurs types récurrents.
- **À vérifier avant d'écrire du nouveau code** : `utils/assessments.ts` (Moteur d'Évaluations) calcule déjà les dates de `devoir_maison`/`controle_continu` par semestre (`debutSemestre + (semaine-1)*7j`, avec `applyOverrides()` pour les dates manuelles). L'auto-numérotation devrait s'appuyer sur ce même moteur plutôt que sur un comptage isolé dans `EditItemModal`, pour rester cohérente avec le planning déjà calculé (éviter que le titre auto-suggéré « Devoir maison 2 » ne corresponde pas à la 2ᵉ date calculée par `assessments.ts`).

---

## F. Notifications & vibration locale (PWA) — distinct du cron `api/notify.ts`

⚠️ À bien distinguer de l'existant : `api/notify.ts` gère un **push serveur quotidien** (cron 18h Casablanca, retard). Le mécanisme demandé ici est **local, client-side, temps réel**, basé sur `navigator.vibrate()` — pas de round-trip serveur.

**Données réutilisées** : `config.timetable` / `schedules` déjà saisis (aucune nouvelle saisie requise) donnent, par classe, les horaires réels de créneaux.

**Deux déclencheurs distincts :**
1. **Rappel de fin de séance (par séance, pas une heure globale)** : à **1 minute avant l'heure de fin réelle de chaque séance** (calculée depuis le créneau du jour), vibration de rappel — propre à chaque séance du jour, pas un rappel unique à heure fixe.
2. **Alerte date non affectée** : si, à la fin d'une séance, aucune date n'a encore été affectée dans l'Éditeur pour le contenu correspondant → vibration d'alerte.

**Contraintes :**
- Mécanisme **léger** (« light »), non intrusif, **désactivable** via un toggle dans `NotificationsTab` (séparé du toggle push existant — cohérent avec le fait que `pushEnabled` est déjà traité comme spécifique à l'appareil, cf. règle anti-conflit n°4 du README/V1).
- **Pas de nouveau hook nécessaire a priori** : un simple scheduler côté client (`setTimeout`/`useEffect`) basé sur les horaires dérivés de `schedules` devrait suffire — à confirmer en implémentation.
- Fonctionne uniquement en contexte mobile/tablette PWA (API `vibrate` indisponible sur desktop / hors PWA installée — cf. remarque iOS déjà documentée pour le push).

⚠️ **Correction suite à l'analyse architecturale approfondie** : un hook **`useSessionTimer`** existe **déjà** dans `Editor` (visible dans le diagramme d'architecture, aux côtés de `useHistoryState`/`useSelectionData`/`useLessonSearch`). Avant d'écrire un nouveau scheduler, **auditer ce hook en premier** — il gère probablement déjà tout ou partie du minutage de séance, et le « nouveau hook » évoqué plus haut pourrait en réalité être une **extension** de `useSessionTimer` (ajout du déclenchement `navigator.vibrate()`) plutôt qu'une création ex nihilo. Ceci confirme la remarque initiale du prof (« je ne crois pas qu'il soit nécessaire de créer un nouveau hook »).

---

## G. UX / Style visuel (tablerow + icônes)

⚠️ **Toujours en attente** : le CSS de référence mentionné n'a pas encore été fourni. Merci de le coller pour que les styles de `TableRow` et des icônes (`components/ui/icons.ts`, lucide-react) puissent être proposés en cohérence avec l'existant (esprit IBM Carbon / claude.ai déjà en place selon le journal des évolutions).

**Nouvelle exigence — tableau « serré » (edge-to-edge)** :
- `MainTable` doit occuper **toute la largeur disponible**, sans marge ni padding gauche/droite (`px-0` sur le conteneur direct du tableau, pas de `container mx-auto max-w-*` autour de lui) — un tableau dense, aligné jusqu'aux bords de l'écran/de la carte parente.
- Attention à ne pas casser le tracé des séparateurs verticaux Date | Contenu | Remarque (section D historique) en retirant ce padding — vérifier que les bordures de colonnes touchent bien les bords gauche/droite une fois le padding supprimé.
- Le padding **interne** des cellules (`TableRow`) peut rester pour la lisibilité du texte ; c'est le padding **externe** du conteneur du tableau qui doit disparaître.
- À vérifier sur les 6 surfaces (section K) : le retrait du padding ne doit pas casser l'alignement avec le header fusionné (section C) ou les FAB/bottom-sheets mobiles.

---

## H. Vue d'ensemble Input / Output (mise à jour)

| Élément | Input (saisie prof) | Output (comportement système) | Fichier(s) concerné(s) |
|---|---|---|---|
| `+` hiérarchie A/1 | Clic dans `EditItemModal` | `addTopLevelItem`/`addSection`/`addItem`, ancré + hérité | `dataUtils.ts` |
| Couleur de type de bloc | Config `TOP_LEVEL_TYPE_CONFIG` | Fond de ligne `TableRow` correspondant | `MainTable`, `TableRow` |
| Ligne « Dernière modification » | Toute opération journalisée | Fusion dans le header de `MainTable` | `journal.ts` |
| 2 créneaux consécutifs, même classe | Saisie dans `ScheduleTab` | Fusion en 1 séance (visuel + calcul retard) | `ScheduleTab`, `utils/timetable.ts`, `utils/calendar.ts`, `utils/lateness.ts` |
| Type `controle_continu`/`devoir_maison` | Saisie du type dans `EditItemModal` | Titre auto-suggéré avec numéro incrémenté | `EditItemModal`, `dataUtils.ts` |
| Fin de séance − 1 min | (déclenchement auto, basé sur `schedules`) | Vibration locale (par séance) | nouveau : client-side scheduler |
| Fin de séance, date non affectée | (absence d'action du prof) | Vibration d'alerte | idem |
| Toggle vibration | `NotificationsTab` | Active/désactive le mécanisme local | `NotificationsTab` |

---

## J. Synchronisation cloud intelligente — toute écriture (édition, import, injection, restauration)

**Mise à jour suite à l'analyse des circuits de données détaillés (Circuits 1, 3 et 5)** — plusieurs points de vigilance ci-dessous sont en fait **déjà résolus** dans le code ; le document est corrigé en conséquence pour ne pas faire refaire un travail existant.

| Source d'écriture | Chemin actuel | Statut réel |
|---|---|---|
| Édition manuelle (Éditeur) | `Editor.setState → useHistoryState → localStorage → markClassDirty → schedulePush` | ✅ confirmé (Circuit 1) |
| **Import manuel d'une classe** (JSON, dans une classe déjà ouverte) | `ImportModal → Worker(parseAndNormalize) → Editor.setState('import') → localStorage + markClassDirty()` | ✅ **confirmé** (Circuit 5) — le doute soulevé précédemment est levé, l'import déclenche déjà la synchro. |
| **Contenus prédéfinis** | même pipeline que l'import | probable ✅ (même circuit), non détaillé séparément — à confirmer en test uniquement |
| **Restauration totale / nouvelle classe créée par import** (`ImportPlatformModal`, `utils/backup.ts`) | non couvert par les 6 circuits documentés | ⚠️ **toujours ouvert** — le Circuit 5 documente l'import *dans une classe existante déjà ouverte dans l'Éditeur*, pas la création d'une classe entièrement nouvelle. Il faut vérifier que ce cas appelle bien `markClassesListDirty()` en plus de `markClassDirty()`, sans quoi une classe importée à froid (jamais ouverte) pourrait ne jamais apparaître dans `classes:{phone}` côté cloud. |
| **Emploi du temps** (`ScheduleTab`) | fait partie du blob `classes:{phone}` | doit appeler `markClassesListDirty()`, pas `markClassDirty()` — cf. section D point 5 |

**Incohérence à trancher** : `README.md`/`V1.md` mentionnent un push débouncé à **20 s**, alors que le document des circuits de données précise **`schedulePush(3000ms)`** en usage normal (Circuit 1) et **`schedulePush(1000ms)`** à la reconnexion (Circuit 3). Ces trois chiffres ne peuvent pas être simultanément exacts — à vérifier directement dans `SyncContext.tsx` pour savoir laquelle des documentations est à jour, car cette valeur détermine la fenêtre réelle de perte de données en cas de fermeture brutale.

**Reconnexion — correction** : le mécanisme que je recommandais d'ajouter (`window.addEventListener('online')` + push immédiat) **existe déjà** (Circuit 3), tout comme le flush combiné `visibilitychange` + `pagehide` avec `navigator.sendBeacon`. Ma proposition précédente est donc retirée — ce n'est pas un manque.

**Le vrai point faible confirmé — absence de merge (LWW pur)** : le document le confirme noir sur blanc — *« Pas de merge OT (Operational Transform) — last-write-wins par updatedAt »*. Ceci valide mon inquiétude initiale : si deux appareils modifient la **même classe** hors-ligne avant resynchronisation, l'appareil qui pousse en second **écrase entièrement** les modifications de l'autre, sans fusion ni avertissement. Recommandation maintenue et renforcée :
1. Avant qu'un `pull` applique un `classMeta[classId].updatedAt` cloud plus récent que `syncMeta_v1[classId].localUpdatedAt` **alors que la classe locale a elle-même des changements non poussés**, afficher un avertissement bloquant plutôt qu'un remplacement silencieux (`pull-applied` ne doit pas s'exécuter sans confirmation dans ce cas précis).
2. Cohérence classe/leçons pour toute classe nouvellement créée : `classes:{phone}` et `lessons:{phone}:{id}` doivent partir **ensemble** — jamais un blob de leçons orphelin.
3. Retour visuel : le badge de statut de synchro doit refléter *en attente → synchronisé* pour **chaque** source d'écriture du tableau ci-dessus.
4. Aucune régression sur l'offline-first : toute nouvelle fonctionnalité de ce document doit continuer à fonctionner à 100 % hors-ligne — la synchro reste une **conséquence**, jamais une **condition**.

---

## K. Vue transversale — les 6 surfaces de l'application

Avant toute amélioration visuelle ou fonctionnelle, la considérer sur **l'ensemble** des surfaces réelles du projet, pas seulement l'Éditeur :

| # | Surface | Éléments clés |
|---|---|---|
| 1 | **Dashboard** (`#/`) | Cartes de classes par cycle, `LatenessBanner`, chip « Prochaine séance » |
| 2 | **Editor** (`#/classe/{id}`) | `MainTable`, `EditItemModal`, `AssignDateModal`, `InlineEditRow`, `DescriptionModal`, `ManageLessonsModal`, `PrintModal`, `HistoryModal`, `AnalysisModal` |
| 3 | **ConfigModal** (onglets) | Affichage, **Emploi du temps** (`ScheduleTab`), **Notifications** (`NotificationsTab`), Données, **Compte** (`AccountTab`) |
| 4 | **AuthPage** | Inscription/connexion — actif uniquement en production (`AUTH_REQUIRED`) |
| 5 | **admin.html** | `AdminLogin`, `TeacherList`, `TeacherDetail` — 2ᵉ entrée Vite, build séparé |
| 6 | **PWA / mobile** | FAB `+`, bottom-sheets, remarque mobile, notifications push |

→ Toute évolution de style ou de comportement (sections B, C, F, L) doit être vérifiée sur ces 6 surfaces, avec une vigilance particulière sur `admin.html`, qui est un point d'entrée Vite **séparé** et peut facilement dériver visuellement du reste si on ne pense qu'à l'Éditeur.

---

## L. Refonte visuelle moderne « style iOS » — sur tous les axes

L'identité de marque existante (primaire `#C96442` terracotta, accent `#B8935A` or, fonds sable — choix déjà actés en Phase 0) est **conservée** ; l'objectif est d'y superposer un langage d'interaction proche d'iOS, pas de repartir de zéro.

- **Typographie** : échelle de tailles cohérente et resserrée (esprit Human Interface Guidelines : ex. 11/13/15/17/22/28 px), hiérarchie nette entre titres, contenu et métadonnées (dates, remarques).
- **Cartes & surfaces** : rayons d'arrondi harmonisés sur une échelle unique (ex. 12/16/20 px), ombres douces plutôt que bordures dures, effet de flou (`backdrop-blur`) pour les bottom-sheets et modales déjà en place.
- **Mouvement** : `framer-motion` est déjà dans le stack — l'utiliser pour des transitions à ressort (spring), notamment ouverture des bottom-sheets, FAB, changement d'onglet dans `ConfigModal` ; éviter l'animation décorative superflue.
- **Effet d'apparition des modales (précisé)** : toutes les modales (`EditItemModal`, `AssignDateModal`, `DescriptionModal`, `ManageLessonsModal`, `PrintModal`, `HistoryModal`, `AnalysisModal`, `ConfigModal`) doivent partager **un seul effet d'entrée cohérent**, pas un effet par modale :
  - Échelle + fondu (`scale: 0.95 → 1`, `opacity: 0 → 1`) avec physique à ressort (`framer-motion` spring, pas d'easing linéaire) — esprit iOS plutôt qu'un simple fade.
  - Fond (`backdrop`) en flou progressif (`backdrop-blur`) synchronisé avec l'apparition, pas un flou instantané.
  - **Performance** : n'animer que `transform` et `opacity` (accélération GPU), jamais `width`/`height`/`top`/`left` qui déclenchent un reflow — critique sur les appareils bas de gamme des profs en PWA mobile.
  - Respecter `prefers-reduced-motion` : effet réduit à un simple fondu si l'utilisateur l'a activé au niveau système.
  - Fermeture symétrique (même durée/courbe en sortie qu'en entrée, pas juste un `display:none` brutal).
- **Retour haptique** : cohérent avec la vibration déjà demandée (section F) — étendre `navigator.vibrate()` à de petits retours sur actions clés (validation, suppression), comme le Taptic Engine iOS.
- **Mode sombre** : déjà identifié comme piste d'amélioration (README §8, variables CSS existantes) — à intégrer **dans** cette refonte dès la conception plutôt qu'en aparté, clair et sombre pensés ensemble.
- **Cohérence transversale** : appliquer cette direction sur les 6 surfaces de la section K, `admin.html` inclus.
- **Discipline** : concentrer l'audace visuelle sur **un seul élément signature** (ex. la représentation des séances fusionnées de 2h, ou le badge de statut de synchro) plutôt que de tout réinventer d'un coup — cohérent avec le principe de livraison phase par phase déjà en place dans le projet.

---

## N. Audit croisé — ce que l'analyse architecturale détaillée change

Document de référence : analyse des 6 moteurs métier + circuits de données complets. Trois catégories de constats :

**✅ Confirmé / déjà résolu (ne pas re-développer)**
- Import dans une classe existante → `markClassDirty()` déjà appelé (Circuit 5).
- Reconnexion réseau → `online` listener + push déjà en place (Circuit 3), tout comme le flush `visibilitychange`/`pagehide` + `sendBeacon`.
- `useSessionTimer`, `useLessonSearch`, `useAssessments`, `useSelectionData` existent déjà comme hooks dédiés dans l'Éditeur — **auditer avant de créer quoi que ce soit de nouveau** pour les sections E et F.

**⚠️ Corrigé / précisé**
- Section D (fusion créneaux) : le déclencheur de synchro correct est `markClassesListDirty()` (blob `classes:{phone}`), pas `markClassDirty()`.
- Section E (auto-numérotation) : doit s'appuyer sur `utils/assessments.ts`, pas sur un comptage isolé.
- Incohérence de debounce (20 s vs 3 s vs 1 s) à trancher directement dans le code — impacte la fenêtre réelle de risque de perte de données.

**🆕 Nouveau risque confirmé, pas encore traité dans ce document**
- Absence de merge (LWW pur, confirmé explicitement) → écrasement silencieux possible entre deux appareils modifiant la même classe hors-ligne. C'est, à mon avis, le point de fiabilité le plus important du document à ce stade — plus important que les sections purement fonctionnelles (D, E) ou visuelles (L).

---

## P. Enrichissement du panneau Admin (`admin.html`)

L'infrastructure existe déjà (`computeClassSnapshot` → `computeTeacherSnapshot` → `admin:snapshots`), mais une partie des données calculées côté moteur ne semble pas encore **affichée** côté `TeacherList`/`TeacherDetail`. À brancher :

1. **Vue d'ensemble agrégée sur `TeacherList`** (aujourd'hui probablement une simple liste) : distribution globale des sévérités (`ok`/`notice`/`warning`/`critical`) sur l'ensemble des profs — un coup d'œil pour l'administrateur, pas seulement une liste à parcourir une par une.
2. **Santé de la notification push** (donnée déjà en Redis via `push:subs`, non confirmée affichée) : nombre d'appareils actifs par prof, dernière notification envoyée (`lastNotifiedAt`), dernière sévérité notifiée (`lastSeverity`), abonnements morts nettoyés (410 Gone) — utile pour diagnostiquer « le prof dit ne rien recevoir ».
3. **Fraîcheur des données par prof** : dernière activité (le plus récent `classMeta[*].updatedAt` toutes classes confondues) pour repérer un compte inactif depuis longtemps — distinct de la sévérité de retard, car un prof peut être « ok » simplement parce qu'il n'a rien saisi du tout.
4. **Recherche / filtre / tri** dans `TeacherList` : par sévérité, par cycle, par dernière activité — actuellement non confirmé dans le pipeline `HGETALL admin:snapshots` (qui retourne tout en vrac).
5. **Cohérence visuelle** : `admin.html` est un point d'entrée Vite séparé (section K) — s'assurer que la refonte iOS (section L) et le tableau serré (section G) s'y appliquent aussi, pas seulement côté Éditeur.

---

## Q. Gestion des notifications multiples — placement & empilement

Plusieurs sources de notification coexistent déjà ou sont en cours d'ajout : toasts `sonner` (UI), Web Push (OS, cron 18h), `LatenessBanner` (bandeau persistant), et la nouvelle vibration locale (section F). Sans règle d'empilement, deux alertes simultanées peuvent se chevaucher ou se masquer.

**Règles à définir :**
1. **Position unique et cohérente** pour les toasts `sonner` sur les 6 surfaces (section K) — pas une position sur Dashboard et une autre dans l'Éditeur.
2. **Limite d'empilement** : un nombre maximum de toasts visibles simultanément (ex. 3), les suivants mis en file et affichés après disparition des premiers plutôt que superposés.
3. **Regroupement intelligent** : si plusieurs alertes de même nature se déclenchent en même temps (ex. 3 classes en « date non affectée » à la fin de créneaux consécutifs), les fusionner en **un seul toast groupé** (« 3 séances sans date affectée ») plutôt que d'en empiler trois identiques.
4. **Priorité par sévérité** : en cas de conflit temporel entre une alerte `critical` et une simple `notice`, la plus sévère s'affiche en premier / reste visible plus longtemps.
5. **Zones protégées (mobile)** : les toasts ne doivent jamais recouvrir le FAB `+`, ni apparaître sous une bottom-sheet ouverte — respecter les zones de sécurité iOS (`safe-area-inset`).
6. **Déduplication vibration/toast** : si la vibration (section F) et un toast couvrent le même événement (ex. fin de séance), éviter le double signal redondant — un seul déclenchement synchronisé plutôt que deux mécanismes indépendants qui se chevauchent dans le temps.

---

## R. Points à clarifier avant développement

1. **CSS de référence** (section G) — toujours à fournir.
2. Le calcul « 1 séance de 2h » (section D) doit-il aussi ajuster l'affichage du **nombre de séances/semaine** visible ailleurs dans l'UI (Dashboard, `LatenessBanner`), ou seulement le calcul interne de `countExpectedSessions` ?
3. Pour l'auto-numérotation (section E), le compteur doit-il être **par classe** uniquement, ou global au prof (toutes classes confondues), et doit-il rester cohérent avec `utils/assessments.ts` ?
4. Pour la vibration (section F), faut-il aussi une **notification visuelle** (toast `sonner`) en complément, pour les cas où le téléphone est en mode silencieux ?
5. Quelle est la **valeur réelle** du debounce de synchro dans `SyncContext.tsx` (20 s, 3 s, ou 1 s selon le contexte) ?
6. Pour le conflit LWW (section N), un avertissement bloquant est-il acceptable UX, ou faut-il envisager un merge partiel (ex. par `TopLevelItem` plutôt que par classe entière) ?
7. Pour la refonte iOS (section L), quel **élément signature** prioriser en premier ?
8. Pour l'admin (section P), qui a accès à ces nouvelles données enrichies — uniquement l'administrateur système, ou aussi un rôle intermédiaire (ex. directeur d'établissement) ?
9. Pour les notifications multiples (section Q), la limite d'empilement (« 3 toasts max ») est-elle la bonne valeur, ou faut-il l'ajuster selon desktop/mobile ?
