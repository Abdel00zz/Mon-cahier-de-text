# L’onboarding — quatre étapes, une reprise intelligente et rien d’obligatoire en trop

Ce document décrit **le parcours d’installation dans l’application** : les quatre
étapes, ce qui est obligatoire et ce qui ne l’est pas, la reprise à l’endroit
utile, les règles de chaque écran, la fin du parcours, et la liste de premiers
pas qui prend le relais.

Il décrit des écrans et des règles, sans citer de fichier. Pour l’écran public
d’entrée, voir `landing.md` ; pour la carte de classe, voir `carte-classe.md` ;
pour la connexion, voir `login.md`.

Vocabulaire employé :

| Terme | Sens exact dans ce document |
|---|---|
| **Onboarding** | Les quatre étapes de configuration, après connexion |
| **Étape utile** | L’étape où il reste réellement quelque chose à décider |
| **Reprise** | Le calcul de l’étape d’ouverture |
| **Fin de parcours** | L’action qui marque l’accueil comme terminé, sur le compte |
| **Premiers pas** | La liste de contrôle discrète qui remplace le parcours une fois fini |

---

## 1. Le principe : quatre décisions, deux obligatoires

| # | Étape | Question posée | Obligatoire |
|---|---|---|---|
| 1 | **Cycles** | Quels cycles enseignez-vous ? | **Oui** |
| 2 | **Matières** | Quelles matières enseignez-vous ? | **Oui** |
| 3 | **Classes** | Quelle est votre première classe ? | Non |
| 4 | **Horaires** | Quand enseignez-vous ? | Non |

Deux étapes décident de **qui parle** (cycles, matières) ; les deux suivantes
décident de **ce qui existe** (classe, emploi du temps). Un professeur peut
terminer sans aucune classe : l’application reste utilisable, la carte de classe
s’ajoute plus tard.

**Pourquoi cet ordre ?** Parce que les niveaux et les matières d’une classe
dépendent du profil : demander la classe d’abord obligerait à reposer les mêmes
questions ensuite.

---

## 2. La coquille commune

| Élément | Règle |
|---|---|
| En-tête | Marque, puis deux pastilles : **langue** (FR / العربية) et **thème** (clair, nuit, système) |
| Progression | Le nom des étapes, avec l’étape courante marquée |
| Illustration | Une par étape, sans texte : rien à traduire |
| Titre | Le nom de l’étape, focalisé à l’ouverture (lecture d’écran) |
| Pied | Précédent · Suivant (ou Terminer) · un lien discret pour ignorer |
| Animation | La pastille de langue coulisse d’un état à l’autre ; les cartes se compressent à l’appui |

Trois règles de comportement :

1. **Le focus va au titre** à chaque changement d’étape : le lecteur d’écran
   annonce la nouvelle étape au lieu de rester au bouton « Suivant ».
2. **La langue et le thème ne bloquent jamais** l’entrée : ils se changent à tout
   moment, y compris pendant le parcours.
3. **Deux clics rapides ne sautent pas une étape** : l’avancement vérifie la
   validité de l’étape courante au moment du clic, pas au moment du rendu.

---

## 3. Étape 1 — les cycles

| Élément | Règle |
|---|---|
| Choix | Trois cartes : collège, lycée qualifiant, classes préparatoires |
| Sélection | **Multiple** : un professeur peut couvrir deux cycles |
| Affichage | Chaque carte porte un symbole, un libellé et une description courte |
| Détails personnels | Repliés par défaut : nom complet, établissement — **facultatifs** |
| Validation | Au moins un cycle |

**Détail important** : le choix des cycles **ne filtre pas** les classes qu’on
pourra créer. Il **ordonne et pré-sélectionne**. Un professeur qui n’a coché que
collège et lycée doit pouvoir créer une classe préparatoire sans repasser par les
réglages — l’inverse a été un défaut réel, corrigé.

---

## 4. Étape 2 — les matières

| Élément | Règle |
|---|---|
| Choix | Liste des matières réellement enseignables |
| Sélection | Multiple |
| Affichage initial | **Huit matières** au plus, plus toutes celles déjà cochées |
| Recherche | Insensible aux accents et aux diacritiques arabes |
| Extension | Un bouton révèle la liste entière |
| Validation | Au moins une matière |
| Effet | La liste restreint les contenus proposés et les classes de l’étape suivante |

**Pourquoi huit ?** Parce qu’une liste de trente matières décourage ; huit
couvrent l’immense majorité des usages, et la recherche est là pour le reste.

---

## 5. Étape 3 — la première classe

| Élément | Règle |
|---|---|
| Cycle | Celui de l’étape 1 s’il est unique ; sinon proposé en premier |
| Palier | Tronc commun, 1re Bac, 2e Bac (ou 1re/2e année de prépa) ; absent au collège |
| Niveau | Liste du palier choisi, avec une valeur par défaut sensée |
| Groupe | Numéro de 1 à 99, une valeur libre proposée |
| Matière | Restreinte aux matières de l’étape 2 |
| Aperçu | Le nom final, tel qu’il sera écrit |
| Création | Un bouton ; la classe apparaît immédiatement dans le parcours |
| Enchaînement | Après création, l’étape suivante s’ouvre d’elle-même |
| Retrait | Une classe créée peut être retirée, avec un message de confirmation |

Trois règles :

1. **Aucun doublon silencieux** : un groupe déjà utilisé pour ce niveau est
   signalé.
2. **Le nom est composé**, jamais saisi librement : niveau + groupe, dans la
   langue de l’interface.
3. **On peut passer** cette étape : le bouton d’avancement reste actif même sans
   classe.

---

## 6. Étape 4 — l’emploi du temps

| Élément | Règle |
|---|---|
| Contenu | La grille hebdomadaire, identique à celle des paramètres |
| Classes | Celles créées à l’étape 3, ou toutes celles existantes |
| Création à la volée | Une cellule peut créer une classe et la poser aussitôt sur le créneau |
| Couleurs | Une teinte distincte par classe, stable et partagée avec les cartes |
| Matière affichée | Seulement si le professeur couvre plusieurs matières |
| Validation | Aucune : l’étape est facultative |
| Sortie | « Terminer » ou « Terminer sans emploi du temps » |

**Pourquoi facultatif ?** Parce qu’un emploi du temps partiel est pire qu’un
emploi du temps absent : les alertes de séance et le calcul de retard reposent
dessus. Mieux vaut ne rien déclarer que déclarer faux.

---

## 7. La reprise : ne pas refaire ce qui est fait

L’étape d’ouverture est calculée à partir de l’état réel :

| Condition | Étape d’ouverture |
|---|---|
| Aucun cycle enregistré | 1 |
| Cycles enregistrés, aucune matière | 2 |
| Des matières, aucune classe | 3 |
| Des classes | 4 |

**Conséquence** : un parcours interrompu reprend là où il s’est arrêté, et un
parcours déjà complet **n’est pas rejoué**. L’apparence et la langue ne comptent
jamais comme une étape manquante.

---

## 8. La fin du parcours

| Élément | Règle |
|---|---|
| Action | « Terminer » déclenche la fin, une seule fois |
| Double clic | Neutralisé : un seul enregistrement, un seul message |
| Marqueur | Posé **sur le compte**, pas sur l’appareil |
| Message | Succès ou échec explicite, jamais un silence |
| Bouton pendant l’action | Désactivé, avec un état d’attente |
| Lien d’échappement | « Ignorer » termine aussi, sans rien exiger |

**Pourquoi un marqueur sur le compte ?** Parce qu’un professeur qui change de
téléphone ne doit pas revoir l’accueil d’installation. Le marqueur suit le
compte ; l’apparence, elle, reste propre à l’appareil.

---

## 9. Après : la liste des premiers pas

Une fois le parcours terminé, une **liste de contrôle discrète** peut rester
affichée :

| Point | Terminé quand |
|---|---|
| Avoir une classe | Au moins une classe existe |
| Avoir ouvert un cahier | Un cahier a été ouvert au moins une fois |
| Avoir un emploi du temps | Au moins un créneau correspond à une classe |

| Règle | Détail |
|---|---|
| Affichage | Seulement si le professeur l’a demandé, et seulement tant que tout n’est pas fait |
| Disparition | Elle s’efface d’elle-même quand les trois points sont verts |
| Ton | Constat, jamais reproche : un point non fait n’est pas une faute |
| Action | Chaque point mène directement à l’écran concerné |

**Pourquoi une liste et pas une visite guidée ?** Une visite guidée interrompt ;
une liste attend. L’enseignant avance quand il veut, et la liste ne revient plus
une fois le parcours maîtrisé.

---

## 10. Ce que l’onboarding ne demande jamais

| Jamais demandé | Pourquoi |
|---|---|
| Un téléphone ou un mot de passe | Cela appartient à la connexion |
| Un thème imposé | Le choix existe, mais il n’est pas une étape |
| Une photo ou un avatar | Aucun usage |
| Une acceptation de notifications | Proposée plus tard, avec son bénéfice expliqué |
| Une installation d’application | Proposée plus tard, jamais pendant l’installation du produit |
| Un emploi du temps complet | Facultatif, par conception |

---

## 11. Branchements

| Circuit | Dépend de | Déclenche |
|---|---|---|
| Profil | Cycles choisis | Étapes suivantes ordonnées, création de classe pré-remplie |
| Matières | Liste des matières enseignables | Contenus proposés, classes de l’étape 3 |
| Classes | Profil, matière, règles de groupe | Carte de classe, emploi du temps, évaluations |
| Horaires | Classes existantes | Alertes de séance, calcul de retard, rappels planifiés |
| Fin de parcours | Compte, session | Marqueur d’accueil, écran principal |
| Premiers pas | Classe, cahier ouvert, créneau | Disparition de la liste de contrôle |
| Compte synchronisé | Marqueur serveur | Aucune réapparition de l’accueil sur un autre appareil |

---

## 12. Invariants

1. **Deux étapes obligatoires** (cycles, matières), deux facultatives (classe,
   horaires).
2. **Le profil ordonne, il ne filtre pas** : tous les cycles restent créables.
3. **Une décision par étape** ; jamais deux questions dans le même écran.
4. **Le focus suit l’étape** : le lecteur d’écran annonce la nouvelle étape.
5. **L’avancement vérifie l’étape courante**, pas un état de rendu périmé.
6. **La langue et le thème ne bloquent jamais.**
7. **La fin s’exécute une seule fois**, même sur double clic.
8. **Le marqueur d’accueil appartient au compte**, pas à l’appareil.
9. **Un parcours complet n’est pas rejoué.**
10. **Un emploi du temps partiel n’est pas exigé** : mieux vaut rien que faux.
11. **La liste des premiers pas s’efface d’elle-même** et ne culpabilise
    personne.
