# Le moteur JSON — types, hiérarchie, arithmétique et échanges

Ce document décrit **le format de données de l’application** : de quoi un cahier
est fait, quels noms portent ses objets, comment l’arbre est parcouru, quels
calculs s’y appliquent, et comment la donnée entre et sort (import, export,
sauvegarde, archives, cloud).

Il complète `mecanisme.md` (qui décrit les **comportements**) : ici on décrit les
**formes** — ce qui est écrit, où, et sous quelle règle.

Vocabulaire employé :

| Terme | Sens exact dans ce document |
|---|---|
| **Nœud** | Un objet de l’arbre du cahier : chapitre, section, sous-section, contenu, ligne libre |
| **Conteneur** | La liste qui porte des nœuds : `sections`, `subsections`, `subsubsections`, `items` |
| **Structure** | Nœud qui organise le plan et ne compte pas comme contenu : chapitre, section, sous-section |
| **Contenu** | Nœud numérable et datable : leçon, définition, exercice, évaluation… |
| **Enveloppe** | Objet JSON qui entoure un cahier (`lessonsData`, sauvegarde, blob cloud) |
| **Compartiment** | Un emplacement de stockage local identifié par une clé |
| **Budget** | Une borne au-delà de laquelle la donnée est refusée, jamais tronquée |

---

## 1. Un seul format interne

Tout l’état durable de l’application est du JSON : aucune base embarquée, aucun
format binaire, aucun schéma propriétaire. Un cahier est **un arbre sérialisé**,
et cet arbre est la seule vérité pédagogique.

### 1.1 Les compartiments locaux

| Compartiment | Contenu | Écrit par |
|---|---|---|
| `appConfig_v1` | Réglages de l’application (profil, matières, emploi du temps, préférences, politiques locales) | Réglages, assistant de création, connexion |
| `classManager_v1` | Liste des classes : `ClassInfo[]` | Gestionnaire de classes |
| `classData_v1_<classe>` | Le cahier d’une classe | Éditeur, import, restauration, pull cloud |
| `editJournal_v1_<classe>` | Journal d’édition (traçabilité des saisies) | Éditeur |
| `printMeta_v1_<classe>` | Mémoire d’impression (dernière sélection, options) | Fenêtre d’impression |
| `syncMeta_v1` | Métadonnées de synchronisation par classe (dernier instant local, dernier instant synchronisé) | Moteur de synchronisation |
| `settingsSyncMeta_v1` | Métadonnées de synchronisation des réglages | Moteur de synchronisation |
| `syncPending_v1` | File de travail en attente (classes sales, liste de classes, suppressions) | Toute écriture locale |
| `classDataConflict_v1_<classe>` | Copie de la version **perdante** lors d’un conflit local/cloud | Moteur de synchronisation |
| `classDataQuarantine_v1_<classe>` | Copie brute d’un cahier devenu illisible, avant remplacement | Sauvegarde du cahier |
| `archives_v1_index` + `archive_v1_<id>` | Index et contenu des archives d’années scolaires | Archives |
| `authUser_v1`, `authSignedOut_v1` | Identité en cache, marqueur de déconnexion explicite | Connexion |
| `workspaceScope_v1`, `workspaceSnapshot_v1_<compte>` | Espace de travail actif et instantané par compte | Connexion, changement de compte |

Règle de conception : **un compartiment = un écrivain logique**. Deux moteurs ne
se partagent jamais l’écriture d’une même clé sans passer par le même point
d’entrée (le cahier ne s’écrit que par la sauvegarde de cahier, la liste de
classes que par le gestionnaire de classes).

### 1.2 Deux formes historiques pour un cahier

| Forme | Statut |
|---|---|
| `[...]` — tableau de nœuds de premier niveau | Ancienne forme, toujours lue |
| `{ lessonsData: [...], contentDirection: "ltr" \| "rtl" }` | Forme courante |

La lecture accepte les deux, la migration est silencieuse, l’écriture ne produit
que la seconde. Un ancien cahier n’est jamais réécrit sans raison : réenregistrer
un contenu identique n’écrit rien.

---

## 2. Hiérarchie du cahier

```
LessonsData = TopLevelItem[]
│
├── TopLevelItem (type: "chapter")
│   ├── sections: Section[]
│   │   ├── subsections: SubSection[]
│   │   │   └── subsubsections: SubSubSection[]
│   │   │       └── items: (LessonItem | EmbeddableTopLevelItem)[]
│   │   └── items: (LessonItem | EmbeddableTopLevelItem)[]
│   └── items: (LessonItem | EmbeddableTopLevelItem)[]
│
├── TopLevelItem (type: "devoir_maison", "controle_continu", …)
├── TopLevelItem (type: "free")        ← ligne libre, hors plan
└── … (autant de blocs de premier niveau que nécessaire)
```

### 2.1 Les nœuds

| Nœud | Champs | Rôle |
|---|---|---|
| `TopLevelItem` | `type`, `title`, `date?`, `remark?`, `description?`, `sections?`, `items?`, `_tempId?` | Bloc de premier niveau : chapitre, évaluation, ligne libre |
| `Section` | `name`, `subsections?`, `items?`, `date?`, `remark?`, `_tempId?` | Découpe un chapitre (ex. « a. Définition et monotonie ») |
| `SubSection` | `name`, `subsubsections?`, `items?`, `date?`, `remark?`, `_tempId?` | Troisième niveau |
| `SubSubSection` | `name`, `items?`, `date?`, `remark?`, `_tempId?` | Quatrième niveau |
| `LessonItem` | `type`, `number?`, `title?`, `description?`, `page?`, `date?`, `remark?`, `_tempId?` | Le contenu : définition, exercice, leçon… |
| `EmbeddableTopLevelItem` | `type` (évaluation uniquement), `title`, `date?`, `remark?` | Un bloc d’évaluation inséré dans une liste d’items |

`Indices` identifie une ligne à l’écran : `chapterIndex`, puis
`sectionIndex?`, `subsectionIndex?`, `subsubsectionIndex?`, `itemIndex?`. C’est
la clé de rendu — jamais un identifiant stocké.

### 2.2 La règle d’or : le niveau se lit dans la liste, jamais dans le `type`

Un cahier réel ne porte pas de `type: "section"`. Une section n’est
reconnaissable que par **la clé du parent qui la contient** :

| Conteneur qui porte le nœud | Type effectif |
|---|---|
| racine | le `type` du bloc (défaut : `chapter`) |
| `items` | `chapter` si un bloc entier y est embarqué, sinon `item` |
| `sections` | `section` |
| `subsections` | `subsection` |
| `subsubsections` | `subsubsection` |

Se fier au `type` déclaré gonflerait les compteurs et casserait la numérotation.
La règle est appliquée par **un seul** moteur, partagé par l’écran, l’impression,
l’import, la synchronisation et la fiche de la direction.

### 2.3 Ordre de visite canonique

`sections` → `subsections` → `subsubsections` → `items`.

Cet ordre est celui du tableau affiché et celui du papier. Un nœud peut porter
**plusieurs branches à la fois** (des `sections` *et* des `items`) : les sections
sortent d’abord, puis les items restés au même niveau. L’ordre d’écriture dans le
JSON n’a donc aucune influence sur l’ordre de lecture.

### 2.4 Structure et contenu

| Famille | Types | Compte comme contenu ? | Numéroté ? | Datable ? |
|---|---|---|---|---|
| Structure | `chapter`, `section`, `subsection`, `subsubsection` | Non | Non (sauf style hiérarchique) | Oui (titre daté) |
| Contenu numérable | `definition`, `proposition`, `theoreme`, `exercice`, `activite`… | Oui | Oui | Oui |
| Évaluation | `evaluation_diagnostic`, `devoir_maison`, `controle_continu`, `controle_court`, `controle_global`, `oral`, `colle`, `examen_blanc`, `olympiade`, `concours`, et les `correction_*` | Oui | Oui, mais par son **titre** | Oui |
| Ligne libre | `free` | Oui | Non | Oui |

---

## 3. Les noms du modèle

Les noms ci-dessous sont les identifiants du modèle. Ils sont stables : un écran,
un test ou une fonction cloud qui les emploie parle le même langage.

### 3.1 Racines et identités

| Nom | Ce qu’il désigne |
|---|---|
| `Cycle` | `college` · `lycee` · `prepa` |
| `AppLocale` | `fr` · `en` · `ar` |
| `ContentDirection` | `ltr` · `rtl` — sens d’écriture **du contenu**, indépendant de l’interface |
| `NotebookContentOrigin` | `personal` · `predefined` · `imported` — comment le cahier a été **commencé** |
| `ClassInfo` | Une classe : identifiant, nom, professeur, matière, couleur, cycle, niveau, filière, groupe, source de programme, associations de chapitres |
| `ClassDraft` | Classe en cours de création, sans identifiant ni couleur |
| `ClassIdentityDraft` | Les six champs d’identité saisis par l’assistant (`name`, `subject`, `cycle`, `level`, `branch`, `group`) |
| `ClassRoster` | Liste d’élèves d’une classe |
| `AppConfig` | Tous les réglages de l’application |
| `ThemeMode` | `light` · `dark` · `system` |
| `AppTextSize` | `sm` · `md` · `lg` · `xl` |

### 3.2 Évaluations

| Nom | Ce qu’il désigne |
|---|---|
| `DevoirType` | `controle`, `controle_court`, `controle_global`, `oral`, `maison`, `colle` |
| `PedagogicalEventType` | Les activités pédagogiques (diagnostic, cahiers, documents…) |
| `EvaluationKindKey` | `DevoirType` ∪ `PedagogicalEventType` — la clé d’une nature d’évaluation |
| `EvaluationKindPolicy` | Ce qu’une nature autorise : document, élèves, retour, remise, note /20, absents, correction |
| `EvaluationKindOverrides` | Surcharges de politique par nature |
| `EvaluationPolicy` / `EvaluationPolicyAssignment` | Politique de contrôle continu, **résolue par le serveur** |
| `ManualAssessment` | Évaluation ajoutée à la main, hors cahier |
| `PedagogicalEvent` | Activité pédagogique datée, avec ses élèves |
| `ContentDocument` | Document exigé/remis pour une évaluation |
| `EvaluationDocumentMode` | `off` · `optional` · `required` |
| `NotebookCondition` | `good` · `average` · `needs_work` · `missing` — état du cahier de l’élève |
| `OralOutcome` | `mastered` · `developing` · `needs_support` |
| `HomeworkOutcome` | `given` · `missing` — remise d’un devoir maison |
| `ClassEvaluationEntry` | `all` · `oral` · `controle_cahiers` |

### 3.3 Emploi du temps et calendrier

| Nom | Ce qu’il désigne |
|---|---|
| `ScheduleSlot` | `weekday` + `sessions` (1 = séance simple, 2 = séance double…) |
| `ClassSchedule` | Les créneaux d’une classe |
| `TimetableEntry` | Une case de la grille : jour, heure, classe, salle |
| `TimetableClockPolicy` / `TimetableClockAssignment` | Référentiel d’horloge imposé, et sa personnalisation par compte |
| `AbsencePeriod` | Absence justifiée : plage de dates, **traitée comme des vacances personnelles** |
| `NotificationSettings` | Seuils d’alerte, silence pendant les vacances, push |

### 3.4 Directions et administration

| Nom | Ce qu’il désigne |
|---|---|
| `ClassSnapshot` | Projection d’une classe pour la direction : compteurs, progression, créneaux |
| `TeacherSnapshot` | Projection complète d’un professeur : identité, matières, préférences, classes |
| `TeacherRequestDraft` | Demande d’un professeur vers la direction |
| `AdminMessage` | Message de la direction, avec accusé de lecture |
| `OfficialCurriculumPlan` | Programme officiel d’un niveau : chapitres, heures, jalons d’évaluation |

### 3.5 Manipulation et échanges

| Nom | Ce qu’il désigne |
|---|---|
| `LessonRow` | Une ligne **aplatie** du cahier, prête à l’affichage ou au calcul |
| `ContentNumbering` | Réglage du numéroteur : `enabled`, style de structure, style de badge, portée |
| `ContentAnalysis` | Résultat d’un diagnostic de JSON : erreurs, statistiques, aperçu |
| `ContentMovePlan` / `ContentRelocationPlan` / `ContentTransferPlan` | Plans de déplacement, de changement de parent et de transfert entre cahiers |
| `ImportReport` | Rapport d’import : compteurs et réparations |
| `ExportableChapter` | Bloc exportable : position, type, titre, date, contenus, octets |
| `FullBackup` | Sauvegarde complète versionnée |

---

## 4. Les branches

Le mot « branche » a deux sens dans l’application ; les deux comptent.

### 4.1 Les branches de l’arbre

Ce sont les quatre conteneurs. Un nœud peut en porter plusieurs :

```
Chapter
├── sections[0]
│   ├── subsections[0] → subsubsections[0] → items[0..n]
│   └── items[0..n]                          ← items sans sous-section
└── items[0..n]                              ← items sans section
```

Règles de branchement :

1. Une section peut contenir des sous-sections **et** des items ; les deux
   branches sont rendues, dans cet ordre.
2. Un bloc d’évaluation peut être **embarqué** dans `items` : il garde son type
   d’évaluation, sa date et sa remarque, mais perd la possibilité d’avoir des
   sections.
3. Supprimer un nœud structurel **promeut** ses enfants au parent, jamais ne les
   détruit.
4. Une ligne libre (`free`) vit à la racine ou dans une liste d’items, mais ne
   participe ni au plan, ni à la numérotation, ni à la progression.

### 4.2 Les branches pédagogiques

| Niveau | Valeurs | Où il sert |
|---|---|---|
| `cycle` | collège · lycée · prépa | Disponibilité des natures d’évaluation, plans officiels |
| `level` | ex. « 3AC », « Tronc Commun », « 1er Bac » | Choix du programme officiel, barème d’heures |
| `branch` | ex. « Sciences Expérimentales », « Lettres » | Filière : restreint les matières et les plans |
| `group` | ex. « 1 », « 2 » | Distingue deux groupes d’une même classe |

Ces quatre champs sont **transmis séparément du nom affiché**. Aucun circuit ne
re-devine la filière en analysant le texte du nom : c’est ce qui permet de
renommer une classe sans perdre son programme, ses heures et sa progression.

---

## 5. Le moteur de parcours

Un seul parcours d’arbre sert à tout : écran, impression, compteurs, import,
validation, synchronisation, fiche de direction.

Le moteur expose cinq points d’observation :

| Point | Ce qu’il reçoit | Usage typique |
|---|---|---|
| `onNode` | nœud, niveau, indices, indicateur `structural` | Compter les contenus, ignorer la structure |
| `onContainer` | clé de conteneur, valeur, `isArray` | Vérifier qu’un conteneur est bien une liste |
| `onText` | champ texte et sa valeur | Appliquer un budget par champ |
| `onInvalidNode` | valeur fautive | Lever une erreur précise |
| `onBudgetExceeded` | `depth` ou `nodes` | Refuser un JSON hostile |

Il renvoie des statistiques (`NotebookStats`) : nombre de nœuds, de contenus, de
structures, profondeur atteinte.

**Pourquoi un seul moteur ?** Parce que quatre parcours écrits à la main
finissaient par diverger : l’import comptait 12 000 éléments quand la carte en
annonçait 12 400, et la synchronisation acceptait ce que l’import refusait. Un
seul parcours = un seul compte.

---

## 6. Le moteur d’arithmétique

Aucun calcul de l’application n’est « à la volée » dans un écran : chaque formule
vit dans un moteur pur, testé séparément, sans React, sans stockage, sans réseau.

### 6.1 Numérotation des contenus

- Chaque **type** possède son compteur : « Définition 1 », « Définition 2 »,
  « Exercice 1 »…
- La **portée** décide où le compteur repart de 1 : par chapitre (défaut), par
  section, ou pour tout le document.
- Le **numéro saisi à la main** prime toujours — et **fait avancer le compteur**
  jusqu’à lui. Sans cette règle, la suite automatique contredirait la saisie.
- Trois écritures : décimale (`3`), romaine (`III`), hiérarchique (`1.2.3`).
- Sont exclus : les structures, les lignes libres et les évaluations (dont le
  numéro est porté par le titre).
- Le calcul produit une **table indexée par la clé de ligne**, la même que celle
  du rendu : écran et papier affichent donc nécessairement le même numéro.

### 6.2 Progression d’un cahier

| Grandeur | Formule |
|---|---|
| `totalItems` | Contenus de tout l’arbre (structure exclue) |
| `plannedCount` | Contenus portant une date |
| `completionRate` | `arrondi(plannedCount / totalItems × 100)`, `0` si le cahier est vide |
| `sessionsCount` | Séances **réellement tenues** : pour chaque date, `min(contenus datés ce jour-là, séances prévues ce jour de semaine)` |
| `perChapter.rate` | Même formule, chapitre par chapitre |
| `unplannedItems` | Contenus sans date, listés pour l’assistant |

Deux subtilités qui changent le résultat :

1. Une **séance double** ne compte qu’une fois si un seul contenu y est saisi ;
   c’est le `min` qui l’impose.
2. Les compteurs sont mis en cache par identité de l’arbre (mémoire faible) :
   recalculer à chaque rendu serait coûteux, et le cache ne peut pas mentir
   puisque la moindre modification produit un nouvel arbre.

### 6.3 Progression par séance (vue de la direction)

| Grandeur | Formule |
|---|---|
| `sessions` | Dates datées, triées, avec nombre de contenus et premiers titres |
| `expectedSessions` | Séances attendues par l’emploi du temps, depuis la rentrée (séances doubles incluses), jours fériés et absences justifiées exclus |
| `actualSessions` | Dates datées **échues** seulement — une séance future ne compense pas un retard |
| `gap` | `max(0, expectedSessions − actualSessions)` |
| `coverage` | `min(100, arrondi(actualSessions / expectedSessions × 100))` |
| `averageItems` | `arrondi(items échus / actualSessions × 10) / 10` |
| `missing` | Journées de classe attendues sans aucune trace |

### 6.4 Heures officielles

| Grandeur | Formule |
|---|---|
| `estimatedHoursSpent` | `taux de réalisation × heures officielles du chapitre` |
| `expectedHours` | `min(heures connues, heures écoulées depuis la rentrée)` |
| `deltaHours` | `arrondi((estimé − attendu) × 10) / 10` |
| `completionRate` | `arrondi(estimé / heures connues × 100)`, ou `null` si un chapitre n’est pas apparié : on ne calcule jamais sur un plan incomplet |

### 6.5 Retard et inactivité

| Grandeur | Règle |
|---|---|
| `gap` | Nombre de séances attendues non saisies |
| `severity` | `ok` → `notice` → `warning` → `critical`, par seuils |
| Seuil de séances | 2 par défaut |
| Seuil d’inactivité | 5 jours par défaut |
| Absences justifiées | Ajoutées au calendrier comme des vacances : exclues des séances attendues **et** des jours d’inactivité |
| Fin d’année de la classe | Rien n’est attendu au-delà du dernier jour de cours |

### 6.6 Horloge et créneaux

- Une heure de créneau est un **nombre de minutes depuis minuit**.
- L’horloge de référence peut être décalée de −120 à +120 minutes, par pas de 5,
  et la translation est **pure** : mêmes indices, mêmes durées, mêmes
  continuités, même pause déjeuner.
- Les créneaux décalés sont calculés une fois par valeur (49 décalages
  possibles), jamais à chaque appel.
- Deux créneaux consécutifs (08–09 puis 09–10) forment **un** bloc de séance ;
  la pause déjeuner brise la continuité.
- Les libellés nominaux de la grille (« Heure 1 ») ne servent **jamais** à
  programmer une alarme ni à détecter une séance en cours : seules les minutes
  réelles comptent.

### 6.7 Couleurs de classes

- Une couleur enregistrée est **toujours** conservée, même si deux classes la
  partagent.
- Une classe sans couleur reçoit la teinte la plus éloignée des teintes déjà
  utilisées (distance circulaire sur 360°).
- Les teintes hors palette suivent l’angle d’or (137,508°) pour rester
  dispersées, et l’attribution est **déterministe** : mêmes entrées, mêmes
  couleurs, sur tous les appareils.

### 6.8 Dates

| Situation | Règle |
|---|---|
| Au repos | ISO `AAAA-MM-JJ` uniquement |
| À l’import | `JJ/MM/AAAA`, `JJ-MM-AAAA` et horodatage numérique acceptés, puis convertis |
| Date impossible | Refusée (`31/02/2026` ne devient jamais le 3 mars) |
| Calcul de jours | En UTC, pour ne pas dériver au changement d’heure |
| Fusion de deux blocs datés | Normalisation de la date avant comparaison |
| Affichage | Format local, jamais stocké |

### 6.9 Agrégation de la fiche direction

La projection d’un professeur assemble : identité et matières déclarées, langue,
date de dernière synchronisation, absences, seuils de notification, puis pour
chaque classe : contenu total, contenus datés, taux, séances tenues, dernière
date, jours et volumes de créneaux. C’est une **projection en lecture seule** :
aucun de ces champs ne repart du serveur vers le cahier.

---

## 7. Les enveloppes d’échange

| Enveloppe | Forme | Emploi |
|---|---|---|
| Cahier local | `{ lessonsData, contentDirection }` ou tableau nu | Stockage d’une classe |
| Sauvegarde complète | `{ format: "cdt-backup", version: 2, exportedAt, user, config, classes[], syncMeta }` | Export/restauration de toute la machine |
| Archive d’année | Identique à la sauvegarde, plus un index `{ id, yearLabel, createdAt, classCount, bytes }` | Mémoire des années passées |
| Import de contenu | Tableau, ou objet portant `lessonsData` / `data` / `lessons` / `items`, ou sauvegarde mono-classe | Import d’un cahier |
| Blob cloud « classes » | Liste de classes, créneaux, grille, réglages, métadonnées, surcharges et pierres tombales | Synchronisation |
| Blob cloud « cahier » | `{ lessonsData, contentDirection, updatedAt }` | Synchronisation d’une classe |
| Instantané de direction | Projection `TeacherSnapshot` | Console d’administration |

Trois refus explicites, pour éviter les fausses données :

1. Un export de synchronisation contenant **plusieurs cahiers** est refusé :
   « Exportez une seule classe. »
2. Une sauvegarde contenant **plusieurs classes** est refusée à l’import de
   contenu : le choix de la cible appartient au professeur, l’import ne devine
   jamais.
3. Une sauvegarde **vide** est refusée : ce n’est pas un cahier vide, c’est un
   fichier sans classes.

---

## 8. Le moteur d’import

Sept étapes, dans cet ordre. Chaque étape peut refuser ; aucune ne réécrit
partiellement.

| # | Étape | Ce qui se décide |
|---|---|---|
| 1 | **Borne de fichier** | 10 Mio maximum, BOM UTF-8 toléré ; un fichier trop gros est refusé avant lecture |
| 2 | **Diagnostic** | Analyse non bloquante : erreurs localisées (ligne, colonne, extrait), statistiques, aperçu |
| 3 | **Choix de l’enveloppe** | Une seule enveloppe reconnue ; les cas ambigus sont refusés, jamais devinés |
| 4 | **Normalisation** | Champs texte nettoyés et bornés ; type ramené à sa clé canonique ; dates converties ; conteneurs non-tableau réparés ; champs hérités supprimés |
| 5 | **Budgets** | Profondeur 12, 12 000 nœuds, étiquette 500 caractères, texte long 20 000, circulation 700 000 octets |
| 6 | **Migration** | `chapter` → `title`, type par défaut, `sections` initialisées |
| 7 | **Direction d’écriture** | Détection de la langue du contenu (arabe/latin), indépendante de l’interface |

Le résultat est un **rapport d’import** : blocs de premier niveau, nœuds
imbriqués, items, dates normalisées, chaînes rognées, conteneurs réparés, textes
remplacés. Ce rapport est affiché avant validation — l’utilisateur voit ce que
le moteur a corrigé, il ne le découvre pas après coup.

Règles de sûreté :

- Un champ qui contient un objet ou un tableau est **retiré**, jamais converti en
  `[object Object]` ; une chaîne vide reste vide (l’auteur a le droit de vider).
- Une profondeur ou un volume excessif lève une erreur **lisible et actionnable**
  (« Répartissez le contenu entre plusieurs cahiers »), pas une erreur technique.
- L’import de la direction peut **ajouter** ou **remplacer** ; la règle du
  diagnostic initial s’applique après assemblage, jamais au fragment entrant.

---

## 9. Le moteur d’export

| Export | Ce qu’il produit | Règle |
|---|---|---|
| **Par chapitre** | Les blocs cochés, tels quels | Aucune recopie, aucune renumérotation : le fichier reste réimportable tel quel |
| **Aperçu d’export** | Position, type, titre, date, contenus et **octets UTF-8 réels** de chaque bloc | L’aperçu de taille ne ment pas |
| **Sauvegarde complète** | Config, classes, cahiers, journaux, mémoire d’impression, métadonnées | Validation **avant** écriture ; un fichier invalide ne se télécharge pas |
| **Archive d’année** | Même format, figé et étiqueté | Si le stockage est plein, l’archive échoue proprement et le téléchargement reste possible |
| **Impression** | Document mis en page + mémoire d’options par classe | La mémoire d’impression survit aux exports |

Principe commun : **l’export ne normalise jamais**. Ce qui sort doit pouvoir
rentrer à l’identique — c’est la seule façon de garantir une restauration fidèle.

---

## 10. Validation et garde-fous

| Contexte | Politique | Pourquoi |
|---|---|---|
| Lecture locale stricte | Valide **sans normaliser** (conteneurs, champs texte, budgets) | La synchronisation et les sauvegardes doivent préserver la mise en forme voulue |
| Import | Valide **en normalisant** | Une donnée extérieure doit être assainie avant d’entrer |
| Serveur | Corps ≤ 950 000 octets, structures validées, identifiants de classes vérifiés, doublons refusés, horodatage ISO obligatoire | Un client ne dicte jamais le format |
| Écriture locale | Contenu identique ⇒ aucune écriture, aucune horloge avancée, aucune écriture cloud facturée | Éviter le bruit et la dépense |
| Cahier illisible | Lecture stricte impossible ⇒ écriture refusée, copie conservée, synchronisation suspendue, quarantaine si remplacement | On ne perd jamais un cahier pour cause de JSON cassé |

---

## 11. Qui lit, qui écrit

| Producteur | Consommateur | Donnée |
|---|---|---|
| Éditeur | Cahier local | Arbre du cahier |
| Cahier local | Carte, alertes, progression, impression, direction | Lignes aplaties et compteurs |
| Import | Cahier local | Arbre préparé + rapport |
| Sauvegarde | Fichier JSON | Sauvegarde complète |
| Fichier JSON | Restauration / import | Config, classes, cahiers |
| Cahier local | Blobs cloud | Cahier + direction d’écriture |
| Blobs cloud | Cahier local | Cahier adopté, version perdante archivée |
| Métadonnées de synchronisation | Push et pull | Derniers instants, conflits |
| Cahier + classes | Instantané direction | Projection en lecture seule |

---

## 12. Invariants à ne jamais casser

1. **Un niveau se lit dans la liste qui porte le nœud**, jamais dans son `type`.
2. **Un seul parcours d’arbre** : aucun compteur écrit à la main ailleurs.
3. **Une seule définition des budgets** : import, diagnostic, validation et
   serveur partagent les mêmes bornes.
4. **Un numéro manuel prime et fait avancer le compteur.**
5. **Toute grandeur bornée est bornée** : taux 0–100, couverture ≤ 100, écart ≥ 0.
6. **Aucune écriture partielle** : importer ou restaurer, c’est tout ou rien.
7. **Un contenu identique ne s’écrit pas.**
8. **Aucun `[object Object]`** : un champ texte invalide disparaît.
9. **Les dates au repos sont ISO** ; les formats locaux n’existent qu’à l’entrée
   et à l’affichage.
10. **Un JSON cassé ne détruit rien** : copie conservée, quarantaine, travail en
    attente préservé.
