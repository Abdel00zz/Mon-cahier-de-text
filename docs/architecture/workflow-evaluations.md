# Contrat tableau ↔ évaluations — « une seule porte par famille »

> Document vivant : il évolue dans le même lot que
> `src/domain/evaluations/evaluationIdentity.ts`,
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
     d'attribution (pastille de la remarque) ou via la carte « Devoir maison »,
     sans bloc dans le cahier ;
   - les **activités de séance** (contrôle des cahiers, remédiation, soutien,
     rattrapage) naissent en tête de ligne dans la remarque de séance via le
     catalogue unique (`pedagogicalActivities.ts`) et la feuille « Contrôle
     continu et activités » les reçoit.
2. **Le tableau garde la capture quotidienne** (contenu, date, remarque) et
   reçoit en retour ce que la feuille matérialise :
   - un bloc daté pour les épreuves écrites et les blocs créés au tableau
     (y compris l'oral créé depuis « Ajouter un contenu » — sans répéter
     d'annotation en double dans sa propre cellule remarque ; un oral
     historique sans bloc conserve son annotation de séance) ;
   - une annotation de séance projetée (non figée dans `item.remark`) pour le
     devoir maison, les activités et les résumés d'état des cahiers.
3. **Deux portes, un seul enregistrement** : toute création traversant deux
   écrans n'écrit qu'une seule fois, dans un seul stockage.
4. **Suppression symétrique (feuille ➔ tableau)** : supprimer une épreuve ou
   une activité depuis la feuille retire son miroir dans le cahier par identité
   unifiée (`evaluationIdentity.ts`) — bloc pour les épreuves et événements
   blocs (y compris l'oral né au tableau), ligne d'activité seule (via
   `removeActivityLines`, sans toucher au texte libre du professeur) pour les
   activités issues de remarques, et mention d'attribution/correction pour un
   devoir maison.

## Nœuds et états

- `lessonsData` (tableau) : blocs datés ou non, sous-sections, items,
  `_tempId` d'attente d'identité.
- `pedagogicalEvents` (évaluations) : événements issus du tableau, porteurs
  de `type` (ex. `evaluation_diagnostic`, `examen_blanc`, `olympiade`,
  `controle_cahiers`), `date` (vide = « à relier », en attente de sa date) et
  `id` stable (`notebook-<_tempId>` pour un bloc né au tableau,
  `remark-<type>-<rowId>` pour une activité de remarque, `<id>` avec
  `_tempId = event-<id>` pour un bloc matérialisé par la feuille).
- `evaluationIdentity.ts` : source unique des préfixes d'identifiants
  (`dev-block-`, `event-`, `notebook-`, `remark-`) et des listes de natures
  liables/supprimables (`LINKABLE_DEVOIR_TYPES`, `EVENT_BLOCK_TYPES`,
  `REMOVABLE_ASSESSMENT_BLOCK`).
- `syncNotebookToEvaluations` projette le tableau vers les évaluations :
  chaque semestre conserve son identité annuelle (`YYYY-YYYY:s1-...` vs
  `YYYY-YYYY:s2-...`) ; une ligne ancienne sans identité stable attend sa date
  pour être reliée.

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
