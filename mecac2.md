# Le vice-versa tableau ↔ feuille « Contrôle continu et activités »

Ce document décrit **la mécanique interne qui relie le tableau du cahier et la
feuille d’évaluations** : qui possède chaque donnée, dans quel sens elle circule,
ce qui se matérialise dans le cahier et ce qui reste dans la feuille, comment une
suppression devient durable, et pourquoi deux saisies ne s’écrasent pas.

Il décrit des circuits et des règles, sans citer de fichier. Pour la feuille
elle-même (anatomie, politique, listes), voir `modale-cc.md` ; pour les gestes du
tableau, voir `tabel.md` ; pour les formes de données, voir `json.md`.

Vocabulaire employé :

| Terme | Sens exact dans ce document |
|---|---|
| **Cahier** | Le tableau du professeur : l’arbre des chapitres, sections et contenus |
| **Feuille** | « Contrôle continu et activités » : la feuille d’évaluations d’une classe |
| **Propriétaire** | Le seul endroit où une donnée est écrite ; partout ailleurs, elle est reflétée |
| **Réconciliation** | Le calcul qui met le cahier et la feuille d’accord, dans un sens |
| **Pont** | L’écriture inverse : une décision de la feuille qui se matérialise dans le cahier |
| **Bloc matérialisé** | Un bloc du cahier créé pour représenter une évaluation de la feuille |
| **Identité stable** | Un identifiant de contenu qui ne dépend ni de la date ni de l’ordre |
| **Pierre tombale** | La trace d’une suppression, qui empêche un retour |
| **Transmission** | Le fait qu’une nature soit autorisée à passer d’un monde à l’autre |

---

## 1. Le principe : un propriétaire par donnée

Le cahier et la feuille ne se dupliquent pas : **chacun possède ce que l’autre ne
sait pas décider**.

| Donnée | Propriétaire | Reflétée ailleurs ? |
|---|---|---|
| Contenu du cours, chapitres, sections | **Cahier** | Oui (lecture seule dans la feuille) |
| Date d’une séance de cours | **Cahier** | Oui |
| Remarque d’une séance | **Cahier** (la feuille y ajoute des pastilles d’affichage) | Oui |
| Attribution d’un devoir maison | **Remarque de séance** (cahier) | Oui : elle crée le devoir dans la feuille |
| Date limite de rendu, date de correction | **Feuille** | Oui : la correction devient un bloc du cahier |
| Politique du contrôle continu | **Serveur → feuille** | Non (autoritaire) |
| Sujet, corrigé, documents | **Feuille** | Non (le cahier ne les copie pas) |
| Listes d’élèves, suivis, notes, absences | **Feuille** | Non |
| Liste de classe (roster) | **Réglages de la classe** | Lue par la feuille |
| Suppressions | **Les deux** (chacun sa pierre tombale) | Oui, pour empêcher le retour |

**Règle d’or** : une donnée n’est écrite **qu’à un seul endroit**, et l’autre
monde n’en garde qu’une projection. Deux copies écrivables sont la cause
habituelle des valeurs qui « reviennent » après suppression.

---

## 2. La carte des canaux

### 2.1 Cahier → feuille

| Ce qui part | Ce qui se passe dans la feuille |
|---|---|
| Un bloc d’épreuve écrite daté | Une évaluation datée apparaît (ou sa date se met à jour) |
| Un bloc d’activité daté (diagnostic, examen blanc, olympiade…) | Une activité apparaît |
| Une remarque contenant une activité | Une activité est **détectée** et créée, sans doublon |
| Une remarque contenant « devoir maison N » | Le devoir N est créé ou rattaché |
| Un bloc « Correction du devoir maison N » daté | La **date de correction** du devoir N est renseignée |
| La disparition d’un bloc | L’évaluation correspondante est retirée (ou marquée supprimée) |
| Un cahier vide de dates | Rien n’est déduit : l’absence de ligne n’est pas une suppression |

### 2.2 Feuille → cahier

| Ce qui part | Ce qui se passe dans le cahier |
|---|---|
| La date d’une épreuve écrite | Un **bloc daté** est créé ou déplacé |
| La date d’une activité à bloc | Un bloc d’activité est créé ou déplacé |
| La date de correction d’un devoir maison | Un bloc « Correction du devoir maison N » est créé ou déplacé |
| La suppression d’une épreuve | Le bloc correspondant est retiré |
| La suppression d’une activité | Le bloc correspondant est retiré |
| La suppression d’une correction | Le bloc **et** la ligne de remarque sont retirés |
| Les remises, notes, absents, documents | **Rien** : le cahier ne les porte pas |

### 2.3 Ce qui ne traverse jamais

| Donnée | Pourquoi |
|---|---|
| Un oral, un devoir maison (comme **bloc**) | Ils vivent dans la **remarque** de leur séance, jamais comme un bloc de cours |
| Les notes, absences, remises | Ce sont des données de la feuille |
| Les sujets et corrigés | Le cahier n’en garde aucune copie |
| La politique | Elle est autoritaire et ne remonte jamais d’un appareil |

**Conséquence pratique** : retirer une évaluation de la feuille ne doit pas
effacer un chapitre ; retirer un chapitre ne doit pas effacer une note.

---

## 3. La réconciliation, sens cahier → feuille

### 3.1 Le principe de fonctionnement

| Étape | Ce qui se décide |
|---|---|
| 1. Extraction | On lit **tous** les devoirs et activités présents dans le cahier |
| 2. Filtre | Une nature non transmise est ignorée **des deux côtés** (avant et après) : elle ne crée rien et ne fait rien disparaître |
| 3. Identité | Chaque entrée reçoit une identité stable : identité persistante, sinon devoir planifié reconnu, sinon devoir manuel unique, sinon identité calculée (année, semestre, type, numéro) |
| 4. Appariement | On rapproche l’**avant** et l’**après** par identité persistante, sinon par type + titre |
| 5. Application | La date, le type, le numéro et la date de correction sont écrits dans la feuille |
| 6. Disparition | Une entrée présente avant et absente après est **retirée** — mais seulement si l’on connaît l’état antérieur |
| 7. Activités | Les remarques sont relues pour détecter les activités non déclarées |
| 8. Écriture | Un **seul** correctif de configuration est produit, ou aucun |

### 3.2 Les garde-fous de la réconciliation

| Garde-fou | Ce qu’il empêche |
|---|---|
| **Pas d’état antérieur, pas de suppression** | Un chargement partiel ne doit pas vider la feuille |
| **Double identité** | Deux blocs portant la même identité : aucun n’écrase l’autre en silence |
| **Devoir maison inchangé** | Une ancienne ligne masquée ne doit pas écraser la date choisie dans l’activité |
| **Appariement ambigu** | S’il y a deux candidats, on ne devine pas : on ne touche pas |
| **Nature non transmise** | Ni création, ni suppression : les éléments déjà transmis restent gérables |
| **Une seule écriture** | Le correctif est calculé en entier puis appliqué, jamais en plusieurs fois |
| **Aucun changement, aucune écriture** | Une réconciliation sans différence ne marque pas le travail à envoyer |

### 3.3 La détection dans les remarques

| Activité | Déclencheur |
|---|---|
| Contrôle des cahiers | Mention dans la remarque |
| Remédiation | Mention ou synonyme |
| Soutien | Mention ou synonyme |
| Rattrapage | Mention ou synonyme |

Règles de détection :

1. **La date de la séance est obligatoire** : une remarque sans date lisible ne
   crée rien.
2. **Un intervalle est respecté** : la remarque peut couvrir deux jours.
3. **L’identité est dérivée de la ligne** : la même remarque ne crée pas une
   seconde activité à chaque enregistrement.
4. **Un bloc explicite gagne toujours** : si la même activité existe déjà comme
   bloc le même jour, la détection se tait — pas de doublon.
5. **Une activité déjà transmise garde son identité** même si la ligne change
   d’identifiant technique : on retrouve l’ancienne avant d’en créer une neuve.
6. **Une nature non transmise n’est pas détectée** : inutile de créer ce que la
   politique refuse.

---

## 4. Les ponts, sens feuille → cahier

### 4.1 Ce qui matérialise un bloc, et ce qui ne le fait jamais

| Nature | Matérialisation dans le cahier |
|---|---|
| Contrôle, contrôle court, contrôle global | **Bloc daté** d’épreuve |
| Colle | **Bloc daté** |
| Devoir maison | **Jamais de bloc** : la remarque de séance |
| Oral | **Jamais de bloc** : la remarque de séance |
| Diagnostic, correction de contrôle, examen blanc, olympiade | **Bloc daté** |
| Concours, soutien, remédiation, rattrapage, autre | **Aucun bloc** (activité de séance) |
| Contrôle des cahiers | **Aucun bloc** : la trace est la pastille de remarque |

**Pourquoi cette asymétrie ?** Parce que le cahier est le document du **cours**.
Un devoir maison ou un oral ne sont pas des séances de cours ; ils s’annotent sur
la séance où ils ont été annoncés. Une épreuve écrite, elle, occupe bien une
séance : elle mérite sa ligne datée.

### 4.2 Le placement chronologique

| Règle | Détail |
|---|---|
| Blocs antérieurs | Tout bloc daté avant la cible reste avant |
| Blocs postérieurs | Tout bloc daté après la cible passe après |
| Diagnostic en début d’année | S’il n’existe aucun cours antérieur, il se pose **en tête** |
| Sans date | Le diagnostic va en tête, les autres à la fin |
| Bloc déjà présent | Il est **retiré puis réinséré** : jamais dupliqué |
| Contenu existant | Si le nouveau bloc est plus succinct, ses sections et items existants sont **conservés** |
| Bloc imbriqué | Il garde son chapitre et son contenu : un devoir annoncé dans une section reste dans sa section |

### 4.3 Le format de la cellule date

Une évaluation sur deux jours ne s’écrit **jamais** « du … au … » :

| Cas | Ce qui s’écrit |
|---|---|
| Un seul jour | La date |
| Deux jours | Les deux dates reliées par le connecteur de la langue (« et », « و ») |
| Plus de deux séances | Les dates listées, reliées par le même connecteur |
| Langue | Celle du cahier, jamais celle de l’interface |

La remarque reste réservée aux notes pédagogiques : la date ne contamine jamais
la colonne de remarque.

### 4.4 Les suppressions durables

| Suppression | Ce qui est retiré | Ce qui empêche le retour |
|---|---|---|
| Une épreuve | Son bloc daté | Une **pierre tombale** d’évaluation, et la suppression du bloc |
| Une activité à bloc | Son bloc | Une pierre tombale, et le bloc retiré |
| Une correction | Sa date, son corrigé, **le bloc** et la **ligne de remarque** | La ligne de remarque est retirée, sinon la réconciliation la redaterait au prochain enregistrement |
| Un devoir maison | Le suivi de remises est conservé | Le devoir reste identifiable ; seule son attribution disparaît |

**Pourquoi retirer aussi la ligne de remarque d’une correction ?** Parce que la
réconciliation lit les remarques : si la phrase restait, la correction
réapparaîtrait à la première sauvegarde. La corbeille de la feuille n’aurait
alors aucun effet durable.

---

## 5. Le devoir maison, cas le plus riche

### 5.1 La numérotation

| Règle | Détail |
|---|---|
| Portée | Le numéro est **global au cahier et à la configuration**, pas à un chapitre |
| Sources scannées | Remarques, blocs de devoir, corrections, devoirs manuels, dates planifiées |
| Chiffres | Latins **et** arabes, normalisés avant lecture |
| Numéro déjà présent | Si la remarque contient déjà un devoir, **son numéro est conservé** |
| Sinon | Le numéro suivant est le plus grand connu + 1 |
| Écriture | La mention est **remplacée**, jamais doublée ; si absente, elle est insérée en tête de remarque |
| Distinction | Une ligne de **correction** n’est jamais remplacée par la mention « donné » |

### 5.2 Le cycle : deux séances, une identité

| Temps | Où il vit | Ce qui le date |
|---|---|---|
| **Donné** | La remarque de la séance | La date de la séance |
| **Corrigé** | Un bloc dédié + la date de correction de la feuille | La date de correction |

Deux garde-fous :

1. **Une correction suit son contenu**, jamais une séance voisine : la même date
   ne suffit pas à rattacher une correction au mauvais devoir.
2. **Un devoir daté par le professeur** (planning officiel) ou **jamais saisi**
   est transmis à la feuille au lieu d’être deviné.

### 5.3 La consolidation d’un ancien cahier

Un cahier plus ancien peut contenir des dates sans contenu réel. Une passe de
consolidation :

| Action | Règle |
|---|---|
| Créer le bloc de correction manquant | Seulement s’il n’existe pas déjà |
| Créer le bloc d’une colle datée | Seulement si aucun bloc du même numéro n’existe |
| Respecter la date réelle | Une date établie dans le contenu gagne sur une copie périmée des réglages |
| Nettoyer une ancienne étiquette | Uniquement l’étiquette **générée** par l’ancienne pastille, après qu’un vrai bloc existe |
| Ne jamais toucher une note libre | Une phrase écrite par le professeur reste intacte |

---

## 6. Les activités et la pastille de remarque

### 6.1 Deux origines, un affichage

| Origine | Ce qui est stocké | Ce qui est affiché |
|---|---|---|
| **Bloc explicite** dans le cahier | Un bloc daté | Le bloc lui-même |
| **Activité de la feuille** | Réglages de la classe | Une **pastille** ajoutée à l’affichage de la remarque |

Les activités **ne sont jamais insérées** dans l’arbre du cahier : elles restent
dans les réglages, et seule une date les relie à une séance. C’est ce qui évite
qu’un contrôle des cahiers devienne un chapitre.

### 6.2 La pastille est modifiable sans réécrire l’activité

| Action | Effet |
|---|---|
| Renommer le texte affiché | Une **surcharge** locale du texte, par classe |
| Masquer la pastille | Une surcharge de visibilité |
| Rétablir | Retour au texte d’origine |

**Règle** : la pastille ne modifie **jamais** l’activité elle-même. Masquer une
pastille ne supprime pas le contrôle des cahiers ; supprimer l’activité ne laisse
pas une pastille orpheline.

### 6.3 Le contrôle des cahiers, cas particulier

| Propriété | Règle |
|---|---|
| Élèves cités | La cellule de remarque n’affiche **pas** les noms : seulement un résumé compact des états |
| Nombre de noms cités | Trois au maximum avant le résumé « +N » |
| Sans élève consigné | L’activité compte quand même : la séance a bien été consacrée à la vérification |
| Intervalle | Une activité sur deux jours couvre les deux dates, dans une limite de 31 jours |
| Deux activités le même jour | La **première** posée gagne : elles ne se remplacent pas |

---

## 7. Ce qui reste attaché malgré les changements

| Changement | Ce qui survit |
|---|---|
| Une évaluation change de date | Son document, sa liste d’élèves, ses absences, ses notes |
| Une évaluation change de numéro | Son identité persistante |
| Un bloc est déplacé dans le cahier | Sa date de correction, ses remises |
| Une correction est déplacée | Son corrigé et son propriétaire |
| Un élève quitte la liste | Le nom reste dans l’historique proposé ; ses états ne sont plus lus |
| Une activité devient masquée | Son document et ses élèves, intacts |

**Pourquoi ?** Parce que l’identité d’une évaluation **ne dépend ni de sa date ni
de son ordre**. Renuméroter ou déplacer ne doit jamais faire perdre une note.

---

## 8. Le cas de l’alignement

| Situation | Ce que fait le moteur |
|---|---|
| Cahier et feuille donnent la même date | Rien : tout est aligné |
| Le cahier porte une autre date | Le statut devient « écart » ; le professeur peut **aligner la feuille sur son cahier** |
| Le cahier n’a pas encore le bloc | Statut « à venir » si la date est future, « manquant » si elle est passée |
| Un même bloc pourrait servir deux devoirs | Il n’est **jamais** réutilisé |

**Règle d’autorité** : le cahier étant la source de vérité du professeur, c’est
la feuille qui s’aligne — jamais l’inverse. On ne réécrit pas une date réelle pour
faire plaisir à une prévision.

---

## 9. Les garde-fous internes

| Garde-fou | Détail |
|---|---|
| **Scans bornés** | Les numéros connus sont bornés par les listes existantes : pas de boucle sur tout le cahier à chaque frappe |
| **Relecture d’instantané** | La réconciliation compare **avant** et **après** un même instantané, jamais deux lectures du stockage |
| **Idempotence** | Rejouer la réconciliation ne produit aucune seconde écriture |
| **Aucun devinage** | Appariement ambigu ⇒ on ne touche pas |
| **Une écriture par cycle** | Un seul correctif, donc une seule annulation et un seul envoi |
| **Politique respectée** | Une nature non transmise est ignorée des deux côtés |
| **Suppression conditionnelle** | Sans état antérieur, aucune suppression |
| **Pierre tombale** | Une suppression se souvient d’elle-même |

---

## 10. Le cycle complet, en une image

```
        ┌──────────── CAHIER (propriétaire du cours) ─────────────┐
        │ chapitres · séances datées · remarques · corrections    │
        └───────▲─────────────────────────┬──────────────────────┘
                │                         │  réconciliation (lecture)
      ponts     │                         ▼
 (écriture d’un │            ┌──────── FEUILLE (propriétaire du suivi) ────────┐
  bloc daté,    │            │ devoirs · activités · dates · documents          │
  retrait       │            │ listes · suivis · notes · absents · politique    │
  durable)      │            └──────────────────────┬──────────────────────────┘
                │                                   │
                └───────────────────────────────────┘
                     pierres tombales partagées
```

| Sens | Déclencheur | Effet visible |
|---|---|---|
| Cahier → feuille | Enregistrement du cahier, ouverture de la feuille | Une évaluation apparaît, se date ou se retire |
| Feuille → cahier | Date, correction ou suppression décidée dans la feuille | Un bloc apparaît, se déplace ou disparaît ; une ligne de remarque est retirée |
| Aucun sens | Notes, absents, remises, documents, politique | Rien ne bouge dans le cahier |

---

## 11. Branchements

| Circuit | Dépend de | Déclenche |
|---|---|---|
| Réconciliation | Cahier, politique, état antérieur, archives d’activités | Correctif de dates, de devoirs, d’activités, de suppressions |
| Ponts | Décisions de la feuille | Blocs datés, placements chronologiques, retraits |
| Pastilles | Réglages d’activités, surcharges locales | Affichage de la remarque, sans écriture dans l’arbre |
| Devoir maison | Remarques, blocs, corrections, devoirs manuels | Numéro, devoir créé, cycle donné/corrigé |
| Alignement | Cahier + planning | Statut de lien, action « aligner » |
| Suppressions | Pierres tombales des deux mondes | Retrait durable, aucun retour |
| Impression | Cahier | Numéros gelés, signatures (voir `peint.md`) |
| Cloud | Correctif produit | Une seule écriture, un seul envoi |
| Direction | Feuille | Suivis et documents en lecture |
| Compagnon | Constats croisés | Tâches « conflit », « devoir manquant », « liste incomplète » |

---

## 12. Invariants

1. **Un propriétaire par donnée** ; partout ailleurs, une projection en lecture.
2. **Le cahier est la source de vérité du professeur** ; la feuille s’aligne.
3. **Un oral et un devoir maison ne créent jamais de bloc** : ils vivent dans la
   remarque.
4. **Une épreuve écrite datée crée un bloc**, placé chronologiquement, jamais
   dupliqué.
5. **Sans état antérieur, aucune suppression.**
6. **Un appariement ambigu ne touche à rien.**
7. **Une identité stable ne dépend ni de la date ni de l’ordre.**
8. **Une suppression de correction retire aussi la ligne de remarque**, sinon
   elle revient.
9. **Une pastille modifiée ne modifie pas l’activité** ; une activité supprimée
   ne laisse pas de pastille orpheline.
10. **Une nature non transmise est ignorée des deux côtés.**
11. **Un numéro de devoir maison est global** et n’est jamais recalculé à 1.
12. **La date ne s’écrit jamais « du … au … »** : elle utilise le connecteur de
    la langue.
13. **Une réconciliation sans différence n’écrit rien.**
14. **Une seule écriture par cycle**, donc une seule annulation.
