# La carte de classe — anatomie, gestes, catégories et paramètres qu’elle ouvre

Ce document décrit **la carte de classe du tableau de bord** : ce que l’œil y
lit, ce que chaque geste fait, comment les cartes se regroupent, comment les
couleurs sont décidées, et surtout ce que chaque catégorie d’identité
(cycle, palier, niveau, filière, groupe, matière) **branche** dans les
paramètres et dans les autres écrans.

Il décrit des écrans et des règles, sans citer de fichier. Pour la création
d’une classe, voir `onboarding.md` ; pour la feuille d’évaluations, voir
`modale-cc.md` ; pour le cahier, voir `tabel.md`.

Vocabulaire employé :

| Terme | Sens exact dans ce document |
|---|---|
| **Carte** | La tuile d’une classe sur le tableau de bord |
| **Identité** | Cycle, palier, niveau, filière, groupe et matière d’une classe |
| **Palier** | Le regroupement de niveaux d’un cycle (tronc commun, 1re Bac, 2e Bac…) |
| **Filière** | La série d’un niveau de lycée (sciences expérimentales, sciences maths…) |
| **Teinte** | La couleur d’une carte, décidée à partir de la matière |
| **Session vivante** | L’état « en cours » d’une classe, calculé sur l’emploi du temps |

---

## 1. L’anatomie de la carte

```
┌─────────────────────────────────────────────┐
│  ▸ 2e Bac Sciences Physiques            ⋮   │   filière + menu
│    3                                        │   filière + groupe gravé
│  ─────────────────────────────────────────  │
│  Physique-Chimie                            │   matière (si utile)
│  ● En cours · 42 min                        │   session vivante
└─────────────────────────────────────────────┘
```

| Zone | Contenu | Règle |
|---|---|---|
| **Feuille** | Fond teinté, bordure fine, ombre discrète | La profondeur à la place de l’aplat |
| **Filière** | Le libellé court de la filière | Jamais le nom complet officiel, qui ne tiendrait pas |
| **Groupe** | Gravure discrète à côté de la filière | Le groupe se lit sans voler la vedette |
| **Palier** | Petit repère (tronc commun, 1re Bac, 2e Bac) | Affiché seulement s’il éclaire |
| **Matière** | Affichée si elle distingue la carte | Omise quand le professeur n’a qu’une matière |
| **Menu** | Trois points, en haut | Ouvre la feuille d’actions |
| **Pied vivant** | Point de vie, « En cours », minutes restantes | Existe seulement pendant une séance |

**Lecture en un coup d’œil** : la carte répond à trois questions — *quelle
classe*, *quelle matière*, *est-ce maintenant*. Le reste (nom officiel complet,
établissement, année) reste disponible ailleurs, sans encombrer.

---

## 2. Les gestes

| Geste | Effet |
|---|---|
| **Appui court** | Ouvre le cahier de la classe |
| **Appui long** (0,55 s) | Ouvre la configuration de la classe |
| **Clic droit** | Équivalent de l’appui long |
| **Mouvement > 12 px** | Annule l’appui long : on fait défiler, on ne configure pas |
| **Entrée / Espace** (clavier) | Équivaut à l’appui court |
| **Menu ⋮** | Ouvre la feuille d’actions (trois actions) |

Deux protections :

1. **Un appui long ne déclenche jamais l’ouverture** du cahier : les deux gestes
   sont exclusifs, jamais cumulés.
2. **Le glissement de défilement l’emporte** : dès que le doigt bouge de plus de
   12 px, l’appui long est abandonné. Sans cela, défiler sur un téléphone
   ouvrirait des paramètres au hasard.

---

## 3. La feuille d’actions

| Action | Teinte | Effet |
|---|---|---|
| **Ouvrir les évaluations** | Bleu | Ouvre la feuille « Contrôle continu et activités » |
| **Modifier** | Violet | Ouvre la configuration de la classe |
| **Supprimer** | Rose (danger) | Demande confirmation, puis supprime |

Règles :

1. **Trois actions au plus** : une carte n’est pas un menu de réglages.
2. **Une teinte par action**, jamais deux : la couleur dit la nature de l’action.
3. **La suppression est la seule en teinte de danger** et n’est proposée que si
   l’appelant l’autorise.
4. **Chaque action se referme** avant d’agir : on ne laisse pas une feuille
   ouverte derrière un changement d’écran.

---

## 4. Le regroupement des cartes

| Groupe | Déclencheur | Libellé |
|---|---|---|
| **En cours** | Une séance est en train de se donner | « En cours » |
| **Aujourd’hui** | Prochaine séance dans la journée | « Aujourd’hui » |
| **Demain** | Prochaine séance le lendemain | « Demain » |
| **À venir** | Prochaine séance plus tard | Le jour daté, puis « Séances à venir » |
| **Autres classes** | Aucune séance connue | « Autres classes » |

| Règle | Détail |
|---|---|
| Ordre | Le groupe « en cours » d’abord, puis par échéance croissante |
| Une classe = une position | Elle suit sa **prochaine** séance, jamais une séance déjà terminée |
| Égalité | L’ordre manuel du professeur tranche, puis l’heure de début |
| Un seul groupe « autres » | Le titre du groupe est alors masqué : un titre unique n’informe pas |
| En cours d’abord | Dans un même groupe, la classe en cours se place devant |

---

## 5. Les couleurs

| Règle | Détail |
|---|---|
| Origine | Une **teinte par matière**, tirée d’une palette départementale |
| Choix enregistré | Une couleur déjà choisie est **toujours conservée**, y compris si deux classes la partagent |
| Couleur libre | Une teinte hors palette reçoit une teinte stable, dispersée par l’angle d’or |
| Dispersion | Une classe sans couleur prend la teinte la plus éloignée des teintes déjà utilisées |
| Déterminisme | Mêmes classes, mêmes couleurs, sur tous les appareils |
| Partage | La **même** table de couleurs sert les cartes et les cellules de l’emploi du temps |
| Hiérarchie | Une seule couleur d’action dans l’interface ; les teintes de carte restent des identités, pas des boutons |

**Pourquoi partager la table ?** Parce qu’une classe bleue sur sa carte et verte
dans la grille oblige le professeur à réapprendre sa propre organisation deux
fois.

---

## 6. Les états d’une carte

| État | Signe visible |
|---|---|
| **Au repos** | Feuille teintée, bordure fine |
| **Survol** | Élévation légère |
| **Appui** | Compression brève et onde discrète au point touché |
| **Session vivante** | Point animé, mention « En cours », minutes restantes |
| **Séance double** | Repère de volume horaire (plus d’une heure) |
| **Chargement** | Squelette à la forme de la carte : aucun saut de mise en page |
| **Vide** | Une carte d’ajout explicite, jamais un espace blanc |

---

## 7. Les dispositions

| Mode | Ce qu’il montre |
|---|---|
| **Triple** | Trois cartes par ligne |
| **Double** | Deux cartes par ligne |
| **Simple** | Une carte par ligne |
| **Liste** | Une ligne compacte par classe |

Le changement se fait depuis la barre d’actions du tableau de bord, par
rotation : chaque appui passe au mode suivant. Le choix est mémorisé sur
l’appareil, et une valeur inconnue relue du stockage est ignorée.

---

## 8. Les catégories d’identité, et ce qu’elles branchent

C’est le cœur du document : une classe n’est pas un simple nom, c’est un
**faisceau de décisions**.

### 8.1 Le cycle

| Valeurs | Ce qu’il décide |
|---|---|
| Collège | Étiquettes d’échéances officielles, disponibilité du contrôle des cahiers et de l’olympiade |
| Lycée qualifiant | Programmes officiels, examens régionaux et nationaux, examen blanc |
| Classes préparatoires | La colle, l’examen blanc de type concours blanc, et **l’exclusion** du contrôle des cahiers et de l’olympiade |

**Ne décide pas** : la matière, le nom affiché, la couleur.

### 8.2 Le palier

| Valeurs | Ce qu’il décide |
|---|---|
| Collège | Un seul palier : les trois niveaux |
| Tronc commun · 1re Bac · 2e Bac | Le regroupement des niveaux proposés |
| 1re année CPGE · 2e année CPGE | Le regroupement des niveaux de prépa |

Le palier est un **raccourci de choix**, pas une donnée pédagogique : il n’est pas
stocké comme identité, il sert à proposer des listes courtes.

### 8.3 Le niveau

| Ce qu’il décide | Détail |
|---|---|
| Programme officiel | Le plan annuel, ses chapitres et ses heures |
| Fin des cours | Le dernier jour d’enseignement des échéances officielles |
| Examen blanc | Proposé seulement en année d’examen (3AC, 1re Bac, 2e Bac, prépa) |
| Contenus proposés | Le programme prêt à charger correspondant |
| Progression | L’appariement avec les chapitres réellement saisis |

### 8.4 La filière

| Ce qu’il décide | Détail |
|---|---|
| Programme officiel | Certains plans existent par filière |
| Matières attendues | Une filière restreint les matières plausibles |
| Nom affiché | La filière fait partie du nom, jamais une décoration |

**Règle** : la filière est **transmise séparément** du nom affiché. Aucun circuit
ne la re-devine en analysant le texte du nom ; c’est ce qui permet de renommer
une classe sans perdre son programme.

### 8.5 Le groupe

| Ce qu’il décide | Détail |
|---|---|
| Unicité | Deux classes ne peuvent pas partager le même niveau et le même groupe |
| Affichage | Le groupe est gravé à côté de la filière |
| Effectif | Un groupe a sa propre liste d’élèves |
| Emploi du temps | Deux groupes d’un même niveau peuvent avoir des créneaux différents |

### 8.6 La matière

| Ce qu’il décide | Détail |
|---|---|
| Contenus proposés | Les types de contenu autorisés pour cette matière |
| Programmes prêts | Le dossier de contenus correspondant |
| Teinte de carte | La palette départementale |
| Affichage | La matière n’est montrée que si elle distingue la carte |

### 8.7 Le tableau des branchements

| Identité | Paramètres de la classe | Cahier | Évaluations | Emploi du temps | Impression | Direction |
|---|---|---|---|---|---|---|
| **Cycle** | — | — | Disponibilité des natures | — | — | Étiquettes de niveau |
| **Niveau** | Programme | Chapitres proposés | Examen blanc, échéances | — | En-tête | Fin des cours |
| **Filière** | Programme | Chapitres proposés | — | — | En-tête | Avancement |
| **Groupe** | Liste d’élèves | — | Listes et suivis | Créneaux distincts | En-tête | Identité |
| **Matière** | Types de contenu | Contenus proposés | — | Couleur des cellules | En-tête | Matières déclarées |
| **Couleur** | — | — | — | Cellules | — | — |
| **Emploi du temps** | Onglet Horaires | Alertes de séance | — | Grille | — | — |
| **Liste d’élèves** | Onglet Élèves | — | Tous les suivis | — | Ligne d’absences | Effectifs |

---

## 9. La configuration de la classe

Le geste de configuration ouvre la fiche de la classe, qui n’est pas un écran de
réglages généraux :

| Ce qui s’y règle | Effet |
|---|---|
| **Identité** | Nom, matière, cycle, niveau, filière, groupe — avec les mêmes listes que la création |
| **Couleur** | Une teinte choisie est conservée telle quelle |
| **Liste d’élèves** | Les noms, collés ou saisis, avec un plafond et un refus explicite |
| **Emploi du temps** | Les créneaux de **cette** classe |
| **Programme** | Le plan officiel associé, et les appariements de chapitres |

**Ce que la fiche ne fait pas** : elle ne change pas les préférences générales
(thème, langue, notifications) — celles-ci appartiennent aux paramètres de
l’application.

---

## 10. La suppression d’une classe

| Étape | Règle |
|---|---|
| Déclencheur | Action de danger, jamais un glissement |
| Confirmation | Toujours demandée, avec le nom de la classe |
| Effet | Le cahier, le journal d’édition et la mémoire d’impression sont effacés |
| Mémoire | Une **pierre tombale** empêche la résurrection depuis un autre appareil |
| Créneaux | Ceux de cette classe sont ignorés, jamais réattribués à une autre |
| Ce qui reste | L’historique d’archives de l’année, s’il existe |

---

## 11. Ce qui relie les cartes au reste

| Élément de la carte | Consommé par |
|---|---|
| Nom et identité | Cahier, impression, direction, notifications |
| Couleur | Autres cartes, cellules d’emploi du temps |
| Prochaine séance | Regroupement, alertes, « en cours » |
| Liste d’élèves | Évaluations, absences, direction |
| Matière | Contenus, teinte, libellés |

---

## 12. Invariants

1. **Une carte répond à trois questions** : quelle classe, quelle matière,
   est-ce maintenant.
2. **Appui court = ouvrir ; appui long = configurer** ; jamais les deux.
3. **Un mouvement de 12 px annule l’appui long.**
4. **Trois actions au plus** dans la feuille, chacune avec sa teinte.
5. **Une classe suit sa prochaine séance**, jamais une séance terminée.
6. **Une couleur choisie est toujours conservée.**
7. **La même table de couleurs sert les cartes et l’emploi du temps.**
8. **La filière est transmise, jamais re-devinée** depuis le nom.
9. **Deux classes ne partagent pas le même niveau et le même groupe.**
10. **La fiche de classe ne change pas les préférences générales.**
11. **Une suppression laisse une pierre tombale** et n’oublie aucun créneau
    orphelin.
12. **Aucun espace vide** : une carte d’ajout occupe toujours la place.
