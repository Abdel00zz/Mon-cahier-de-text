<div align="center">
  <h1>🗄️ data_base.md — Référentiel des données de base</h1>
  <p>Toutes les listes, nomenclatures et structures de données de l'application, en un seul endroit.</p>
</div>

> **But de ce fichier.** Servir de source unique de vérité *documentaire* pour les données de référence : niveaux de classes, matières, types de contenus, jours fériés, vacances, planning des devoirs, clés de stockage et modèles de données. Les fichiers réels sont cités entre parenthèses — ce document les décrit, il ne les remplace pas.

---

## 1. Cycles & niveaux de classes

Source : [`constants.ts → CLASS_LEVELS_BY_CYCLE`](constants.ts). Le professeur choisit un niveau dans la liste, puis ajoute éventuellement un numéro de groupe (ex. « 1BAC SM **A** »).

| Cycle | Niveaux officiels (Maroc) |
|---|---|
| **Collège** (`college`) | 1AC · 2AC · 3AC |
| **Lycée** (`lycee`) | Tronc commun scientifique · Tronc commun lettres · Tronc commun technologique · 1BAC Sc. Expérimentales · 1BAC Sc. Mathématiques · 1BAC Lettres · 1BAC Sc. Économiques · 2BAC PC · 2BAC SVT · 2BAC Sc. Maths A · 2BAC Sc. Maths B · 2BAC Sc. Économiques · 2BAC Sc. Gestion Comptable · 2BAC Lettres · 2BAC Sc. Humaines |
| **Prépa** (`prepa`) | MPSI · PCSI · MP · PSI · TSI · ECS · ECT |

> Normalisation : `normalizeOfficialClassName()` réécrit les variantes (« TC sciences », « trc »…) vers le libellé canonique.

---

## 2. Matières enseignées

Source : [`constants.ts → SUBJECTS`](constants.ts). Proposées à l'inscription et à la création de classe.

`Mathématiques` · `Physique-Chimie` · `Sciences de la Vie et de la Terre` · `Sciences Économiques` · `Français` · `Arabe` · `Anglais` · `Philosophie` · `Histoire-Géographie` · `Éducation Islamique` · `Informatique` · `EPS`

**Couleur d'accent par matière** (`SUBJECT_BAND_CLASS_MAP`) : Maths → teal · Physique → indigo · Physique-Chimie → bleu · Français → rose · Économie → ambre · SVT → émeraude · Informatique → cyan · Lettres → fuchsia (+ équivalents arabes الرياضيات / علوم فيزيائية / اللغة العربية / علوم الحياة والأرض).

---

## 3. Types de contenus

### 3.1 Blocs de premier niveau

Source : [`constants.ts → TOP_LEVEL_TYPE_CONFIG`](constants.ts). Un cahier est un arbre de ces blocs → sections → contenus.

| Clé | Nom affiché | Auto-numéroté |
|---|---|---|
| `chapter` | Chapitre | — |
| `evaluation_diagnostic` | Évaluation diagnostique | — |
| `devoir_maison` | Devoir maison | ✅ |
| `controle_continu` | Contrôle continu | ✅ |
| `correction_devoir_maison` | Correction Devoir maison | ✅ |
| `correction_controle_continu` | Correction Contrôle continu | ✅ |

> *Auto-numéroté* : titre pré-rempli « {nom} N » (N = occurrences existantes du type + 1), librement modifiable.

### 3.2 Contenus typés (dans les chapitres/sections)

Sources : [`constants.ts → TYPE_MAP` / `BADGE_TEXT_MAP` / `BADGE_TOOLTIP_MAP`](constants.ts). `TYPE_MAP` accepte de nombreux alias (FR/EN) normalisés vers la forme canonique.

| Type canonique | Badge | Libellé complet | Alias acceptés |
|---|---|---|---|
| `définition` | Déf. | Définition | definition, définition |
| `théorème` | Th. | Théorème | theorem, théorème, theoreme |
| `proposition` | Prop. | Proposition | proposition, prop |
| `lemme` | Lem. | Lemme | lemma, lemme |
| `corollaire` | Cor. | Corollaire | corollary, corollaire, corol |
| `remarque` | Rem. | Remarque | remark, remarque, rem |
| `preuve` | Prv. | Preuve | proof, preuve |
| `exemple` | Ex. | Exemple | example, exemple, ex |
| `exercice` | Exo. | Exercice | exercise, exercice, exo |
| `activité` | Act. | Activité | activity, activité, activite, act |
| `application` | Appli. | Exercice d'application | application, app |

> Un contenu « libre » (paragraphe simple, sans type mathématique) est également possible.

---

## 4. Calendrier scolaire (jours fériés & vacances)

Source : [`public/vacances-jourferie.json`](public/vacances-jourferie.json) — **modifiable sans rebuild** (re-téléchargé `no-cache` côté client, importé côté serveur). Années scolaires couvertes : **2025-2026** (`2025-09-08` → `2026-07-04`) et **2026-2027** (`2026-09-07` → `2027-07-03`).

### 4.1 Jours fériés

| Date | Fête |
|---|---|
| 2025-09-04 / 09-05 | Aïd al-Mawlid (jours 1 et 2) |
| 2025-11-06 | Anniversaire de la Marche Verte |
| 2025-11-18 | Fête de l'Indépendance |
| 2026-01-01 | Nouvel An |
| 2026-01-11 | Manifeste de l'Indépendance |
| 2026-01-14 | Nouvel An Amazigh (Yennayer) |
| 2026-03-20 / 03-21 | Aïd al-Fitr (jours 1 et 2) *(estimé)* |
| 2026-05-01 | Fête du Travail |
| 2026-05-27 / 05-28 | Aïd al-Adha (jours 1 et 2) *(estimé)* |
| 2026-06-17 | Nouvel An de l'Hégire (1er Moharram 1448) *(estimé)* |
| 2026-10-31 | Aïd Al Wahda (Fête de l'Unité) |
| 2026-11-06 | Anniversaire de la Marche Verte |
| 2026-11-18 | Fête de l'Indépendance |
| 2027-01-01 | Nouvel An |
| 2027-01-11 | Manifeste de l'Indépendance |
| 2027-01-14 | Nouvel An Amazigh (Yennayer) |
| 2027-05-01 | Fête du Travail |
| 2027-06-05 | Nouvel An de l'Hégire (1er Moharram 1449) *(estimé)* |

> Les dates religieuses sont **indicatives** (calcul lunaire) : les corriger dans le JSON puis redéployer.

### 4.2 Vacances scolaires

| Période | Nom |
|---|---|
| 2025-10-19 → 10-26 | Vacances d'automne |
| 2025-12-07 → 12-14 | Vacances de fin de 1re période |
| 2026-01-25 → 02-01 | Vacances de mi-année |
| 2026-03-15 → 03-22 | Vacances de printemps |
| 2026-05-03 → 05-10 | Vacances de mai |
| 2026-07-05 → 09-06 | Vacances d'été 2026 |
| 2026-10-18 → 10-25 | 1re pause interstitielle (الفترة البينية الأولى) |
| 2026-12-06 → 12-13 | 2e pause interstitielle (الفترة البينية الثانية) |
| 2027-01-24 → 01-31 | Vacances de mi-année scolaire |
| 2027-03-08 → 03-11 | Aïd al-Fitr *(estimé)* |
| 2027-03-21 → 03-28 | 3e pause interstitielle (الفترة البينية الثالثة) |
| 2027-05-09 → 05-16 | 4e pause interstitielle (الفترة البينية الرابعة) |
| 2027-05-15 → 05-17 | Aïd al-Adha *(estimé)* |
| 2027-07-04 → 09-05 | Vacances d'été 2027 |

---

## 5. Planning officiel des devoirs

Source : [`public/planning-devoirs.json`](public/planning-devoirs.json) — transcrit des documents ministériels (mathématiques). Les **semaines** sont relatives au début de chaque semestre (semaine 1 = semaine de la rentrée / reprise). `controle` = فرض محروس (**devoir surveillé**), `maison` = فرض منزلي (**devoir maison**). Dates **indicatives**, ajustables par le professeur (Configuration ▸ Emploi du temps, bouton ↺). **Total : 46 devoirs surveillés + 34 devoirs maison** sur 8 plans.

| Plan | Niveaux | S1 | S2 |
|---|---|---|---|
| Collège 1re/2e année | 1AC, 2AC | 3 DS (S5·S10·S16, 1h) | 3 DS (S5·S10·S16, 1h) |
| Collège 3e année | 3AC | 2 DS 1h + 1 DS 2h (S15) | idem |
| Tronc commun sci./techno. | TC Sc., TC Techno. | 3 DM + 3 DS (2h) | 3 DM + 3 DS (2h) |
| Tronc commun lettres | TC Lettres | 2 DM + 2 DS (1h) | 2 DM + 2 DS (1h) |
| 1re Bac lettres & sc. humaines | 1BAC Lettres | 2 DM + 2 DS (1h) | 2 DM + 2 DS (1h) |
| 1re Bac sc. expérimentales | 1BAC Sc. Exp. | 3 DM + 3 DS (2h) | 3 DM + 3 DS (2h) |
| 1re Bac sciences mathématiques | 1BAC Sc. Maths | 4 DM + 4 DS (2h) | 4 DM + 4 DS (2h) |
| 1re Bac sc. économiques & gestion | 1BAC Sc. Éco. | 3 DM + 3 DS (2h) | 3 DM + 3 DS (2h) |

> Fenêtres officielles indiquées quand elles existent (ex. Collège S16 : « entre le 10 et le 18 janvier »). Calcul des dates : [`utils/assessments.ts`](utils/assessments.ts) (arithmétique UTC, S2 démarre après les vacances de mi-année).

---

## 6. Emploi du temps

Sources : [`types.ts`](types.ts) · [`utils/timetable.ts`](utils/timetable.ts).

- **Créneaux horaires** (`HOUR_SLOTS`) : 08-09 · 09-10 · 10-11 · 11-12 · **[pause déjeuner]** · 14-15 · 15-16 · 16-17 · 17-18.
- **Jours** (`TIMETABLE_DAYS`) : lundi → samedi (convention `getDay()` : 0 = dimanche … 6 = samedi).
- **Grille** (`TimetableEntry` : `{ day, slot, classId, room? }`) = source de vérité. Deux créneaux consécutifs de la **même classe** sans pause déjeuner = **une seule séance** (2 h). `deriveSchedules()` en tire, par classe, les jours et le nombre de séances/jour (`ScheduleSlot : { weekday, sessions? }`).

---

## 7. Modèles de données (résumé)

Source : [`types.ts`](types.ts).

| Type | Champs clés |
|---|---|
| `ClassInfo` | `id`, `name`, `teacherName`, `subject`, `createdAt`, `color`, `cycle?` |
| `LessonItem` | `type`, `title`, `date?`, `number?`, `page?`, `description?`, `remark?`, `separatorAfter?` |
| Conteneurs | `chapter` → `sections[]` → `subsections[]` → `subsubsections[]` → `items[]` |
| `Separator` | `{ date? }` — démarcation de fin de séance (datable) |
| `TimetableEntry` | `day`, `slot`, `classId`, `room?` |
| `ClassSchedule` | `classId`, `slots: ScheduleSlot[]` |
| `NotificationSettings` | `enabled`, `pushEnabled`, `gapThreshold`, `inactivityThresholdDays`, `quietDuringVacations`, `sessionVibration` |
| `AbsencePeriod` | `debut`, `fin`, `motif?` — exclue du calcul de retard |
| `AppConfig` | `establishmentName`, `defaultTeacherName`, `selectedCycles`, `selectedSubjects`, `schedules?`, `timetable?`, `notificationSettings?`, `absences?`, `schoolYearStart?`, `assessmentDates?` |

---

## 8. Stockage

### 8.1 Local (navigateur — source de vérité hors-ligne)

| Clé localStorage | Contenu |
|---|---|
| `classManager_v1` | Liste des classes (`ClassInfo[]`) |
| `classData_v1_{classId}` | Cahier d'une classe (arbre de contenus) |
| `appConfig_v1` | Configuration (établissement, cycles, matières, emploi du temps, notifications, absences…) |
| `selected_cycle_v1` | Onglet cycle actif du tableau de bord (mode local) |
| `syncMeta_v1` | Métadonnées de synchro (`lastSyncedAt` par classe) |
| `classDataConflict_v1_{classId}` | Version perdante archivée lors d'un conflit multi-appareils |
| `onboardingDone_v1` | Guide d'accueil déjà vu |
| `latenessSnooze_v1` / `assessmentSnooze_v1` | Masquage des bannières jusqu'au lendemain |
| Archives (`utils/archives.ts`) | États figés des années scolaires passées |

### 8.2 Cloud — Upstash Redis

| Clé Redis | Contenu |
|---|---|
| `user:{phone}` | Compte : nom, prénom, hash mot de passe (scrypt), cycles, matières |
| `classes:{phone}` | Classes + emploi du temps + blob `settings` + métadonnées de synchro |
| `lessons:{phone}:{classId}` | Cahier d'une classe (un blob par classe, < 1 Mo) |
| `admin:snapshots` | Hash : par téléphone, instantané compact lu par l'admin |
| `push:subs` | Hash : abonnements Web Push par enseignant |
| `rl:login:{phone}` | Compteur anti-force-brute (TTL 5 min) |

> Séparation stricte par compte. L'admin ne lit **jamais** les cahiers, seulement `admin:snapshots` (une commande `HGETALL` pour tous les profs).

---

## 9. Sévérités & statuts (nomenclature transverse)

| Domaine | Valeurs |
|---|---|
| **Retard** (`LatenessSeverity`) | `ok` · `notice` · `warning` · `critical` |
| **Sauvegarde** (`SyncStatus`) | `idle` · `pending` · `syncing` · `synced` · `offline` · `error` |
| **Phase de séance** (`sessionAssistant`) | `upcoming` · `active` · `recently-ended` |
| **Tokens couleur** (design system) | `primary` · `success` · `warning` · `destructive` (une seule teinte par famille, [`index.css`](index.css)) |

---

*Ce fichier est un miroir documentaire ; en cas de divergence, les sources citées (`constants.ts`, `public/*.json`, `types.ts`) font foi.*
