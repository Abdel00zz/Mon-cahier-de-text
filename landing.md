# La page d’entrée — promesse, préparation de la première classe et création de compte

Ce document décrit **le premier écran de l’application** : ce qu’il promet, ce
qu’il fait préparer avant toute inscription, comment il valide, comment il guide,
et ce qu’il ne demande jamais.

Il décrit des écrans et des règles, sans citer de fichier. Pour l’installation
dans l’application (quatre étapes après connexion), voir `onboarding.md` ; pour
la connexion, voir `login.md` ; pour la carte de classe, voir `carte-classe.md`.

Vocabulaire employé :

| Terme | Sens exact dans ce document |
|---|---|
| **Page d’entrée** | L’écran public, avant compte, qui prépare la première classe |
| **Brouillon** | La classe en préparation : cycle, palier, niveau, filière, groupe, matière |
| **Préparation** | L’étape 1 : décrire sa classe |
| **Compte** | L’étape 2 : l’inscription, qui scelle la préparation |
| **Guidage** | La ligne qui dit quoi faire maintenant |
| **Aperçu** | Le résumé de la classe préparée, avant inscription |

---

## 1. La promesse

La page d’entrée ne vend pas des fonctionnalités : elle **fait faire la première
chose utile**. Un professeur qui arrive n’a pas à créer un compte pour découvrir
l’outil ; il décrit sa classe, et son compte vient ensuite.

| Principe | Traduction à l’écran |
|---|---|
| **Vendre le résultat** | « Préparons votre première classe » — pas « Créez un compte » |
| **Valeur avant compte** | La classe se prépare entièrement avant l’inscription |
| **Une décision à la fois** | Un cycle, puis un niveau, puis une filière, puis un groupe, puis une matière |
| **Toujours une issue** | Un bouton principal actif dès que la préparation est valide, et un lien vers la connexion pour qui a déjà un compte |

**Ce que la page ne fait pas** : elle ne demande ni téléphone, ni mot de passe,
ni code, tant que la classe n’est pas décrite. L’inscription est la
**conséquence** de la préparation, pas sa condition.

---

## 2. La structure de l’écran

```
┌──────────────────────────────────────────────────────────┐
│  ① Votre classe ──────── ② Votre compte                  │
├──────────────────────────────────────────────────────────┤
│  Préparons votre première classe.                        │
│  Choisissez votre classe et votre matière, puis créez    │
│  votre compte.                            [illustration] │
├──────────────────────────────────────────────────────────┤
│  Cycle            (Collège · Lycée · Prépa)              │
│  Filière          (Tronc commun · 1er Bac · 2e Bac…)      │
│  Niveau           (liste du palier choisi)                │
│  Groupe           (numéro, 1 à 99)                        │
│  Matière          (liste des matières enseignables)        │
├──────────────────────────────────────────────────────────┤
│  Votre classe est prête pour la suite.                    │
│  [ Créer mon compte ]           Se connecter              │
└──────────────────────────────────────────────────────────┘
```

| Élément | Rôle |
|---|---|
| **Progression 1 → 2** | Deux étapes seulement, visibles dès le premier regard |
| **Titre** | Une phrase, jamais un slogan |
| **Illustration** | Un carnet dessiné, sobre, sans animation décorative |
| **Formulaire** | Les cinq champs de l’identité d’une classe |
| **Guidage** | Une seule phrase, qui change selon ce qui manque |
| **Pied** | Action principale pleine largeur, puis un lien discret de connexion |

---

## 3. Le déroulé, champ par champ

| # | Champ | Règle |
|---|---|---|
| 1 | **Cycle** | Trois choix : collège, lycée qualifiant, classes préparatoires |
| 2 | **Filière** | Apparaît **seulement** hors collège : tronc commun, 1re Bac, 2e Bac (ou 1re/2e année de prépa) |
| 3 | **Niveau** | La liste dépend du palier : jamais une liste à plat de quinze lignes |
| 4 | **Groupe** | Numéro de 1 à 99 ; une valeur invalide est signalée, jamais corrigée en silence |
| 5 | **Matière** | Liste des matières réellement enseignables |

Trois règles de cohérence :

1. **Changer de cycle réinitialise le niveau** : un niveau de lycée n’a aucun sens
   au collège.
2. **La filière ne réapparaît pas au collège** : le collège n’en a pas.
3. **Une filière n’est pas une matière** : si la valeur saisie ressemble à une
   filière (« Sciences Physiques »), l’application le dit et demande la matière
   réellement enseignée.

---

## 4. Le guidage, qui remplace les messages d’erreur

Le formulaire n’affiche pas d’erreurs rouges en cascade : il affiche **une seule
phrase**, celle de l’étape suivante.

| État | Phrase |
|---|---|
| Aucun cycle | « Choisissez votre cycle d’enseignement » |
| Cycle choisi, aucun niveau | « Choisissez le niveau de votre classe » |
| Niveau choisi, aucune matière | « Choisissez votre matière » |
| Groupe invalide | « Indiquez un groupe de 1 à 99 » |
| Tout est complet | « Votre classe est prête pour la suite » |

**Pourquoi une seule phrase ?** Parce qu’un formulaire qui affiche cinq erreurs à
la fois fait douter de tout. Ici, on ne montre que le prochain pas.

---

## 5. La validation avant l’inscription

| Contrôle | Règle |
|---|---|
| Cycle | Obligatoire |
| Niveau | Obligatoire, et **appartenir au cycle choisi** |
| Matière | Obligatoire, et **être une matière** (pas une filière) |
| Groupe | Obligatoire, normalisé, de 1 à 99 |
| Cohérence | Une préparation incomplète ne produit **aucune** classe |

L’action principale reste **inactive** tant que la préparation n’est pas valide :
un bouton grisé explique mieux qu’un refus après coup.

---

## 6. L’aperçu

Un aperçu de la classe préparée est affiché avant l’inscription : nom tel qu’il
sera écrit, niveau lisible, matière.

**Règle** : l’aperçu montre exactement ce qui sera créé. Ni promesse, ni
reformulation flatteuse, ni détail caché.

---

## 7. Le passage à l’étape 2

| Élément | Ce qui se passe |
|---|---|
| **Créer mon compte** | Ouvre l’inscription, en transmettant la préparation |
| **Se connecter** | Ouvre la connexion, sans perdre la préparation en cours |
| **Retour** | L’étape 1 garde son brouillon |

La préparation **survit** à l’aller-retour vers l’inscription : un professeur qui
se ravise et se connecte ne reperd pas sa saisie.

---

## 8. La langue et le sens de lecture

| Règle | Détail |
|---|---|
| Langue | La page d’entrée est bilingue **arabe / français** |
| Sens | L’arabe passe la page en droite à gauche, y compris le formulaire et la progression |
| Illustrations | Aucune ne contient de texte : rien à traduire |
| Noms propres | Les libellés de niveaux restent officiels dans la langue choisie |

**Ce que la page ne propose pas** : un choix de thème, de taille de texte ou de
langue tierce (anglais). Ces réglages existent, mais ils n’ont pas leur place
devant la tâche : ils viendront après, dans les paramètres.

---

## 9. Ce que la page d’entrée partage avec le reste

| Donnée | Source commune | Pourquoi |
|---|---|---|
| Cycles | Le catalogue des niveaux officiels | Même découpage que l’assistant de classe |
| Paliers et niveaux | Le même regroupement que la création de classe | Aucune liste parallèle |
| Matières | La même liste des matières enseignables | Aucune matière inventée |
| Règle de groupe | La même normalisation | Un groupe valide ici reste valide en classe |
| Validation | La même règle de préparation | L’inscription ne peut pas créer une classe invalide |

**Conséquence** : une classe préparée depuis la page d’entrée est
**indiscernable** d’une classe créée plus tard depuis le tableau de bord.

---

## 10. Accessibilité et ergonomie

| Point | Règle |
|---|---|
| Cibles | 44 px minimum, boutons de cycle plus hauts pour rester lisibles |
| Contraste | Texte principal sur fond neutre, aucune information par la seule couleur |
| Progression | Marquée par un état d’accessibilité, pas seulement par une couleur |
| Saisie | Clavier adapté au type de champ ; aucune saisie obligatoire en minuscules |
| Erreur | Jamais un déplacement brutal du focus : la phrase de guidage suffit |
| Densité | Un champ par intention, jamais deux questions dans la même ligne sur téléphone |

---

## 11. Branchements

| Circuit | Dépend de | Déclenche |
|---|---|---|
| Préparation | Catalogue des niveaux, matières | Brouillon valide, aperçu fidèle |
| Inscription | Compte, préparation | Une classe d’essai rattachée au propriétaire |
| Connexion | Session, espace de travail | Reprise de la préparation ou abandon discret |
| Assistant de classe | Mêmes règles | Aucune divergence de vocabulaire |
| Rôles de direction | Bulletin officiel, niveaux | Étiquettes de niveau correctes dès la première classe |
| Programme de contenus | Matière, niveau | Le bon programme est proposé dès l’ouverture du cahier |

---

## 12. Invariants

1. **La valeur avant le compte** : la classe se prépare sans inscription.
2. **Une décision à la fois** : un champ, une question.
3. **Un seul message à la fois** : la phrase de guidage remplace la pile d’erreurs.
4. **Aucune préparation incomplète ne crée de classe.**
5. **La filière n’existe pas au collège.**
6. **Une filière n’est jamais acceptée comme matière.**
7. **L’aperçu montre exactement ce qui sera créé.**
8. **Le brouillon survit à un aller-retour vers l’inscription.**
9. **Les listes sont partagées** avec la création de classe : aucune liste parallèle.
10. **Aucun réglage de confort** (thème, taille) n’est demandé avant la tâche.
