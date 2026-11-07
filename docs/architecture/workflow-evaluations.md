# Workflow des évaluations — nœuds, états, flux

> **Document vivant.** Toute évolution d’un flux ci-dessous se met à jour dans
> le **même lot** que le code et ses verrous de test
> (`tests/test-evaluations-capture.ts`). Contrat de référence de
> `src/domain/evaluations/` et de l’écran « Contrôle continu et activités ».

## 1. Principe directeur — une seule porte par famille

La saisie d’une évaluation ou d’une activité part du **Table Editor**.
La feuille **« Contrôle continu et activités »** reçoit les entrées capturées
et ouvre le suivi des entrées existantes. Son état vide renvoie vers le cahier.
Le choix de nature se fait dans le tableau, par le formulaire de contenu ou
la remarque de séance selon la famille.

Les dates de cette feuille sont en lecture seule, y compris celles des
corrections et des périodes d’activité. La datation et l’identité d’un contenu
se modifient dans le tableau. Les actions de la feuille portent sur les
documents, les élèves et les suppressions confirmées.

### Famille A — les faits de séance, énoncés dans la REMARQUE

Contrôle des cahiers des élèves, remédiation, soutien, rattrapage et **devoir à
la maison assigné aux élèves** s’écrivent dans la **remarque** de leur séance :
c’est là que le professeur raconte son cours. Les quatre activités sont
saisies par puce ou reconnues dans le texte d’une remarque datée. La feuille
reçoit un événement par activité détectée. Le devoir à la maison donné passe
par la puce « Devoir à la maison assigné aux élèves » ou la carte « Devoir
maison » d’« Ajouter un contenu ». Les deux entrées de l’éditeur appellent
`assignHomeworkPatch` et alimentent le même devoir.

### Famille B — les épreuves, créées depuis « Ajouter un contenu »

| Saisie dans « Ajouter un contenu » | Entrée reçue dans la feuille |
| --- | --- |
| Devoir surveillé, écrit court, écrit global, oral, colle | Évaluation reconnue par le type du bloc, même imbriqué |
| Diagnostic, correction du devoir surveillé, examen blanc, olympiade, concours | Activité reconnue par le type du bloc |
| Correction du devoir maison | Date du second temps du devoir, associée par identité ou numéro |

Le bloc se pose à l’ancre du tableau via `insertAssessmentBlock`. Son
emplacement règle l’ordre de lecture, tandis que son type détermine ce que
la capture en extrait. Le bloc oral peut ainsi venir du tableau. Le pont
de retour de la feuille projette l’oral dans la remarque et ne matérialise
pas de nouveau bloc oral.

- Le **tableau** (cahier de textes) reste la surface de **capture quotidienne** :
  contenu, date de séance, remarque. C’est lui qui porte le document.
- La **modale « Contrôle continu et activités »** présente les dates reçues et
  gère documents (sujet/corrigé), absences, remises et observations d’oral.
- **Un objet n’existe qu’une fois** : les deux surfaces parlent du même
  enregistrement, jamais d’une copie. La réconciliation apparie par identité
  (`dev-block-<id>`, `event-<id>`), jamais par position ni par date seule.

## 2. Nœuds et identités

| Nœud | Où vit-il | Identité |
| --- | --- | --- |
| Ligne de contenu (séance) | Cahier (`LessonsData`) | `_tempId` ou position (`indices`) |
| Cellule date / remarque | Ligne fusionnée (`dateMerge`) | date de séance `AAAA-MM-JJ` |
| Annotation de séance | Projection — jamais stockée dans le cahier | `event:<id>` (activité), `assessment:<id>` (évaluation), `assessment:<id>:correction` (correction) |
| Bloc « épreuve » | Cahier | `_tempId` de saisie, ou `dev-block-<assessmentId>` pour un bloc rattaché par le pont |
| Bloc « devoir maison » | Historique du cahier | masqué à l’affichage, conservé pour compatibilité |
| Bloc « correction du devoir maison » | Cahier | position + numéro déclaré — il DATE le devoir de ce numéro, sans jamais le dupliquer |
| Évaluation manuelle | `manualAssessments[classId]` | `<année>:s<semestre>-<type><num>` |
| Évaluation planifiée | Planning ministériel + surcharges | même forme, millésime inclus |
| Activité pédagogique | `pedagogicalEvents[classId]` | Identité d’événement liée à un bloc ou dérivée de la ligne de remarque |
| Sujet / corrigé | `assessmentDocuments` | par identité d’évaluation |
| Absences, remises, oral | `assessmentAbsences`, `assessmentParticipants` | par identité d’évaluation |

La clé de position sert à adresser la ligne. Pour rattacher le suivi, le
moteur privilégie l’identité portée par `_tempId`, puis l’appariement par
type et numéro avec le planning ou une entrée existante. Le numéro explicite
du titre prime sur l’ordinal. L’année et le semestre entrent dans la clé
calculée lorsqu’une date valide permet de les déterminer.

## 3. États d’un devoir

```text
planifié (planning) → daté (assessmentDates) → déroulé → documenté (sujet/corrigé)
      → suivi (absences, remises, oral) → corrigé (correctionDateISO)
```

| État | Signal | Écrit par |
| --- | --- | --- |
| Planifié | semaine du planning officiel | planning (lecture seule) |
| Daté | `assessmentDates` / date de séance | modale ou tableau (réconciliation) |
| Déroulé | statut `done` du lien | calcul (date passée) |
| Écart | statut `mismatch` + bouton « Aligner » | calcul — **jamais** écrasé silencieusement |
| Documenté | `assessmentDocuments[id]` | modale (sujet, corrigé) |
| Suivi | `assessmentAbsences`, `homeworkOutcomes`, `oralOutcomes` | modale |
| Corrigé | `correctionDateISO` + pastille « Correction devoir maison N » | cellule de séance du tableau |

États d’une **activité** : planifiée → datée → consignée (élèves) → documentée.
États d’une **séance** : sans date → datée → fusionnée (remarque partagée) →
annotée (projections ci-dessus).

## 4. Flux et sens des écritures

1. **Capture — tableau → modale.** À l’enregistrement, et à la relecture du
   cahier dans la feuille, `syncNotebookToEvaluations` parcourt l’arbre complet,
   indépendamment du filtre et de la fenêtre de défilement. La feuille peut
   aussi afficher un bloc d’évaluation sans date à partir du lien lu dans
   le cahier. Un bloc d’activité avec `_tempId` est transmis avant sa
   datation. La cellule indique alors « Pas encore de date ». Le tableau
   fournit la date initiale. Un ancien bloc d’activité sans identité attend
   une date s’il ne correspond à aucune entrée existante. La disparition
   d’un bloc est traitée lorsque l’état précédent est connu. Une deuxième
   capture identique ne produit aucun correctif. Un bloc « correction du devoir maison » date le
   SECOND temps du devoir (`withHomeworkCorrection`, `homeworkCycle.ts`) :
   devoir de la feuille, devoir du planning officiel daté par le professeur
   (il rejoint alors les entrées de la feuille), ou — aucun devoir de ce
   numéro dans le semestre — devoir transmis à la feuille avec sa correction,
   attribution à compléter. Jamais de doublon ; un devoir supprimé ne renaît
   pas.
2. **Retour de suivi — modale → tableau.** Changer la date d’une entrée
   reçue peut actualiser sa représentation dans le cahier.
   - contrôles écrits et colle : `syncAssessmentDateToNotebook` actualise le
     bloc daté ou le matérialise si l’entrée existante n’a pas encore de bloc ;
   - oral et devoir maison : `buildSessionRemarkEntries` projette les
     annotations d’attribution dans la remarque. Pour l’oral, modifier la
     date côté feuille ne réécrit pas le bloc de saisie ;
   - activités : `syncEventToNotebook` matérialise le diagnostic, la
     correction CC, l’**examen blanc**, l’**olympiade** et le **concours** en
     blocs datés `event-<id>` ; contrôle des cahiers, remédiation, soutien et
     rattrapage restent des annotations de séance ;
   - suppression symétrique par identité : `removeAssessmentFromNotebook`,
     `removeEventFromNotebook`.
3. **Capture de la remarque.** L’édition de la séance compare les remarques
   avant et après pour transmettre immédiatement les activités détectées.
   Le même détecteur relit les remarques lors de la réconciliation. Il exige
   une date de début valide, normalise le texte français, anglais ou arabe,
   puis cherche les motifs du contrôle des cahiers, de la remédiation, du
   soutien et du rattrapage. L’identité `remark-<type>-<ligne>` associe le suivi
   à la remarque. Une activité explicite correspondante le même jour
   prime sur la mention. Le devoir maison donné utilise la validation de
   la remarque et son numéro détecté ou proposé, via `assignHomeworkPatch`.
4. **Dates.** La date du cahier reste la source de vérité affichée ; tout écart
   planning/tableau est **signalé** (statut `mismatch` + bouton « Aligner »),
   jamais corrigé en silence. Les dates ministérielles ne sont jamais
   modifiées par la capture.

## 5. Où modifier quoi

| Besoin | Module |
| --- | --- |
| Capture tableau → modale | `notebookReconciliation.ts` |
| Matérialisation modale → tableau | `notebookSyncBridge.ts` |
| Annotations de séance | `sessionActivityRemarks.ts` |
| Numérotation des devoirs | `homeworkNumbering.ts` |
| Cycle donné → corrigé | `homeworkCycle.ts`, `sessionRemarkChanges.ts` |
| Date de correction (bloc du tableau) | `homeworkCycle.ts` (`withHomeworkCorrection`), `notebookReconciliation.ts` |
| Appariement cahier ↔ planning | `assessmentSync.ts` |

## 6. Invariants verrouillés par les tests

- **Une seule porte par famille** : la famille A (faits de séance) s’énonce
  dans la REMARQUE, famille B (épreuves et corrections) se crée dans
  `ContentModal`. Le devoir à la maison a deux entrées — la pastille de la
  remarque et la carte « Devoir maison » de `ContentModal` — mais UNE seule
  écriture (`assignHomeworkPatch`, `sessionRemarkChanges.ts`) : il rejoint la
  feuille, jamais le cahier sous forme de bloc.
- **Placement à l’ancre** : `insertAssessmentBlock` pose le bloc après le
  contenu ciblé ou sous le titre de section. Un chapitre ciblé place le bloc
  juste après ce chapitre à la racine. Sans ancre, le bloc va en fin de cahier.
  La capture le retrouve même imbriqué dans une section.
- **Correction transmise, jamais dupliquée** : un bloc de correction du devoir
  maison date le devoir de son numéro (feuille ou planning daté) ; sans devoir
  de ce numéro dans le semestre, il le transmet à la feuille (attribution à
  compléter). Un devoir supprimé de la feuille ne renaît pas.
- **Idempotence** : deux synchronisations identiques → aucune écriture.
- **Pas de doublon** : une identité donnée n’existe qu’une fois, des deux
  côtés (bloc ↔ évaluation).
- **Retour de suivi pour l’oral et le devoir maison** : le pont ne matérialise
  aucun nouveau bloc pour ces deux natures. Le tableau peut saisir l’oral
  comme bloc et conserve les anciens blocs maison pour compatibilité.
- **Épreuves écrites** : bloc daté garanti, mis à jour sur place, retiré par
  identité.
- **Suppression des entrées à bloc** : la suppression peut retirer le bloc
  associé. Pour une activité issue d’une remarque, retirer la mention à sa
  source évite qu’elle soit détectée de nouveau à la lecture du cahier.
## 7. Politique du contrôle continu (réglée par la direction)

La direction décide, **nature par nature** (16 natures : 6 devoirs, 10 activités),
ce que le cahier transmet à la feuille et ce que l'enseignant y peut faire.
Page d'administration « Contrôle continu » (politique générale) et, par compte,
« Personnaliser le contrôle continu » (écarts propres au compte).

| Réglage | Effet |
| --- | --- |
| `transmit` | autorise le moteur de réconciliation à transmettre une nature saisie dans le cahier |
| `continuous` | famille « Devoirs et évaluations » plutôt que « Activités pédagogiques » (présentation seulement) |
| `document` | contenu rédigé : `off` / `optional` / `required` (rouge si requis et manquant) |
| `students` | commande « Élèves » / « Suivi » / « Remises » / « Cahiers » : liste d'élèves |
| `feedback` | retour par élève : niveau (oral, colle, devoirs, activités), remise (devoir maison), état du cahier |
| `grades` | note /20 par élève (suppose `feedback`) |
| `absences` | liste des absents (devoirs seulement) |

Invariants :

- **Parité** : sans politique publiée, le comportement est celui d'avant (table
  `DEFAULTS` de `evaluationPolicy.ts`, verrouillée par `tests/test-evaluation-policy.ts`).
- **Écarts, pas copies** : seuls les champs modifiés sont stockés ; les défauts
  peuvent évoluer sans réécrire ce que la direction a publié.
- **Cohérence à chaque lecture** : la note suppose le retour, qui suppose la liste ;
  une capacité que la nature ne porte pas (note d'un devoir maison, absents d'une
  activité) reste éteinte (`kindSupport`).
- **Rien ne disparaît** : la politique gouverne la création et l'exposition, jamais
  la visibilité de ce qui existe. Une nature qui cesse d'être transmise ne retire
  rien de la feuille ; couper le retour par élève conserve niveaux et notes déjà
  saisis pour les élèves restants.
- **Circuit de l'horloge des séances** : document général versionné
  (`admin:evaluation-policy`) + écarts par compte (`admin:evaluation-policy:<tél>`),
  résolus par `GET /api/sync` et livrés avec le pull. Jamais dans les réglages de
  l'enseignant (hors `SYNCABLE_KEYS`, retirée par `assertValidSyncSettings`) : un
  appareil ancien ne peut ni l'effacer ni la forger. Écriture par comparaison de
  version (409 en cas de conflit).
- **Une seule porte par question** : `resolveKindPolicy`, `documentRequirementFor`,
  `kindTransmits`, `groupKinds` — la feuille, la réconciliation du cahier et la fiche
  enseignant de la direction lisent la même réponse.

## 8. Le devoir maison : deux entrées, une identité

Sur la feuille, un devoir maison s’affiche en **deux entrées, et deux seulement**. Elles partagent le même
identifiant : un seul enregistrement dans `manualAssessments[classe]`, donc rien de nouveau à synchroniser
avec le cloud (Redis ou Firestore stockent le même blob JSON, octet pour octet).

| Entrée | Date de la ligne | Boutons | Stockage |
| --- | --- | --- | --- |
| **Devoir maison N** (assigné aux élèves) | `dateISO` (donné) | document · **date limite de rendu** · corbeille | sujet : `assessmentDocuments[id]` · `dueDateISO` |
| **Correction du devoir maison N** | `correctionDateISO` | document (corrigé) · **élèves n’ayant pas rendu** · corbeille | corrigé : `assessmentDocuments[<id>:correction]` · `assessmentParticipants[id].homeworkOutcomes` |

- **Pas d’absents** sur un devoir maison (`kindSupport('maison').absences === false`).
- **Corbeille de l’assigné** : supprime le devoir entier, corrigé compris (`deleteAssessment`).
- **Corbeille de la correction** : efface la date de correction, le corrigé et la liste des élèves, retire du
  cahier le bloc « Correction du devoir maison N » et sa ligne de remarque (sinon la synchronisation du cahier la
  daterait de nouveau). Le devoir, son sujet et sa date limite restent.
- **Réglage de la direction** : « Correction du devoir » (page *Contrôle continu*) décide si la séance de
  correction est datée sur la feuille ; le contenu du corrigé suit le réglage « Contenu » du devoir maison.
- **Cahier ⇄ feuille** : la date de correction saisie sur la feuille se reporte
  sur le bloc de correction du devoir. Inversement, dater ce bloc dans le
  tableau renseigne la correction du même devoir. Les libellés générés pour
  le devoir donné sont reconnus dans les trois langues
  (`homeworkNumbering.ts`).
- **Direction** : la fiche enseignant montre la date limite, la correction et son corrigé en lecture seule.
- **Compatibilité** : un appareil plus ancien ignore `dueDateISO` et la clé `:correction`, sans les perdre (le blob
  est conservé tel quel côté serveur).

## Vérification des liaisons — octobre 2026

- Les suivis d'élèves (oral et remises) relisent l'identifiant historique si
  l'identifiant annuel n'existe pas encore. Une sauvegarde migre vers la clé
  annuelle et retire l'ancienne ; vider le suivi ne peut donc pas le restaurer
  au prochain affichage. Les autres classes restent inchangées.
- Effacer une date ou supprimer une évaluation traite également son entrée
  manuelle historique, afin de ne pas recréer une annotation de séance.
- Les sous-modales lisent la même configuration réconciliée que la liste.
- Les intitulés générés des activités dans les remarques suivent la langue de
  l'écran. Les titres personnels, les noms d'élèves et les remarques rédigées
  restent intacts. Cette traduction est une projection, sans écriture cloud.
- Sur téléphone, les commandes occupent une ligne distincte, avec des cibles
  de 44 px ; le titre et la date disposent de leur propre espace.
- Le report imprimé des absents utilise l'identité exacte du devoir et les
  dates enregistrées. Il ne recherche plus un chiffre du titre dans une clé
  contenant l'année. Plusieurs listes le même jour sont réunies sans doublon,
  y compris pour une impression partielle.
