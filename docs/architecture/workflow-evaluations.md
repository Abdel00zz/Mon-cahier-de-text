# Contrat tableau ↔ évaluations — « une seule porte par famille »

> Document vivant : il évolue dans le même lot que
> `src/domain/evaluations/notebookSyncBridge.ts`,
> `src/features/editor/modals/ContentTypePicker.tsx` et
> `tests/test-evaluations-capture.ts` (la règle de mise à jour pointe ce
> fichier de tests).

## Principes

1. **Une seule porte par famille.** Chaque famille d'évaluation possède un
   unique point de création :
   - les **épreuves écrites et l'oral** (contrôles, olympiades, colles…) se
     créent depuis « Ajouter un contenu » du tableau — le bloc se pose à sa
     date, jamais dans un plan de cours : ils traversent l'année et ne
     dépendent d'aucun chapitre ;
   - le **devoir à la maison** s'énonce dans la REMARQUE de sa séance
     d'attribution (pastille de la remarque), il ne se crée pas ailleurs ;
   - les **activités** (diagnostic, contrôle des cahiers…) naissent au
     tableau et la feuille « Contrôle continu et activités » les reçoit.
2. **Le tableau garde la capture quotidienne** (contenu, date, remarque) et
   reçoit en retour ce que la feuille matérialise : un bloc daté pour les
   épreuves écrites, une annotation de séance pour l'oral, le devoir maison
   et les activités.
3. **Deux portes, un seul enregistrement** : toute création traversant deux
   écrans n'écrit qu'une seule fois, dans un seul stockage.

## Nœuds et états

- `lessonsData` (tableau) : blocs datés ou non, sous-sections, items,
  `_tempId` d'attente d'identité.
- `pedagogicalEvents` (évaluations) : événements issus du tableau, porteurs
  de `type` (ex. `evaluation_diagnostic`, `examen_blanc`, `olympiade`),
  `date` (vide = « à relier », en attente de sa date) et `id` stable.
- `syncNotebookToEvaluations` projette le tableau vers les évaluations :
  une ligne ancienne sans identité stable attend sa date pour être reliée.

## Propriété des champs

- Le **tableau** possède : contenu, date de séance, remarque.
- La **feuille évaluations** possède : type déclaré, date d'épreuve,
  corrections, suivi des rendus.
- Aucun champ n'est éditable des deux côtés : la synchronisation est à sens
  unique (tableau → feuille) pour la création, la feuille renvoie la
  matérialisation (bloc daté, annotation).

## Invariants verrouillés

1. Une seule modale d'ajout : pas de porte parallèle.
2. Les natures proposées respectent le cycle et le niveau
   (`isKindOffered` : colle en prépa, examen blanc aux années d'examen…).
3. Un bloc adopté porte l'identité (`_tempId` → id stable), jamais un
   doublon.
4. Les évaluations du cahier sont transmises avec « + Définir une date » :
   une date vide reste une information à confirmer, jamais une faute.
5. La suppression d'une séance ne supprime jamais silencieusement une
   épreuve déjà datée : elle la signale.
6. Toute évolution du contrat passe par ce document, le pont
   (`notebookSyncBridge.ts`) et le test (`test-evaluations-capture.ts`) dans
   le même lot de modifications.
