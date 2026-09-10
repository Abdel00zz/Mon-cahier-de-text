# Guide complet — Création des contenus de classe en JSON

**Application :** Mon cahier de textes  
**Langue :** Français  
**Format :** JSON UTF-8  
**Emplacement des contenus prédéfinis :** `public/contenus/<matiere>/<fichier>.json`  
**Manifeste :** `public/contenus/manifest.json`

Ce guide décrit le format utilisé pour créer un programme, un cahier de classe
ou un contenu pédagogique importable dans l'application.

## 1. Règle essentielle : le diagnostic initial

Chaque contenu de classe doit commencer par un bloc de type
`evaluation_diagnostic`.

Si ce bloc n'existe pas, l'application l'ajoute automatiquement en première
position. S'il existe déjà, il est conservé, placé en tête et renommé
`Évaluation diagnostique 1` pour un contenu français.

Exemple :

```json
[
  {
    "type": "evaluation_diagnostic",
    "title": "Évaluation diagnostique 1",
    "sections": []
  },
  {
    "type": "chapter",
    "title": "Nombres et calculs",
    "sections": []
  }
]
```

Le diagnostic initial est créé automatiquement dans les cas suivants :

- création manuelle d'une classe ;
- choix d'un contenu prédéfini ;
- import d'un fichier JSON ;
- import administrateur en mode remplacement ;
- import administrateur en mode ajout.

En mode ajout, l'application ne crée pas de doublon : elle conserve le
diagnostic déjà présent dans le cahier.

## 2. Deux formats acceptés

### 2.1. Format recommandé : tableau direct

Le fichier contient directement un tableau de chapitres et de contenus.

```json
[
  {
    "type": "chapter",
    "title": "Chapitre 1 : Les nombres",
    "sections": []
  }
]
```

### 2.2. Format avec en-tête du fichier

Pour documenter le fichier, utiliser un objet avec un en-tête et une propriété
`lessonsData`. L'en-tête est informatif ; le moteur lit `lessonsData`.

```json
{
  "header": {
    "title": "Programme de mathématiques — 1AC",
    "subject": "Mathématiques",
    "level": "1AC",
    "cycle": "college",
    "schoolYear": "2026-2027",
    "language": "fr",
    "contentDirection": "ltr",
    "version": 1,
    "author": "Nom de l'auteur",
    "description": "Programme annuel de la classe"
  },
  "lessonsData": [
    {
      "type": "chapter",
      "title": "Chapitre 1 : Les nombres",
      "sections": []
    }
  ]
}
```

Les noms de conteneur également acceptés sont `data`, `lessons` et `items`.
Pour un contenu prédéfini, il est préférable d'utiliser le tableau direct ou
`lessonsData`.

Attention : un export contenant plusieurs cahiers de synchronisation ne doit
pas être importé comme un programme. Il faut sélectionner et exporter le
cahier d'une seule classe.

## 3. Hiérarchie complète

La hiérarchie pédagogique autorisée est la suivante :

```text
contenu JSON
└── chapitre ou bloc spécial
    ├── sections[]
    │   ├── sous-sections[]
    │   │   ├── sous-sous-sections[]
    │   │   │   └── items[]
    │   │   └── items[]
    │   └── items[]
    └── items[]
```

Les champs de structure sont toujours des tableaux : `sections`, `subsections`,
`subsubsections` et `items`.

### 3.1. Chapitre

```json
{
  "type": "chapter",
  "title": "Chapitre 1 : Proportionnalité",
  "date": "2026-09-15",
  "remark": "Commencer par une situation concrète.",
  "sections": []
}
```

`chapter` est le type structurel principal. Si `type` est absent au niveau
principal, l'import le convertit en `chapter`.

### 3.2. Section, sous-section et sous-sous-section

Ces trois structures utilisent `name`, et non `title`.

```json
{
  "type": "chapter",
  "title": "Chapitre 2 : Fractions",
  "sections": [
    {
      "name": "Addition et soustraction",
      "subsections": [
        {
          "name": "Fractions de même dénominateur",
          "subsubsections": [
            {
              "name": "Méthode",
              "items": [
                {
                  "type": "definition",
                  "title": "Règle d'addition",
                  "description": "On conserve le dénominateur et on additionne les numérateurs."
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

Une section peut aussi contenir directement `items`. Une section vide est
valide : utiliser `"items": []` ou `"subsections": []`.

## 4. Types de contenu disponibles

### 4.1. Types de blocs principaux

Ces types peuvent apparaître au niveau supérieur :

| Type | Utilisation |
| --- | --- |
| `chapter` | Chapitre ou unité d'enseignement |
| `evaluation_diagnostic` | Évaluation diagnostique initiale ou intermédiaire |
| `devoir_maison` | Devoir maison |
| `controle_continu` | Contrôle continu |
| `correction_devoir_maison` | Correction d'un devoir maison |
| `correction_controle_continu` | Correction d'un contrôle continu |

Les blocs spéciaux doivent avoir `title`, et peuvent recevoir `date`, `remark`,
`sections`, `items` et `separatorAfter`.

### 4.2. Types pédagogiques pour les items

Tous les types suivants sont acceptés :

| Type canonique | Sens |
| --- | --- |
| `definition` | Définition |
| `theorem` | Théorème |
| `proposition` | Proposition |
| `lemma` | Lemme |
| `corollary` | Corollaire |
| `remark` | Remarque |
| `proof` | Preuve ou démonstration |
| `example` | Exemple |
| `exercise` | Exercice |
| `activity` | Activité |
| `application` | Application |
| `introduction` | Introduction |
| `observation` | Observation |
| `comparison` | Comparaison |
| `classification` | Classification |
| `structure` | Structure |
| `function` | Fonction |
| `mechanism` | Mécanisme |
| `process` | Processus |
| `method` | Méthode |
| `experience` | Expérience |
| `interpretation` | Interprétation |
| `conclusion` | Conclusion |
| `property` | Propriété |
| `quantity` | Grandeur |
| `relation` | Relation |
| `law` | Loi |
| `principle` | Principe |
| `protocol` | Protocole |
| `model` | Modèle |
| `safety` | Consigne de sécurité |

L'application normalise aussi les alias français, anglais et abrégés suivants
vers les libellés internes français :

| Type accepté | Alias également acceptés |
| --- | --- |
| `definition` | `définition`, `def`, `déf` |
| `theorem` | `théorème`, `theoreme`, `th` |
| `proposition` | `prop` |
| `lemma` | `lemme`, `lem` |
| `corollary` | `corollaire`, `corol`, `cor` |
| `remark` | `remarque`, `rem` |
| `proof` | `preuve`, `prv`, `dem`, `dém`, `demonstration`, `démonstration` |
| `example` | `exemple`, `ex` |
| `exercise` | `exercice`, `exo` |
| `activity` | `activité`, `activite`, `act` |
| `application` | `app`, `appli` |
| `observation` | `obs` |
| `comparison` | `comparaison`, `comp` |
| `classification` | `classif` |
| `structure` | `struct` |
| `function` | `fonction`, `fonc` |
| `mechanism` | `mécanisme`, `mecanisme`, `mechanism`, `mec`, `méc` |
| `process` | `processus`, `proc` |
| `method` | `méthode`, `methode`, `meth`, `méth` |
| `experience` | `expérience`, `experience`, `exp` |
| `interpretation` | `interprétation`, `interpretation`, `interp` |
| `conclusion` | `concl` |
| `property` | `propriété`, `propriete`, `propr`, `proprio` |
| `quantity` | `grandeur`, `quantity`, `grand` |
| `relation` | `rel` |
| `law` | `loi` |
| `principle` | `principe`, `princ` |
| `protocol` | `protocole`, `proto` |
| `model` | `modèle`, `modele`, `mod` |
| `safety` | `sécurité`, `securite`, `sec`, `séc` |

Pour une meilleure lisibilité dans les fichiers de l'application, utiliser de
préférence les libellés anglais indiqués dans la colonne « Type canonique » ou
les libellés français complets. Les abréviations sont pratiques pour les
anciens fichiers, mais elles sont moins explicites.

## 5. Champs disponibles

### 5.1. Champs communs

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `type` | chaîne | Non au niveau principal | Type du bloc ou de l'item |
| `title` | chaîne | Oui pour un bloc | Titre affiché |
| `name` | chaîne | Oui pour une section | Nom affiché de la structure |
| `description` | chaîne | Non | Explication pédagogique |
| `content` | chaîne | Non | Texte complémentaire ou consigne |
| `remark` | chaîne | Non | Remarque de l'enseignant |
| `number` | chaîne ou nombre | Non | Numéro pédagogique |
| `page` | chaîne ou nombre | Non | Page du manuel |
| `date` | `YYYY-MM-DD` | Non | Date de la séance ou du bloc |
| `sections` | tableau | Non | Sections du chapitre |
| `subsections` | tableau | Non | Sous-sections |
| `subsubsections` | tableau | Non | Sous-sous-sections |
| `items` | tableau | Non | Contenus placés dans la structure |
| `separatorAfter` | objet | Non | Séparateur affiché après le bloc |

Les champs inconnus sont conservés pendant l'import, mais ils ne sont pas
garantis dans l'affichage. Utiliser les champs documentés pour un résultat
stable.

### 5.2. Objet `separatorAfter`

```json
{
  "separatorAfter": {
    "content": "Fin de la séance",
    "date": "2026-09-18",
    "remark": "Préparer les exercices de consolidation."
  }
}
```

Champs :

- `content` : texte du séparateur ;
- `date` : date ISO ou chaîne vide ;
- `remark` : remarque facultative ;
- `manual` : booléen facultatif.

Un séparateur ne remplace pas la date du titre d'un chapitre et ne doit pas
être utilisé pour simuler un chapitre.

## 6. Exemple complet de programme français

```json
{
  "header": {
    "title": "Programme de mathématiques — 2AC",
    "subject": "Mathématiques",
    "level": "2AC",
    "cycle": "college",
    "schoolYear": "2026-2027",
    "language": "fr",
    "contentDirection": "ltr",
    "version": 1,
    "author": "Équipe pédagogique"
  },
  "lessonsData": [
    {
      "type": "evaluation_diagnostic",
      "title": "Évaluation diagnostique 1",
      "sections": []
    },
    {
      "type": "chapter",
      "title": "Chapitre 1 : Nombres décimaux",
      "sections": [
        {
          "name": "Opérations sans parenthèses",
          "items": [
            {
              "type": "activity",
              "title": "Calcul mental de dépenses combinées",
              "description": "Chercher une stratégie de calcul rapide."
            },
            {
              "type": "property",
              "title": "Priorité de la multiplication et de la division",
              "description": "Les multiplications et divisions sont effectuées avant les additions et soustractions."
            },
            {
              "type": "example",
              "number": 1,
              "title": "Calculer une expression",
              "description": "Pour $A=1{,}6+2\\times3{,}2$, on calcule d'abord le produit."
            },
            {
              "type": "exercise",
              "title": "S'entraîner sur les priorités opératoires",
              "page": 18
            }
          ]
        },
        {
          "name": "Opérations avec parenthèses",
          "subsections": [
            {
              "name": "Méthode de calcul",
              "items": [
                {
                  "type": "definition",
                  "title": "Expression numérique",
                  "description": "Une expression numérique est une suite de nombres et d'opérations."
                }
              ]
            }
          ]
        }
      ],
      "separatorAfter": {
        "content": "Fin du chapitre",
        "date": "",
        "manual": true
      }
    },
    {
      "type": "devoir_maison",
      "title": "Devoir maison 1",
      "date": "2026-10-02",
      "items": [
        {
          "type": "exercise",
          "title": "Reprendre les exercices 1 à 5",
          "page": 22
        }
      ]
    }
  ]
}
```

Dans une chaîne JSON, le caractère `\\` doit être échappé. Ainsi, une formule
LaTeX contenant `\\times` s'écrit `\\\\times` dans le fichier source JSON.

## 7. Exemple court en arabe ou contenu RTL

```json
{
  "header": {
    "title": "برنامج الرياضيات — الأولى إعدادي",
    "subject": "الرياضيات",
    "level": "1AC",
    "cycle": "college",
    "schoolYear": "2026-2027",
    "language": "ar",
    "contentDirection": "rtl",
    "version": 1
  },
  "lessonsData": [
    {
      "type": "evaluation_diagnostic",
      "title": "التقويم التشخيصي 1",
      "sections": []
    },
    {
      "type": "chapter",
      "title": "الأعداد والعمليات",
      "sections": [
        {
          "name": "العمليات الأساسية",
          "items": [
            {
              "type": "definition",
              "title": "تعريف العدد العشري",
              "description": "شرح مبسط للعدد العشري."
            }
          ]
        }
      ]
    }
  ]
}
```

La direction `rtl` est conservée pour le cahier. Pour un fichier français,
utiliser `ltr` ou laisser le moteur détecter la direction.

## 8. Ajouter un contenu prédéfini à l'application

### Étape 1 — Créer le fichier

Déposer le fichier dans le dossier de la matière :

```text
public/contenus/mathematiques/2ac-mathematiques.json
public/contenus/physique-chimie/2bac-pc-physique-chimie.json
public/contenus/svt/2ac-svt.json
```

Le nom du fichier doit être simple, stable, en minuscules, sans espace ni
accent. Exemple : `1bac-sm-mathematiques.json`.

### Étape 2 — Déclarer le fichier dans `manifest.json`

Ajouter une entrée avec le niveau, la matière, le titre et le nom seul du
fichier :

```json
{
  "niveau": "2AC",
  "matiere": "Mathématiques",
  "titre": "Programme officiel, 2AC · Mathématiques",
  "fichier": "2ac-mathematiques.json"
}
```

`fichier` ne doit pas contenir `public/`, `contenus/` ou le nom du dossier.
Le dossier est déduit automatiquement de `matiere`.

### Étape 3 — Respecter le niveau

`niveau` doit correspondre au niveau réellement utilisé par les classes. Le
niveau du manifeste est comparé au début du nom officiel de la classe. Ne pas
utiliser un niveau trop général qui pourrait proposer un programme à la
mauvaise classe.

### Étape 4 — Valider

Depuis la racine du projet :

```bash
npm run check:data
```

Cette commande vérifie notamment :

- la validité du JSON ;
- l'existence du fichier déclaré ;
- l'absence de doublon niveau/matière ;
- la structure des chapitres ;
- la présence possible du diagnostic initial ;
- les types et dates importables.

Pour vérifier spécifiquement les contenus prédéfinis :

```bash
npx tsx scripts/validate-predefined-content.ts
```

## 9. Dates, texte et formules

### Dates

Utiliser de préférence le format ISO :

```json
"date": "2026-09-15"
```

Le moteur peut convertir certaines dates françaises comme `15/09/2026`, mais
le format ISO reste recommandé. Une date impossible comme `2026-02-31` est
refusée.

### Texte enrichi

Dans `description`, `content` et `remark` :

```text
**texte en gras**
*texte en italique*
- élément de liste
1. élément numéroté
```

### LaTeX

Entourer les formules avec `$` :

```json
{
  "type": "example",
  "title": "Calcul de l'aire",
  "description": "On utilise $A=\\pi r^2$ pour calculer l'aire du disque."
}
```

Dans un fichier JSON, les antislashs LaTeX doivent être doublés : `\\pi`,
`\\frac`, `\\times`.

## 10. Limites techniques et règles de sécurité

Le pipeline d'import protège l'application contre les fichiers excessifs :

- profondeur maximale : 12 niveaux ;
- volume maximal : 12 000 nœuds ;
- `title`, `name`, `type`, `number` et `page` : 500 caractères maximum ;
- `description`, `content` et `remark` : 20 000 caractères maximum ;
- fichier administrateur : taille contrôlée par la limite serveur.

Ne jamais placer de mot de passe, jeton, cookie, clé privée ou donnée sensible
dans un contenu JSON. Les programmes pédagogiques sont des données publiques
de l'application.

## 11. Erreurs fréquentes à éviter

- oublier le tableau `lessonsData` lorsque l'on utilise un objet avec en-tête ;
- mettre `chapter` dans `sections` au lieu de mettre un nom de section ;
- écrire `section` avec `title` sans `name` ;
- utiliser `chapitre` comme type sans titre ;
- créer manuellement deux diagnostics initiaux ;
- mettre une date française ambiguë au format `03/04/2026` ;
- oublier d'échapper les antislashs LaTeX ;
- déclarer dans le manifeste un chemin complet au lieu du nom de fichier ;
- publier le même couple niveau/matière deux fois ;
- modifier un contenu prédéfini sans relancer la validation.

## 12. Fichiers de référence dans le projet

- `public/contenus/manifest.json` : catalogue des contenus prédéfinis ;
- `public/contenus/<matiere>/*.json` : programmes importables ;
- `utils/importPipeline.ts` : lecture, normalisation et limites d'import ;
- `utils/starterDiagnostic.ts` : règle du diagnostic initial ;
- `constants/type-keys.ts` : types, alias et badges ;
- `scripts/validate-predefined-content.ts` : validation du catalogue ;
- `features/settings/ImportPlatformModal.tsx` : import utilisateur ;
- `admin/components/OfficialBulletinManager.tsx` : import du bulletin officiel,
  qui est un format différent des contenus de classe.

## 13. Checklist avant publication

- [ ] Le fichier est en UTF-8 et contient un JSON valide.
- [ ] Le contenu commence par `evaluation_diagnostic` ou sera corrigé automatiquement.
- [ ] Chaque chapitre possède un `title`.
- [ ] Chaque section possède un `name`.
- [ ] Chaque item possède un `type` et un `title`.
- [ ] Les dates sont au format `YYYY-MM-DD`.
- [ ] Les formules LaTeX ont leurs antislashs échappés.
- [ ] Le niveau et la matière correspondent au manifeste.
- [ ] Le fichier est placé dans le bon dossier.
- [ ] Le fichier est référencé une seule fois dans `manifest.json`.
- [ ] `npm run check:data` passe sans erreur.
