# La feuille « Contrôle continu et activités » — anatomie, moteur, listes et branchements

Ce document décrit **la feuille d’évaluations d’une classe** : ce que l’œil y
voit, les seize natures qu’elle réunit, la politique qui les gouverne, le moteur
qui relie un devoir au cahier, les listes d’élèves et leurs suivis, les documents
imprimables, et tout ce qui la relie au reste de l’application.

Voir [le tableau](tabel.md) pour la saisie et
[le contrat de capture](docs/architecture/workflow-evaluations.md) pour la
détection. Les autres fenêtres sont décrites dans [les modales de l’éditeur](modale.md).

Vocabulaire employé :

| Terme | Sens exact dans ce document |
|---|---|
| **Feuille** | La fenêtre « Contrôle continu et activités » d’une classe |
| **Nature** | Un type d’élément : six devoirs, dix activités |
| **Devoir** | Une nature qui nourrit le bulletin (contrôle, oral, maison, colle) |
| **Activité** | Une nature qui raconte l’année sans entrer dans la moyenne |
| **Politique** | Ce que la direction décide, nature par nature |
| **Lien** | La mise en regard d’un devoir planifié et de son bloc dans le cahier |
| **Suivi** | L’état consigné élève par élève : oral, cahier, remise |
| **Document** | Le sujet rédigé d’un devoir ou d’une activité, imprimable en A5 |

---

## 1. Ce qu’est la feuille

Une **seule fenêtre**, ouverte depuis le cahier ou depuis le tableau de bord,
avec un contexte de classe **persistant** en tête (nom de la classe, et la
matière seulement si elle est distinctive).

Le professeur saisit les devoirs et activités dans le tableau, via
**Ajouter un contenu** ou la **remarque de séance**. La feuille reçoit
les éléments reconnus et ouvre leur suivi. Cliquer sur le titre d’un devoir
ouvre l’édition de cette entrée. Les autres commandes donnent accès à ses
dates, documents et suivis d’élèves selon sa nature.

Deux propriétés la définissent :

1. **Un corps qui défile**, un seul : pas de colonnes qui défilent séparément,
   pas de sous-onglets horizontaux à chercher.
2. **Une entrée possible** : on peut l’ouvrir directement sur une famille donnée
   (les devoirs, l’oral, les activités) — l’accordéon concerné s’ouvre alors tout
   seul.

---

## 2. L’anatomie de ce que l’œil voit

```
┌─────────────────────────────────────────────────────────┐
│ Titre « Contrôle continu et activités »                 │
│ Classe · matière (si distinctive)                       │
├─────────────────────────────────────────────────────────┤
│ ▸ Devoirs et évaluations            (compte)            │
│   ┌ Contrôle continu                  (3)          ⌄ ┐  │
│   │ nom du devoir        date        actions         │  │
│   │ Contrôle continu 1   05/11   [doc][élèves][✗]    │  │
│   └──────────────────────────────────────────────────┘  │
│   ┌ Devoir maison                     (2)          ⌄ ┐  │
│   │ Devoir maison 1      12/11  [doc][remise][✗]     │  │
│   │ Correction du devoir maison 1   19/11 [corrigé]   │  │
│   └──────────────────────────────────────────────────┘  │
│ ▸ Activités pédagogiques            (compte)            │
│   ┌ Contrôle des cahiers              (1)          ⌄ ┐  │
│   └ ...                                               ┘ │
└─────────────────────────────────────────────────────────┘
```

### 2.1 Les blocs visibles

| Élément | Rôle |
|---|---|
| **En-tête** | Titre unique, classe, matière si elle distingue la classe |
| **Groupe** | Deux familles seulement : « Devoirs et évaluations » et « Activités pédagogiques » |
| **Accordéon par nature** | Une nature = une ligne de panneau, avec son **compte exact** |
| **Glyphe et teinte** | Une nature se reconnaît **d’un coup d’œil** : une teinte et un dessin, jamais une pastille empilée |
| **Ligne de devoir** | Nom, date, puis les actions disponibles **selon la politique** |
| **Deux lignes pour un devoir maison** | L’attribution et la correction : même identité, deux dates |
| **États vides** | Une illustration et un message orientent vers « Ajouter un contenu » ou la remarque du tableau |

### 2.2 Les états d’une ligne, lisibles sans texte

| Repère | Signification |
|---|---|
| **Date grise** | Date reçue du cahier, centrée et en lecture seule |
| **« Pas encore de date »** | L’entrée reçue est visible. La date initiale se renseigne dans le tableau |
| **Date du cahier** | La séance réellement datée est prioritaire |
| **Badge document** | Sujet attaché, manquant, ou non concerné |
| **Compteur d’absents** | Absences consignées, ou vérifiées à zéro |
| **Compteur de non-rendus** | Remises manquantes sur un devoir maison |
| **Note de rendu** | « À rendre aujourd’hui » / « à rendre le … » |

---

## 3. Les seize natures

### 3.1 Les devoirs (six)

| Nature | Ce qu’elle est | Document | Élèves | Retour | Note | Absents |
|---|---|---|---|---|---|---|
| **Contrôle** | L’épreuve écrite en classe | Obligatoire | — | — | — | Oui |
| **Contrôle court** | L’épreuve d’une séance | Obligatoire | — | — | — | Oui |
| **Contrôle global** | L’épreuve longue, copie complète | Obligatoire | — | — | — | Oui |
| **Oral** | La classe prend la parole | Facultatif | Oui | Niveaux | Oui | Oui |
| **Devoir maison** | Le travail à la maison | Obligatoire | Oui | Remise | — | — |
| **Colle** | L’interrogation au tableau (prépa) | Facultatif | Oui | Niveaux | Oui | Oui |

### 3.2 Les activités (dix)

| Nature | Ce qu’elle est | Document | Élèves | Retour |
|---|---|---|---|---|
| **Évaluation diagnostique** | Le point de départ, sur deux jours possibles | Obligatoire | Oui | — |
| **Contrôle des cahiers** | L’état du cahier de chaque élève | **Aucun** | Oui | État du cahier |
| **Correction du contrôle continu** | La séance de correction | Obligatoire | Oui | — |
| **Examen blanc** | L’entraînement à l’examen | Obligatoire | Oui | — |
| **Olympiade** | Le concours interne | Facultatif | Oui | — |
| **Concours** | Le concours externe | Facultatif | Oui | — |
| **Soutien** | L’accompagnement | Facultatif | Oui | — |
| **Remédiation** | La reprise ciblée | Facultatif | Oui | — |
| **Rattrapage** | La reprise ponctuelle | Facultatif | Oui | — |
| **Autre** | Le cas libre | Facultatif | Oui | — |

### 3.3 Ce que la nature sait porter

Une nature **ne peut pas** porter ce qu’elle ne sait pas faire, quoi qu’on
publie :

| Nature | Forme de retour | Note | Absents | Second temps (correction) |
|---|---|---|---|---|
| Devoir maison | Remise (rendu / non rendu) | Non | **Non** | **Oui** |
| Contrôle des cahiers | État du cahier (quatre valeurs) | Non | **Non** | Non |
| Autres devoirs | Niveaux | Oui | Oui | Non |
| Activités | Niveaux | Oui | **Non** | Non |

---

## 4. La politique du contrôle continu

Huit décisions, nature par nature :

| Capacité | Question posée |
|---|---|
| **Transmettre** | Le cahier transmet-il cette nature à la feuille ? |
| **Contrôle continu** | Est-elle traitée comme du contrôle continu (famille « Devoirs ») ou comme une activité ? |
| **Document** | Aucun, facultatif, ou obligatoire |
| **Élèves** | La feuille tient-elle une liste d’élèves ? |
| **Retour** | Un retour par élève est-il attendu ? |
| **Note** | Une note sur 20 est-elle attendue ? |
| **Absents** | Les absences sont-elles consignées ? |
| **Correction** | Le second temps du devoir maison est-il daté sur la feuille ? |

### 4.1 Les trois règles de cohérence

1. **La note suppose le retour**, qui suppose la liste d’élèves. Couper la liste
   coupe tout ce qui en dépend.
2. **Une capacité que la nature ne sait pas porter reste éteinte.**
3. **La correction n’existe que pour un devoir transmis** : sans le devoir, elle
   n’a rien à dater.

Ces règles s’appliquent **à chaque lecture**, quelle que soit la source : une
donnée publiée incohérente est ramenée à un état possible, jamais exécutée telle
quelle.

### 4.2 Les défauts et les écarts

- **La politique absente ne change rien** : une classe sans politique se comporte
  exactement comme avant.
- **Seuls les écarts sont stockés**, ce qui garde le document minuscule et permet
  de faire évoluer les défauts sans réécrire ce que la direction a publié.
- **L’autorité est au serveur** : la politique est résolue à chaque récupération,
  jamais renvoyée par l’appareil.

### 4.3 Une nature inconnue

Une nature qu’une version plus récente connaîtrait se comporte comme « autre » :
elle s’affiche, elle ne casse rien, elle n’invente aucune capacité.

---

## 5. La disponibilité selon la classe

| Nature | Proposée à la saisie dans le tableau si |
|---|---|
| **Colle** | Cycle **prépa** |
| **Contrôle des cahiers** | **Pas** en prépa |
| **Olympiade** | **Pas** en prépa |
| **Examen blanc** | Année d’examen : 3AC, 1re Bac, 2e Bac, prépa — **jamais** 1AC/2AC ni tronc commun |

Deux règles :

1. Le filtre s’applique au choix de la nature à la saisie. Une donnée déjà
   saisie hors de son cycle reste visible et modifiable dans la feuille.
2. **Un niveau non reconnaissable propose** : mieux vaut une carte de trop qu’une
   nature introuvable.

---

## 6. Le moteur devoirs ↔ cahier

C’est le cœur de la feuille : deux saisies indépendantes (le calendrier des
devoirs et le cahier de textes) mises en regard.

### 6.1 L’identité d’un devoir

| Règle | Détail |
|---|---|
| Correspondance de type | Les types du cahier sont ramenés aux six natures de devoir (le « contrôle continu » du cahier est un « contrôle » de la feuille) |
| Identité persistante | Un bloc porte une identité stable, indépendante de sa date et de son ordre |
| Numéro | Le numéro est lu dans le titre (« … 3 »), en chiffres latins ou arabes |
| Ordinal | À défaut d’identité, le **N-ième devoir d’un type** correspond au **N-ième planifié** du même type |
| Redémarrage au semestre 2 | Le numéro recommence : le moteur garde tous les homonymes et choisit d’abord **la date la plus proche** |
| Unicité | Un bloc ne peut pas servir deux devoirs |

### 6.2 Les quatre états d’un lien

| État | Signification | Ce que la feuille propose |
|---|---|---|
| **Fait** | Saisi dans le cahier, **même date** que le calendrier | Rien : tout est aligné |
| **Écart** | Saisi dans le cahier, **autre date** | Lire la date du cahier ; toute modification part du tableau |
| **À venir** | Pas encore dans le cahier, date future (ou bloc créé sans date) | Rien : ce n’est pas un oubli |
| **Manquant** | Pas dans le cahier, date passée | Signalé comme manquant |

**Principe** : le cahier reste la source de vérité ; **le calendrier suit**. On
n’aligne jamais le cahier sur une prévision.

### 6.3 Le cycle d’un devoir maison

| Temps | Où il vit | Date |
|---|---|---|
| **Donné** | Attribution du devoir | Date de séance |
| **Corrigé** | Second temps, même identité | Sa **propre** date |

Deux dates distinctes, parce que deux séances distinctes : déplacer l’une ne
déplace pas l’autre. La feuille ne montre la correction que si elle existe
réellement (date, contenu, document) ou si la politique l’attend.

### 6.4 Le corrigé et sa corbeille

Supprimer une correction retire **sa date et son corrigé**, et le bloc
correspondant dans le cahier : elle ne peut pas revenir par une réconciliation
ultérieure.

---

## 7. Les listes d’élèves

### 7.1 La liste de la classe

| Règle | Détail |
|---|---|
| Plafond | **200 élèves** |
| Saisie | Un nom par ligne, ou collage séparé par virgules, points-virgules, virgule arabe, retours à la ligne |
| Normalisation | Espaces compactés, doublons écartés, ordre conservé |
| Limite | **120 caractères** par nom : au-delà, la liste est refusée avec un message, jamais tronquée en silence |
| Recherche | Tolère les diacritiques arabes, le tatweel, les accents latins et les espaces en trop |
| Identité d’un élève | Normalisation stricte (casse et espaces seulement) : deux graphies proches ne sont **pas** fusionnées comme un même élève |

### 7.2 Une liste, plusieurs usages

La liste de classe alimente : le suivi de l’oral, l’état des cahiers, la remise
des devoirs, les absents d’une évaluation, la feuille d’une activité.

**Règle** : une valeur consignée n’existe que pour un élève **encore présent dans
la liste**. Retirer un nom retire ses états, sans les transposer à un homonyme.

### 7.3 Les suivis par élève

| Suivi | Valeurs | Où il s’écrit |
|---|---|---|
| **Oral** | Maîtrisé · en cours d’acquisition · à soutenir | Ligne de la nature « oral » |
| **État du cahier** | Bon · moyen · à revoir · absent | Ligne « contrôle des cahiers » |
| **Remise** | Rendu · non rendu | Ligne « devoir maison » |
| **Note** | Sur 20 | Ligne de la nature qui la porte |
| **Absents** | Liste de noms | Ligne de l’évaluation |

Trois règles :

1. **Un élève sans état reste « à vérifier »** : on ne préremplit jamais une
   remise que le professeur n’a pas constatée.
2. **L’absence n’est pas un non-rendu** : les deux informations restent séparées,
   pour que la direction puisse les distinguer.
3. **Un rapport couvre toute la liste**, même si l’écran filtre une recherche.

### 7.4 La mémoire des listes

| Situation | Comportement |
|---|---|
| Deux appareils modifient la liste | Les ajouts et retraits de chacun sont conservés, sans écrasement global |
| Une liste descendue du cloud | Elle complète la liste sans copier les observations |
| Un élève quitte la classe | Ses états ne vivent plus ; le nom reste dans l’historique proposé |
| Un devoir garde ses propres noms | La feuille d’une évaluation peut être plus étroite que la classe |

---

## 8. Les documents

| Élément | Règle |
|---|---|
| **Modes** | Aucun · facultatif · obligatoire |
| **Un seul moteur** | La même règle répond partout : feuille, liste d’activités, fiche de la direction |
| **Format** | A5 pour un sujet ou un corrigé, avec en-tête (titre, classe) |
| **Langue** | Celle **du document**, pas celle de l’interface |
| **Aperçu** | Lecture seule, composition identique au papier |
| **Indicateur** | Trois états seulement : attaché, manquant, non concerné |
| **Corrigé** | Un document distinct, sous l’identité `<devoir> :correction` |
| **Prescriptions** | Un contrôle des cahiers n’a **jamais** de document : sa trace vit dans la remarque |

---

## 9. Les fenêtres filles

Une seule fenêtre fille à la fois : en ouvrir une autre libère la précédente.

| Fenêtre | Ce qu’elle fait |
|---|---|
| **Absents** | Consigner les absents d’une évaluation |
| **Oral** | Niveaux, note, recherche d’élève |
| **Remise** | Rendu / non rendu, avec compteur de non-rendus |
| **État des cahiers** | Les quatre états, sur toute la liste |
| **Élèves d’une activité** | Qui participe, avec le même moteur de liste |
| **Sujet / corrigé** | Rédiger, attacher, apercevoir, imprimer |
| **Suppressions** | Devoir, activité, correction — chacune confirmée |

Deux confirmations sont **toujours** demandées : supprimer un devoir, supprimer
une activité. Celle de la correction rappelle qu’elle retire aussi le bloc du
cahier.

---

## 10. Les alertes et la cohérence

| Situation | Ce que voit l’enseignant |
|---|---|
| Deux devoirs de même identité | Revue de conflit **avant** d’enregistrer |
| Deux évaluations qui se chevauchent | Conflit signalé, jamais bloqué d’office |
| Un écart de date | La feuille affiche la date du cahier |
| Un devoir manquant alors que la date est passée | Signalé, sans reproche |
| Un devoir ajouté dans le tableau | L’entrée apparaît dans sa famille après capture |
| Un devoir supprimé | Message de confirmation |

Règle de ton : les alertes **nomment un fait**, jamais un jugement. Un écart de
date se corrige dans le tableau, à la source de la séance.

---

## 11. L’impression

| Ce qui s’imprime | Format | Circuit |
|---|---|---|
| **Le cahier de textes** | A4 | Cahier → fenêtre d’impression (voir `peint.md`) |
| **Un sujet ou un corrigé** | A5 | Document → préparation → impression |
| **La feuille elle-même** | — | Ne s’imprime pas : c’est un poste de travail, pas une pièce à déposer |

Le document imprimé passe les mêmes vérifications que le papier du cahier :
formules composées, polices chargées, images décodées, aucune syntaxe
mathématique brute.

---

## 12. Branchements réciproques

| Paire | Sens 1 | Sens 2 | Garde-fou |
|---|---|---|---|
| **Feuille ↔ cahier** | La capture reçoit les blocs reconnus, même imbriqués | Les dates se modifient dans le tableau et sont reçues en lecture seule | Le lien suit l’identité de l’entrée |
| **Feuille ↔ remarque de séance** | La capture détecte les activités dans le texte daté | Les annotations du suivi se lisent dans la remarque | Retirer la mention à sa source évite une nouvelle détection |
| **Feuille ↔ devoir maison** | L’attribution crée le devoir | Le devoir reçoit document et remises ; ses dates viennent du cahier | Deux temps, une identité |
| **Feuille ↔ liste de classe** | La liste alimente tous les suivis | Un élève retiré perd ses états | Aucune transposition d’homonyme |
| **Feuille ↔ politique** | La politique décide des capacités | Les données existantes restent visibles | Une capacité impossible reste éteinte |
| **Feuille ↔ direction** | Les suivis et documents remontent en lecture | La direction publie la politique et les dates imposées | La politique est autoritaire, jamais renvoyée |
| **Feuille ↔ impression** | Les documents s’impriment en A5 | La mémoire d’impression survit | Ce qui est vu est ce qui sort |
| **Feuille ↔ cloud** | Toute écriture marque le travail à envoyer | Le pull fusionne par identité, pas en bloc | Deux saisies sur deux évaluations ne s’écrasent pas |
| **Feuille ↔ compagnon** | L’absence de liste, un conflit, un devoir manquant sont des constats | Le compagnon propose d’ouvrir la feuille | Il ne modifie rien |

---

## 13. Invariants

1. **Un seul moteur de documents** pour toutes les portes.
2. **Une capacité impossible reste éteinte**, quelle que soit la politique
   publiée.
3. **La note suppose le retour**, qui suppose la liste.
4. **Le tableau saisit, la feuille reçoit.** Le filtre par cycle concerne les
   choix du tableau. La feuille permet le suivi des entrées existantes.
5. **Le cahier est la source de vérité des dates** ; le calendrier suit.
6. **Un bloc ne sert jamais deux devoirs.**
7. **Un devoir maison garde deux dates distinctes.**
8. **Un élève sans état reste à vérifier** : aucune remise préremplie.
9. **Une absence n’est pas un non-rendu.**
10. **Un rapport couvre toute la liste**, filtre ou pas.
11. **Un nom retiré emporte ses états.**
12. **La politique est résolue par le serveur**, jamais poussée par l’appareil.
13. **Une suppression de correction retire aussi le bloc du cahier.**
14. **La feuille ne s’imprime pas** : seuls le cahier et les documents le font.
15. **Aucune alerte ne juge** : elle nomme un fait et propose une action.
