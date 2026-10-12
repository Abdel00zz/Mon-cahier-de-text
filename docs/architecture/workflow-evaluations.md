# Workflow des évaluations — nœuds, états, flux

> **Document vivant.** Toute évolution d’un flux ci-dessous se met à jour dans
> le **même lot** que le code et ses verrous de test
> (`tests/test-evaluations-capture.ts`). Contrat de référence de
> `src/domain/evaluations/` et de l’écran « Contrôle continu et activités ».

## 1. Principe directeur — une seule porte par famille

Deux familles d’objets, une seule porte de création pour chacune, **un seul
enregistrement** par objet — et deux surfaces qui le lisent.

### Famille A — les faits de séance, énoncés dans la REMARQUE

Contrôle des cahiers des élèves, remédiation, soutien, rattrapage et **devoir à
la maison assigné aux élèves** s’écrivent dans la **remarque** de leur séance :
c’est là que le professeur raconte son cours. Ils n’ont **aucune carte** dans
« Ajouter un contenu ». La feuille « Contrôle continu et activités » les reçoit
ensuite : activité datée pour les quatre premiers, évaluation `maison` datée
pour le devoir à la maison (pastilles « donné » et « correction » de la cellule
de séance). Dans le CHOIX de création de la feuille, le contrôle des cahiers est
un type du **contrôle continu** : sa carte vit dans la famille « Devoirs et
évaluations », les trois autres dans « Activités pédagogiques ».

### Famille B — les épreuves, créées depuis « Ajouter un contenu »

Évaluation diagnostique, devoir surveillé, devoir écrit court, devoir écrit
global, évaluation orale, correction du devoir maison et correction du devoir
surveillé se créent depuis la modale « Ajouter un contenu » du tableau. Elles
ne font **pas partie du plan d'un chapitre** — reconnues par leur TYPE
(`dev-block-<id>` / `event-<id>`), jamais par leur position — et se posent
**directement après l'élément cliqué** (`insertAssessmentBlock`,
`dataUtils.ts`), à n'importe quelle profondeur du document. La feuille les
reçoit à son tour — bloc daté `dev-block-<id>` pour les épreuves écrites et
l'oral, activité `event-<id>` pour le diagnostic et la correction du devoir
surveillé, date de correction du devoir pour la correction du devoir maison.

- Le **tableau** (cahier de textes) reste la surface de **capture quotidienne** :
  contenu, date de séance, remarque. C’est lui qui porte le document.
- La **modale « Contrôle continu et activités »** reste la surface de **gestion** :
  dates, documents (sujet/corrigé), absences, remises, observations d’oral,
  séance de correction.
- **Un objet n’existe qu’une fois** : les deux surfaces parlent du même
  enregistrement, jamais d’une copie. La réconciliation apparie par identité
  (`dev-block-<id>`, `event-<id>`), jamais par position ni par date seule.

## 2. Nœuds et identités

| Nœud | Où vit-il | Identité |
| --- | --- | --- |
| Ligne de contenu (séance) | Cahier (`LessonsData`) | `_tempId` ou position (`indices`) |
| Cellule date / remarque | Ligne fusionnée (`dateMerge`) | date de séance `AAAA-MM-JJ` |
| Annotation de séance | Projection — jamais stockée dans le cahier | `event:<id>` (activité), `assessment:<id>` (évaluation), `assessment:<id>:correction` (correction) |
| Bloc « épreuve » | Cahier | `_tempId = dev-block-<assessmentId>` |
| Bloc « devoir maison » | Historique du cahier | masqué à l’affichage, conservé pour compatibilité |
| Bloc « correction du devoir maison » | Cahier | position + numéro déclaré — il DATE le devoir de ce numéro, sans jamais le dupliquer |
| Évaluation manuelle | `manualAssessments[classId]` | `<année>:s<semestre>-<type><num>` |
| Évaluation planifiée | Planning ministériel + surcharges | même forme, millésime inclus |
| Activité pédagogique | `pedagogicalEvents[classId]` | `event-<id>` côté cahier |
| Sujette / corrigé | `assessmentDocuments` | par identité d’évaluation |
| Absences, remises, oral | `assessmentAbsences`, `assessmentParticipants` | par identité d’évaluation |

**Règle d’identité** : jamais de correspondance par date seule. Les blocs
venus de la modale portent leur identité dans `_tempId` ; les blocs saisis au
tableau sont rapprochés par type + numéro (convention ordinale « N-ième devoir
d’un type »), puis par date seulement en dernier recours lors de la
réconciliation initiale.

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

1. **Capture — tableau → modale.** À chaque sauvegarde du cahier,
   `syncNotebookToEvaluations` (`notebookReconciliation.ts`) compare
   l’avant/après : un bloc d’épreuve daté devient une évaluation, un bloc
   d’événement (diagnostic, correction CC, examen blanc, olympiade, concours)
   devient une activité — dès sa création, même avant d’être daté (« + Définir
   une date ») quand la ligne porte un `_tempId` —, une ligne supprimée marque
   l’évaluation supprimée. Idempotent : une seconde synchronisation sans
   changement n’écrit rien. Un bloc « correction du devoir maison » date le
   SECOND temps du devoir (`withHomeworkCorrection`, `homeworkCycle.ts`) :
   devoir de la feuille, devoir du planning officiel daté par le professeur
   (il rejoint alors les entrées de la feuille), ou — aucun devoir de ce
   numéro dans le semestre — devoir transmis à la feuille avec sa correction,
   attribution à compléter. Jamais de doublon ; un devoir supprimé ne renaît
   pas.
2. **Matérialisation — modale → tableau.** À la création ou au changement de
   date dans la modale :
   - épreuves écrites (contrôle continu, court, global) :
     `syncAssessmentDateToNotebook` crée/actualise le bloc daté
     `dev-block-<id>` (`notebookSyncBridge.ts`) ;
   - oral et devoir maison : **aucune écriture en bloc** — l’annotation datée
     est **projetée** par `buildSessionRemarkEntries`
     (`sessionActivityRemarks.ts`) sur la séance du même jour ;
   - activités : `syncEventToNotebook` matérialise le diagnostic, la
     correction CC, l’**examen blanc**, l’**olympiade** et le **concours** en
     blocs datés `event-<id>` ; contrôle des cahiers, remédiation, soutien et
     rattrapage restent des annotations de séance ;
   - suppression symétrique par identité : `removeAssessmentFromNotebook`,
     `removeEventFromNotebook`.
3. **Séance → évaluation (direct).** Les pastilles « Devoir maison N donné »
   et « Correction devoir maison N » de la cellule de séance patchent
   l’évaluation par la MÊME identité que la réconciliation
   (`homeworkGiven`, `homeworkCorrection` — `sessionRemarkChanges.ts`).
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
- **Position = l'élément cliqué** : une épreuve se pose juste après l'élément
  sur lequel le professeur a cliqué (`insertAssessmentBlock`) — jamais en fin
  de cahier — et reste reçue par la feuille, même imbriquée dans une section.
- **Correction transmise, jamais dupliquée** : un bloc de correction du devoir
  maison date le devoir de son numéro (feuille ou planning daté) ; sans devoir
  de ce numéro dans le semestre, il le transmet à la feuille (attribution à
  compléter). Un devoir supprimé de la feuille ne renaît pas.
- **Idempotence** : deux synchronisations identiques → aucune écriture.
- **Pas de doublon** : une identité donnée n’existe qu’une fois, des deux
  côtés (bloc ↔ évaluation).
- **Oral et maison** : jamais de bloc — uniquement des annotations.
- **Épreuves écrites** : bloc daté garanti, mis à jour sur place, retiré par
  identité.
- **Suppression à double sens** : retirer d’un côté retire l’autre par
  identité, jamais par position.
