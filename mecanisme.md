# Mécanismes de l’application — circuits, règles et logique

Ce document décrit **comment l’application fonctionne**, circuit par circuit, sans
citer un seul fichier de code. Il s’adresse à qui doit comprendre le
comportement (enseignant, concepteur, correcteur, nouvel intervenant) : chaque
section explique *ce qui entre*, *ce qui se décide*, *ce qui sort*, et *pourquoi
cette règle existe*.

Vocabulaire employé :

| Terme | Sens exact dans ce document |
|---|---|
| **Espace de travail** | Le compte enseignant et tout ce qui lui appartient : classes, cahiers, réglages, archives. Il isole les données d’un compte à l’autre sur le même appareil. |
| **Classe** | Un groupe d’élèves identifié par un cycle, un niveau, un groupe et une matière, avec une couleur. |
| **Cahier** | Le contenu pédagogique d’une classe : chapitres, sections, contenus, dates, remarques. |
| **Séance** | Une date de cours réelle, calculée depuis l’emploi du temps, à laquelle des contenus sont rattachés. |
| **Bloc** | Nœud de premier niveau du cahier : chapitre ou évaluation (devoir, contrôle, examen, oral…). |
| **Ligne** | Un élément affiché dans le tableau de l’éditeur, quel que soit son niveau dans l’arbre. |
| **Compagnon** | L’assistant visuel en forme de robot qui observe le travail et propose **une** action à la fois. |
| **Portée** | Restriction d’une lecture ou d’une écriture à l’espace de travail courant. |

---

## 1. Vue d’ensemble : sept circuits qui se parlent

L’application est un assemblage de circuits indépendants qui échangent par des
**signaux** (jamais par appel direct d’un circuit à l’autre). Cette séparation
explique pourquoi une panne de réseau ne bloque jamais la saisie, et pourquoi un
changement de réglage se répercute partout sans rechargement.

```
   ┌────────────┐   identité    ┌────────────────┐   écritures   ┌──────────────┐
   │ Démarrage  │──────────────▶│ Espace de      │──────────────▶│ Stockage     │
   │ (boot)     │               │ travail        │               │ local        │
   └────────────┘               └────────────────┘               └──────┬───────┘
                                        │                               │
                                 lectures/écritures                     │ lots
                                        ▼                               ▼
   ┌────────────┐   projections  ┌────────────────┐   push/pull   ┌──────────────┐
   │ Interface  │◀──────────────▶│ Domaine        │◀─────────────▶│ Synchronisa- │
   │ (écrans)   │                │ pédagogique    │               │ tion cloud   │
   └────────────┘                └───────┬────────┘               └──────────────┘
          ▲                              │ signaux                     ▲
          │                              ▼                             │
          │                     ┌────────────────┐   alertes           │
          └─────────────────────│ Compagnon &    │────────────────────┘
                                │ notifications  │
                                └────────────────┘
```

Trois règles structurent tout le reste :

1. **Une seule source de vérité** : l’état local de l’espace de travail. Le
   réseau et les notifications ne font que lire, proposer ou déposer des lots.
2. **Un seul écrivain par domaine** : l’interface ne modifie jamais un cahier
   directement ; elle décrit une intention, le domaine la valide, le stockage
   l’enregistre.
3. **Aucune décision implicite** : chaque arbitrage (quelle classe ouvrir, quand
   synchroniser, quoi notifier, quoi montrer du robot) est un point unique,
   ordonné et déterministe — jamais une conséquence accidentelle d’un rendu.

### 1.1 La carte des signaux

Les circuits ne s’appellent pas : ils publient quatre signaux, et chaque écran
écoute celui qui le concerne.

| Signal | Émis quand | Ce qui se recalcule |
|---|---|---|
| **Travail en attente** | Une écriture locale n’est pas encore poussée | État de synchronisation, libellé « enregistré ici », file d’envoi |
| **Lot appliqué** | Une synchronisation a déposé des changements distants | Classes, cahiers, configuration, statuts de séance, tableau éditeur |
| **Configuration changée** | Réglages (emploi du temps, notifications, politique, apparence) | Emploi du temps, statuts, alertes, feuille d’évaluations, thème |
| **Classes changées** | Création, modification, suppression, changement de couleur ou de niveau | Tableau de bord, en-tête du cahier, listes d’élèves, évaluations |

Trois événements système s’ajoutent aux signaux applicatifs : **retour de
visibilité**, **focus de la fenêtre** et **reprise native**. Ils ne changent pas
les données, ils forcent un recalcul de l’heure (statut de séance, alertes) et une
vérification de version.

**Règle** : un écran ne relit jamais tout l’espace de travail à chaque signal ; il
ne recalcule que les valeurs dérivées de ce signal. C’est ce qui garde la saisie
fluide même sur un téléphone modeste.

### 1.2 Les quatre branchements majeurs

| Branchement | De → vers | Où il est détaillé |
|---|---|---|
| **Écriture** | Geste de l’enseignant → intention → validation métier → nouvelle version → stockage durable → file de synchronisation | §4, §7.1 |
| **Projection** | Arbre du cahier → lignes → fusion des séances → tableau, papier, alertes, compagnon | §7.2, §14 |
| **Observation** | Signaux (travail en attente, lot appliqué, configuration, classes) → recalculs ciblés par écran | §1.1, §5 |
| **Décision** | Diagnostic pédagogique → arbitrage ordonné → une action → posture du robot | §13 |

Aucun de ces quatre branchements n’écrit dans un autre : ils échangent des
*faits* (une version, un signal, un diagnostic), jamais des ordres. C’est la
raison pour laquelle une panne d’un circuit n’entraîne pas les autres.

---

## 2. Démarrage : la chaîne d’ouverture

### Circuit

```
stockage lisible → police prête → réglages chargés → classes chargées
      → emploi du temps → [écran de travail] → synchronisation en arrière-plan
```

L’écran de démarrage est **un vrai écran de progression**, pas une image
d’attente : il annonce des jalons nommés (« table des séances et réglages »,
« classes »…) et un pourcentage. Le rendu principal n’apparaît qu’une fois les
jalons franchis, ce qui évite les sauts de mise en page et les polices qui
arrivent après le texte.

### Règles

- **Ordre non négociable** : les réglages avant les classes, parce qu’une classe
  se lit avec ses conventions (cycles, matières, couleurs) ; l’emploi du temps
  avant l’affichage des statuts, parce qu’un statut sans créneaux serait faux.
- **Aucun blocage sur le réseau** : le démarrage ne dépend que du stockage
  local. Le réseau n’intervient qu’après, en tâche de fond.
- **Polices d’abord** : les polices du cahier (latin et arabe) sont chargées
  pendant l’écran de progression, pour que le premier tableau ne se recompose
  pas sous les yeux de l’enseignant.
- **Dégradation ordonnée** : si le stockage est illisible, l’application démarre
  en état dégradé et le dit, au lieu d’afficher un espace vide trompeur.

---

## 3. Identité et espace de travail

### Circuit d’ouverture

1. Une identité enregistrée est relue au démarrage.
2. Elle est comparée au **propriétaire de l’espace de travail** courant.
3. Si les deux concordent, l’application s’ouvre **même sans réseau** (mode hors
   ligne assumé, pas un échec).
4. Sinon, l’écran de connexion est présenté ; aucune donnée d’un autre compte
   n’est affichée.

### Règles de propriété

- **Le propriétaire est l’identité stable du compte** (numéro ou identifiant),
  pas le nom affiché : renommer un enseignant ne change pas son espace.
- **Une écriture n’est jamais anonyme** : toute donnée locale appartient à une
  portée ; une donnée hors portée n’est ni lue ni affichée.
- **Changement de compte = déménagement**, pas écrasement : l’espace sortant est
  mis de côté (copie complète), l’espace entrant est restauré, puis seulement
  les écritures reprennent. Si le déménagement ne peut pas être garanti
  (espace insuffisant), il est **refusé** plutôt que risqué.
- **Déconnexion** : elle marque l’appareil comme déconnecté, conserve les
  travaux non synchronisés du propriétaire, et empêche une reconnexion
  silencieuse non voulue.
- **Première visite** : un parcours guidé crée la première classe et les
  réglages ; l’onboarding n’est « terminé » que lorsque les informations
  minimales existent réellement, pas lorsqu’on a simplement fermé l’écran.

### Relations

L’espace de travail conditionne **tout le reste** : la synchronisation (à qui
appartient le lot), les notifications (à quel cahier se rattache un rappel), les
archives (quelle année appartient à qui), et le compagnon (quel espace observer).

---

## 4. Stockage local : écrire une fois, ne jamais perdre

### Circuit d’écriture

```
intention → validation par le domaine → écriture durable → signal « données changées »
                                    ↘ si quota atteint : message explicite, écriture refusée
```

### Règles

- **Écriture durable** : une écriture n’est annoncée comme réussie que lorsque
  la valeur est réellement posée. Un échec de stockage (quota, navigation
  privée) remonte un message compréhensible — « le stockage de cet appareil est
  plein… » — au lieu d’un succès apparent qui perdrait le travail.
- **Écritures uniques** : une même valeur n’est pas réécrite deux fois ; les
  écritures identiques sont fusionnées. C’est ce qui rend la synchronisation
  silencieuse (pas de « enregistré » clignotant à chaque frappe).
- **Journal d’édition** : certaines opérations délicates (réorganisation,
  suppressions groupées) passent par un journal qui permet de reconstituer
  l’état en cas d’interruption brutale.
- **Séparation par domaine** : configuration, classes, cahiers, archives,
  métadonnées d’impression, reports de rappels, journal d’édition vivent dans
  des espaces distincts. Une écriture de cahier ne peut donc pas corrompre la
  configuration — et inversement.
- **Conflit et quarantaine** : si deux versions incompatibles d’un même cahier
  se rencontrent, la version entrante n’écrase rien : elle est isolée
  (quarantaine) et signalée. L’enseignant garde une version lisible.
- **Immuabilité** : un cahier n’est jamais modifié « sur place ». Chaque
  modification produit une nouvelle version. Cela permet des comparaisons
  rapides (identité de version), des annulations fiables et une projection
  mémoïsée sans risque.

---

## 5. Synchronisation cloud

### Fenêtre de trois minutes

La synchronisation automatique n’est pas un minuteur qui tourne en boucle : c’est
une **fenêtre de trois minutes partagée**.

```
instant t0 : synchronisation (automatique ou manuelle)
   ├── toute demande dans les 3 minutes suivantes est ignorée (pas de file d’attente qui s’allonge)
   ├── une reprise réseau ne rouvre pas la fenêtre
   └── à t0 + 3 min, la prochaine occasion relance un cycle complet
```

Raisons : préserver la batterie et le forfait, éviter les rafales de requêtes
qui se contredisent, et garantir qu’un envoi manuel compte comme le cycle
automatique (une seule vérité temporelle).

### Circuit d’un cycle

```
1. Tirer l’état serveur
2. Comparer avec l’état local (configuration, classes, cahiers)
3. Fusionner ce qui peut l’être (jamais d’écrasement silencieux)
4. Pousser ce qui est local et absent côté serveur
5. Publier le résultat (état + signaux internes)
```

### Règles

- **Une seule synchronisation à la fois** : la deuxième attend la fin de la
  première au lieu de doubler les requêtes.
- **Toujours dans cet ordre** : tirer avant de pousser. Pousser d’abord
  écraserait un travail fait ailleurs.
- **Le local gagne en cas de doute** : une version locale non encore poussée
  n’est jamais remplacée par une version distante plus ancienne ; elle est
  conservée et signalée.
- **Taille maîtrisée** : un cahier au-delà d’environ 950 Ko ne part pas. Le
  message explique la situation et propose de répartir le contenu, plutôt que de
  faire échouer la synchronisation en silence.
- **États lisibles** : inactif, en attente, en cours, synchronisé, hors ligne,
  erreur. Chacun a un libellé et une couleur ; « enregistré ici, en attente de
  synchronisation » n’est pas une erreur, c’est un état normal hors connexion.
- **Signaux internes** au lieu de rechargements : « configuration changée »,
  « classes changées », « lot appliqué »… Chaque écran concerné se met à jour
  lui-même. Rien ne dépend d’un rechargement de page.
- **Badge et messages** : les compteurs de messages non lus se synchronisent
  séparément du contenu pédagogique ; ils ne peuvent jamais retarder une
  sauvegarde.

---

## 6. Le modèle du cahier

### Structure

```
Cahier
└── Bloc (chapitre ou évaluation)
    ├── Section
    │   ├── Sous-section
    │   │   └── Sous-sous-section
    │   │       └── Contenu (définition, théorème, exercice, activité…)
    │   └── Contenu
    └── Contenu
```

### Règles du modèle

- **Deux familles de blocs** : les blocs *structurels* (chapitre) et les blocs
  *d’évaluation* (devoir maison, contrôle continu, contrôle court, contrôle
  global, oral, examens blancs, olympiades, concours, colles, corrections). Un
  bloc d’évaluation est un repère de l’année : il porte sa propre couleur et son
  propre numéro dans son titre.
- **Une ligne libre** vit hors du plan : elle est affichée comme un contenu mais
  n’est ni un chapitre ni une section, et ne participe pas à la numérotation.
- **Chaque nœud possède une identité de position** (chapitre, section,
  sous-section, sous-sous-section, contenu) et une **identité de contenu**
  (type, numéro déclaré, titre, description, page). Les deux sont utilisées
  différemment : la première pour ranger, la seconde pour reconnaître.
- **Aucune donnée dérivée n’est stockée** : les numéros, les dates de séance, les
  fusions, les statuts sont recalculés. On ne peut donc pas avoir un cahier
  « à moitié recalculé ».

---

## 7. Table éditeur : le branchement des lignes

C’est le cœur de l’application : transformer un arbre pédagogique en un tableau
lisible, datable et imprimable, sans jamais perdre la correspondance avec
l’arbre.

### 7.1 Projection arbre → lignes

Chaque nœud devient **une ligne** avec :

- sa position d’origine dans l’ordre du cahier (numéro de parcours) ;
- sa clé de ligne (chemin complet) — utilisée partout : sélection, recherche,
  numérotation, impression ;
- ses ancêtres (pour que la recherche affiche un contenu avec son chapitre).

**Règle** : l’ordre d’affichage suit **toujours** l’ordre source, jamais l’ordre
des clics ni celui d’une recherche filtrée. C’est ce qui garantit qu’une
insertion « après la sélection » tombe au bon endroit.

### 7.1 bis Le branchement complet du tableau

```
   CAHIER (arbre immuable)
        │
        │  projection mémoïsée, une fois par version
        ▼
   LIGNES  ── clé de ligne ──┬──▶ sélection / opérations groupées
   (position, ancêtres)      ├──▶ numérotation (compteurs par type)
                             ├──▶ recherche (champs + ancêtres)
                             └──▶ impression (mêmes numéros, mêmes dates)
        │
        │  fusion de séances (même date) et de contenus (même identité)
        ▼
   RENDU  ── cellule de date unique ─┐
          ── contenu non répété ─────┼──▶ une séance = une date, un contenu, une remarque
          ── remarque partagée ──────┘
        │
        │  geste de l’enseignant (clic, double-clic, glisser, sélection)
        ▼
   INTENTION  ──▶ validation par le domaine ──▶ NOUVELLE VERSION
                                                     │
                                    ┌────────────────┼─────────────────┐
                                    ▼                ▼                 ▼
                              historique         stockage local     file de
                              (annuler/refaire)  (écriture durable)  synchronisation
```

Autrement dit : **aucun composant d’affichage ne modifie une ligne**. Il envoie
une intention (dater, déplacer, supprimer, changer de type) ; le domaine vérifie
la règle métier ; une nouvelle version du cahier est produite ; le tableau se
recalcule. C’est ce branchement — et non un enchaînement de callbacks — qui rend
l’annulation exacte et la synchronisation fiable.

### 7.2 Fusion des séances

Le tableau ne montre pas une date par contenu : il montre **une séance**.

```
Contenu A (date 12/09) ┐
Contenu B (date 12/09) ├──▶ une seule cellule de date, une seule remarque de séance
Contenu C (date 12/09) ┘
```

Deux fusions coexistent :

| Fusion | Déclencheur | Effet |
|---|---|---|
| **Par date** | Lignes consécutives partageant la même date normalisée | Une cellule de date, une remarque partagée, un seul bloc visuel. |
| **Par contenu** | Même identité pédagogique (type + numéro + titre + description + page) sur des lignes consécutives | Le contenu n’est pas répété : il est présenté comme la suite du même élément. |

**Règles de la fusion par date**

- La fusion s’arrête dès qu’une ligne n’a plus de date, ou dès qu’une ligne
  intercalée n’est pas strictement consécutive dans l’ordre source.
- Un garde-fou de performance borne une suite à 120 lignes : au-delà, la fusion
  s’interrompt pour ne pas figer l’affichage. Ce n’est pas une limite
  pédagogique (une journée de 25 contenus reste une seule séance).
- La date est **normalisée** avant comparaison (Unicode, espaces) : « 12/09 » et
  « 12 / 09 » sont la même séance.
- La remarque d’une séance fusionnée est **unique** : une seule cellule de
  remarque pour tout le bloc, et le contenu affiché n’est jamais dupliqué.
- Les structures (chapitre, section, sous-section, sous-sous-section) ne
  participent jamais à la fusion par contenu : leur rôle est de séparer.

### 7.3 Les trois colonnes

| Colonne | Contenu | Règle d’alignement |
|---|---|---|
| **Date** | Jour et mois, ou plage (« du 12 au 14 »), ou couple (« 12 et 13 ») | Toujours **centrée** ; un repère court se lit au centre de sa colonne. |
| **Contenu** | Titres structurels, intitulés d’évaluation, contenus, descriptions | Les **titres de tête** (chapitre, bloc, évaluation) sont centrés ; les niveaux imbriqués et le corps se calent sur le bord de lecture. |
| **Remarque** | Note de séance, annotations d’activité, aperçu de document | Bord de lecture, jamais centrée : c’est un texte, pas un repère. |

Largeur : la date et la remarque sont bornées en proportion, le contenu prend
l’espace restant. Sur téléphone, la date descend à environ 14 % et la remarque à
16 % ; sur grand écran, elles s’élargissent. La colonne de contenu ne descend
jamais sous une largeur de lecture confortable.

### 7.4 Recherche

La recherche parcourt le titre, la description, la remarque, le numéro, la page,
le nom, le contenu et la date. **Règle** : un contenu trouvé entraîne
l’affichage de tous ses ancêtres ; un filtre ne doit jamais casser une séance en
laissant une ligne orpheline.

### 7.5 Le mécanisme de sélection

#### État de sélection

Une sélection n’est pas un ensemble de numéros de lignes : c’est un ensemble de
**clés de ligne** accompagné de leurs coordonnées dans l’arbre.

```
sélection = { clés }  +  { clé → coordonnées (chapitre, section, …, contenu) }
```

Conséquence : une sélection reste valide après un filtre de recherche, un
repliement de section ou une réorganisation — et devient **inoffensive** si la
ligne a disparu entre-temps (elle est ignorée au lieu de viser une autre ligne).

#### Les gestes

| Geste | Effet |
|---|---|
| **Clic simple** sur la zone de ligne | Sélectionne **ou** désélectionne cette ligne (bascule). |
| **Double-clic** sur le contenu | Ouvre l’édition du contenu, sans changer la sélection. |
| **Clic sur l’en-tête d’une séance fusionnée** | Sélectionne ou désélectionne **tout le groupe** : si toutes les lignes du groupe sont déjà sélectionnées, elles sont retirées ; sinon, elles sont ajoutées (règle du tout-ou-rien). |
| **Glisser une ligne** | Propose un déplacement ; le point d’insertion est calculé avant le dépôt, pas après. |
| **Échap** | Vide la sélection et ferme la fenêtre ouverte, dans cet ordre. |

#### Le déplacement (glisser-déposer)

```
source + cible + côté (avant/après)
   → calcul d’un PLAN de déplacement (est-ce possible ? où exactement ?)
   → application du plan (une seule nouvelle version)
   → la sélection SUIT le bloc déplacé
   → l’état passe à « non enregistré » puis l’écriture durable suit
```

**Règles** :

- un dépôt impossible n’est jamais appliqué (pas de demi-déplacement) ;
- le déplacement est calculé sur l’ordre source, pas sur l’ordre affiché : un
  glisser dans une liste filtrée ne peut pas atterrir « entre deux résultats » ;
- la sélection se replace sur les lignes déplacées : on peut enchaîner deux
  gestes sans re-sélectionner.

#### La barre de sélection

Dès qu’une ligne est sélectionnée, la barre contextuelle apparaît avec le nombre
exact de lignes et des actions limitées à ce qui a du sens :

| Action | Condition d’apparition |
|---|---|
| **Ajouter après** | Toujours |
| **Aujourd’hui** / **Choisir une date** | Toujours |
| **Retirer la date** | Au moins une ligne sélectionnée porte une date |
| **Modifier** | Une seule ligne sélectionnée (sur grand écran) |
| **Supprimer** | Toujours, avec confirmation |
| **Plus d’actions** | Actions secondaires repliées (dupliquer, changer de type…) |
| **Vider la sélection** | Toujours |

Le nombre de lignes est **annoncé** aux lecteurs d’écran à chaque changement
(zone vivante), et les actions sont désactivées pendant une transition de
sélection : on ne peut pas lancer deux opérations groupées concurrentes.

#### Opérations groupées

Elles s’appliquent **dans l’ordre source**, jamais dans l’ordre des clics, et
produisent **une seule nouvelle version** du cahier. Une sélection vidée par
l’opération elle-même (par exemple après suppression) ne laisse pas la barre
ouverte sur du vide.

### 7.6 Annuler / refaire

Chaque modification produit une **nouvelle version** du cahier ; l’historique
conserve les versions successives avec leur intention. Cela donne :

- un annuler/refaire exact (on revient à une version, pas à un état partiel) ;
- l’impossibilité de « mélanger » deux modifications concurrentes ;
- la possibilité de rejouer une version sur un autre appareil par synchronisation.

---

## 8. Dates, séances et calendrier de la classe

### Ce qui définit une date valide

Une date de contenu n’est acceptée que si :

1. elle correspond à un **jour réel de cours** pour cette classe (créneau
   hebdomadaire existant) ;
2. elle n’est ni fériée, ni en vacances, ni un jour de repos hebdomadaire ;
3. elle n’est pas couverte par une **absence déclarée** (sauf décision contraire
   explicite).

Les plages (« du 12 au 14 ») sont découpées en séances réelles : une plage ne
crée pas de séance fictive le jour où la classe n’a pas cours.

### Injection des absences

Quand une période d’absence est déclarée :

- les séances **réellement manquées** sont identifiées classe par classe ;
- seules les classes concernées reçoivent une ligne d’absence, datée de leurs
  propres séances ;
- la ligne se place à sa place chronologique, dans son parent, et n’est jamais
  dupliquée si l’opération est rejouée.

### Horloge interne

Le statut d’une séance (« en cours », « imminente », « plus tard aujourd’hui »,
« à venir ») est calculé sur l’heure **de référence marocaine** (fuseau dédié,
pas l’heure brute de l’appareil), corrigée par le décalage d’horloge éventuel de
l’établissement, et limitée à l’année scolaire effective.

Le calcul est **rafraîchi à chaque minute** et à chaque retour dans
l’application (visibilité, focus, reprise système). Un statut périmé n’est donc
jamais affiché après un retour d’arrière-plan.

---

## 9. Numérotation des contenus

### Règle de base

Chaque **type** de contenu a son propre compteur (« Définition 1 », « Exemple
2 », « Application 1 »…), et le compteur **repart de 1 à chaque chapitre**,
comme dans un manuel.

### Priorité à la saisie

Un numéro écrit à la main **prime** sur le calcul — et fait **avancer** le
compteur juste après lui. Sans cette seconde partie de la règle, la suite
automatique contredirait la saisie et produirait « Définition 3 » après une
« Définition 7 » écrite manuellement.

### Ce qui n’est jamais numéroté

- les structures (chapitre, section, sous-section, séparateur) ;
- les lignes libres ;
- les évaluations, qui numérotent déjà leur propre titre (« Contrôle continu 2 »).

### Portée et style

La portée du compteur est réglable : par chapitre, par section, ou sur tout le
document. Le style aussi : chiffres, chiffres romains, ou hiérarchie complète
(« 1.2.3 »). Le numéro affiché et le numéro imprimé sont **le même calcul** :
l’écran et le papier ne peuvent pas diverger.

---

## 10. Évaluations

### Familles

Devoirs maison, contrôles continus, contrôles courts, contrôles globaux, oraux,
examens blancs, olympiades, concours, colles — plus les **corrections** de
devoirs et de contrôles. Chaque famille a une couleur, un libellé, un numéro
porté par le titre et, le cas échéant, un document.

### Relations avec le cahier

- **Une évaluation vit dans le cahier** (c’est un bloc), mais elle peut aussi
  être **planifiée** ailleurs (date prévue, semestre, année scolaire).
- Quand les deux existent, ils sont **liés** : la date du cahier fait foi pour
  l’affichage, la planification garde la prévision. Un même devoir n’est jamais
  compté deux fois.
- Une évaluation **sans date** n’est pas un retard : c’est un travail en
  préparation. Le compagnon ne le traite pas comme un manquement.
- Une **prévision** non confirmée (date déduite, non résolue) n’est pas un
  rendez-vous pris par l’enseignant : elle ne déclenche pas de conflit.

### Conflits détectés

| Conflit | Situation | Conséquence |
|---|---|---|
| **Identité** | Deux évaluations de même nature et même numéro pour la même année | L’une doit être reconnue comme doublon ou renommée |
| **Liaison** | Une évaluation du cahier et une planification qui ne se correspondent pas | La liaison est proposée, jamais imposée |
| **Doublon** | Deux lignes strictement identiques (même date, même titre) | Signalé comme duplication |
| **Chevauchement** | Deux évaluations qui occupent la même plage | Signalé pour arbitrage |

Un conflit est **une invitation à vérifier**, pas un blocage : l’application
n’empêche jamais de saisir, elle empêche seulement de croire que tout est
cohérent quand ce ne l’est pas.

### Documents (sujets)

- **Requis**, **facultatif**, **associé** : trois états distincts.
- Un devoir qui exige un sujet mais n’en a pas est signalé — sans être bloqué.
- Un contenu facultatif vide n’est jamais présenté comme manquant.
- Les documents de la direction sont signalés comme tels (ils ne sont pas
  modifiables par l’enseignant).

### Absences aux évaluations

Une absence déclarée n’efface pas une évaluation : elle indique qui était
absent, pour que la correction et le suivi restent justes.

### 10.2 Les seize natures d’évaluation

Le cahier et la feuille officielle partagent **seize natures**, dans cet ordre de
lecture :

| Famille | Natures | Rôle |
|---|---|---|
| **Devoirs (bulletin)** | contrôle, contrôle court, contrôle global, oral, devoir maison, colle | Épreuves qui comptent dans le contrôle continu |
| **Diagnostic** | évaluation diagnostique | Point de départ, situe le niveau sans noter |
| **Activités et suites** | contrôle des cahiers, correction de contrôle continu, examen blanc, olympiade, concours, soutien, remédiation, rattrapage, autre | Faits pédagogiques consignés, transmis ou non |

**Règle** : ces seize natures sont **identiques pour toutes les matières**. La
matière ne crée pas de type de résultat propre ; elle change le libellé de la
classe, sa couleur et les filtres de lecture. Un « contrôle continu » se comporte
donc exactement de la même façon en mathématiques, en français ou en éducation
physique — seules les capacités activées par la direction peuvent varier.

### 10.3 Les types de résultats, nature par nature

Chaque nature ne peut porter que ce qu’elle sait porter. Le tableau ci-dessous
est la **capacité maximale** ; la direction peut ensuite restreindre (jamais
étendre).

| Nature | Document | Liste d’élèves | Retour par élève | Note /20 | Absents | Correction datée |
|---|---|---|---|---|---|---|
| Contrôle, contrôle court, contrôle global | **requis** | facultatif | niveaux (si activé) | oui (si retour) | **oui** | — |
| Oral, colle | facultatif | **oui** | **niveaux** | **oui** | oui | — |
| Devoir maison | **requis** | **oui** | **remise** (rendu / non rendu) | — (jamais de note) | — | **oui** |
| Évaluation diagnostique | **requis** | **oui** | — | — | — | — |
| Contrôle des cahiers | **aucun document** | **oui** | **état du cahier** | — | — | — |
| Correction de contrôle continu | **requis** | **oui** | — | — | — | — |
| Examen blanc | **requis** | **oui** | niveaux | oui | — | — |
| Olympiade, concours, soutien, remédiation, rattrapage, autre | facultatif | **oui** | niveaux | oui | — | — |

Trois formes de **retour par élève** existent, et une seule par nature :

- **niveaux** : appréciation de maîtrise (insuffisant → excellent) ;
- **remise** : le devoir a-t-il été rendu (le devoir maison ne se note pas, il se
  rend) ;
- **cahier** : le cahier de l’élève a-t-il été tenu (contrôle des cahiers).

### 10.4 Les règles de cohérence (jamais d’état impossible)

1. **La note suppose le retour par élève**, qui suppose la liste d’élèves :
   activer une note sans retour est impossible, l’activer sans liste non plus.
2. **Une capacité que la nature ne porte pas reste éteinte**, quoi qu’on
   publie (pas d’absents pour une activité, pas de note pour un devoir maison).
3. **La correction n’existe que pour un devoir maison transmis** : sans le
   devoir, elle n’a rien à dater.
4. **La politique ne stocke que les écarts** : les valeurs par défaut
   reproduisent le comportement historique ; une nature inconnue (donnée plus
   récente) se comporte comme « autre ».

### 10.5 Disponibilité selon le cycle et le niveau

Ce qui suit ne masque **que la création** : une donnée déjà saisie reste toujours
visible et modifiable.

| Nature | Proposée seulement si |
|---|---|
| **Colle** | Classe préparatoire |
| **Contrôle des cahiers**, **Olympiade** | Hors classe préparatoire |
| **Examen blanc** | Année d’examen : 3ᵉ année du collège (examen régional), 1ʳᵉ Bac, 2ᵉ Bac, prépa (concours blanc) — jamais en 1ʳᵉ/2ᵉ année du collège ni en tronc commun |

Quand le niveau n’est pas reconnaissable, l’application **propose** : mieux vaut
une carte de trop qu’une nature introuvable.

---

## 11. Emploi du temps et statuts de séance

### Structure

L’emploi du temps est un ensemble de **créneaux** (jour + heure de début + heure
de fin + classe). Deux créneaux consécutifs d’une même classe forment **un seul
bloc de séance** (une séance de deux heures n’est pas deux séances).

### Statuts calculés

| Statut | Condition | Usage |
|---|---|---|
| **En cours** | L’heure courante est dans un bloc de la classe, hors vacances/absence | Badge « الآن » + minutes restantes |
| **Pause** | Bloc interrompu par une récréation ou une pause déclarée | Le compte à rebours s’arrête, la séance reste ouverte |
| **Imminente** | Le bloc commence dans quelques minutes | Préparation, rappel |
| **Plus tard aujourd’hui** | Un autre bloc de la classe existe plus loin dans la journée | Regroupement « اليوم » |
| **À venir** | Prochain bloc un autre jour ouvré | « Prochaine séance : lundi à 10h00 » |
| **Aucune** | Pas de créneau, pas de classe, ou période non travaillée | Rien n’est inventé |

### Règles

- **Jamais de créneau inventé** : sans horaire, aucun statut n’est fabriqué.
- **Les jours non travaillés sont exclus** (week-end propre à l’établissement,
  fériés, vacances, absences) avant de chercher la prochaine séance.
- **L’année scolaire borne tout** : avant la rentrée ou après la fin, aucune
  séance n’est annoncée.
- **Le décalage d’horloge** de l’établissement décale les bornes, pas les
  libellés : l’enseignant lit l’heure qu’il vit, pas une heure théorique.

---

## 12. Alertes et notifications

### Moteur déterministe

Un détecteur unique examine l’état (emploi du temps, classe, date saisie ou non)
et rend une liste d’événements datés :

- **fin de séance** : prévenir avant la fin, pour noter ce qui doit l’être ;
- **date manquante** : après la fin d’une séance, si aucun contenu daté n’existe
  pour cette classe.

### Règles

- **Fenêtre de fraîcheur de 60 secondes** : un rappel ne se déclenche qu’une
  fois, dans la minute prévue. Il survit à un simple réaffichage, mais ne sonne
  jamais après coup.
- **Silence respecté** : vacances, jours fériés, jours de repos, absences et
  année close coupent les rappels.
- **Heure de référence** : les rappels suivent l’heure marocaine, pas celle de
  l’appareil, pour rester justes en voyage.
- **Le rendez-vous système est préparé à l’avance** : les bornes de la journée
  sont programmées, y compris application fermée ; la consommation d’énergie
  reste maîtrisée parce qu’on ne réveille l’application qu’aux bornes utiles.
- **Report (snooze)** : un rappel peut être repoussé ; le report est mémorisé
  séparément du contenu et expire de lui-même.
- **Permission progressive** : on n’ouvre pas la fenêtre système sans avoir
  expliqué le bénéfice. L’invite n’arrive qu’après l’installation de
  l’application, et devient un renvoi vers les réglages si le système a déjà
  refusé.
- **Badge** : le compteur de messages non lus est mis à jour sans ouvrir
  l’application ; il ne dépend jamais de la synchronisation pédagogique.

---

## 13. Le compagnon (le robot)

### Rôle

Le compagnon n’est pas un décor : c’est **un arbitre**. Il observe l’espace de
travail et choisit **une seule** action utile, la plus prioritaire, jamais une
liste de reproches.

### Les signaux qu’il reçoit

- l’état pédagogique calculé (classe, emploi du temps, séance en cours, cahiers) ;
- l’authentification et la connectivité ;
- l’état de synchronisation et de transfert ;
- l’état de la boîte de messages (chargée, en échec, en attente de réponse) ;
- la possibilité de lire un cahier et de proposer un contenu ;
- un avis de calendrier (férié, vacances, événement officiel) ;
- l’état d’installation et de permission des notifications.

### Le cycle d’observation

```
  ┌──────────────┐   ┌───────────────┐   ┌────────────────┐   ┌──────────────┐
  │ Observation  │──▶│ Diagnostic    │──▶│ Arbitrage      │──▶│ Une action   │
  │ (cahiers,    │   │ pédagogique   │   │ (ordre strict) │   │ + posture    │
  │  classes,    │   │ (10 étapes)   │   │                │   │ du robot     │
  │  calendrier) │   └───────────────┘   └────────────────┘   └──────────────┘
  └──────────────┘          │                    ▲
        ▲                   │ comportement        │ une réponse non lue,
        │                   ▼                     │ un avis de calendrier,
        │            ┌───────────────┐            │ une permission à demander
        └────────────│ Posture       │            │
         changement  │ (gravité)     │────────────┘
         d’état      └───────────────┘
```

**Règles du cycle**

- Une seule évaluation par cycle : le robot ne calcule pas une liste d’actions
  concurrentes qu’il faudrait trier à l’affichage.
- Le diagnostic est recalculé à chaque changement d’état (classe, date,
  synchronisation, messages, calendrier) — jamais à intervalle fixe.
- Une suggestion de contenu n’est **pas** un diagnostic : elle est proposée
  seulement quand tout le reste est prêt.
- La posture est le reflet du diagnostic, jamais une animation décorative : elle
  change de gravité quand le nombre exact de points à traiter change.

### Les étapes du diagnostic et ce qu’elles déclenchent

| Étape | Sens pédagogique | Action proposée au clic |
|---|---|---|
| **Créer une classe** | Aucune classe n’existe | Ouvrir l’assistant de création |
| **Dater les séances** | Une classe n’a aucun créneau | Ouvrir l’emploi du temps de la classe |
| **Séance en cours** | La classe est en cours maintenant | Ouvrir le cahier de cette classe |
| **Cahier illisible** | Le contenu ne peut pas être lu | Ouvrir la classe pour réparer |
| **Conseil de cahier** | Incohérence détectée (chapitre sans date, contenu hors séance…) | Ouvrir la classe au bon endroit |
| **Conflit d’évaluation** | Deux évaluations se contredisent ou se chevauchent | Ouvrir les évaluations de la classe |
| **Liste d’élèves** | Liste absente ou noms non fusionnés | Ouvrir la fiche de la classe |
| **Cahier vide** | La classe n’a jamais reçu de contenu | Ouvrir le cahier pour démarrer |
| **Suivi doux** | Longue période sans nouvelle séance datée | Ouvrir le cahier pour vérifier |
| **Prêt** | Ces vérifications ne trouvent rien | Ouvrir la classe, ou proposer un contenu |

Chaque étape porte une **clé d’attention** (classe + nature + compteur). Deux
états identiques ne réveillent pas deux fois le robot ; un état nouveau, oui.

### L’ordre d’arbitrage (règle absolue)

Le premier critère satisfait gagne ; rien n’est cumulé.

```
 1. Panne de synchronisation ou de transfert (en ligne)  → proposer de réessayer
 2. Boîte de messages en échec (en ligne)                → proposer de réessayer
 3. Séance en cours                                      → guider vers la séance,
                                                            même hors ligne
 4. Hors ligne avec travail non synchronisé              → rassurer, proposer d’attendre
 5. Transfert en cours (tirage, cahiers)                 → patienter
 6. Réponse du secrétariat non lue                       → la montrer
 7. Tout diagnostic non résolu (créer, dater, corriger…)  → guider vers ce diagnostic
 8. Après un diagnostic « prêt » : hors ligne / en cours
    / messages non chargés                                → rassurer, patienter, vérifier
 9. Avis de calendrier                                   → informer
10. Installation de l’application (en ligne)             → proposer d’installer
11. Autorisation de notifications (en ligne)             → proposer d’activer
12. Sinon                                                → suggérer un contenu
                                                            ou guider
```

Deux conséquences voulues : **un échec inconnu n’est jamais transformé en
succès** (un contrôle non résolu ne devient pas une proposition), et **un
appareil non configuré n’efface jamais une vraie classe, une vraie réponse ou
une vraie réparation** (installation et notifications passent en dernier).

### Le diagnostic pédagogique (ce que le robot « voit »)

Ordre de priorité, du plus structurant au plus fin :

1. **Aucune classe** → créer la première classe.
2. **Classes sans créneaux** → l’emploi du temps manque, sans lui aucun suivi
   n’est possible.
3. **Séance en cours** → c’est l’action immédiate, elle prime sur la
   configuration des autres classes.
4. **Cahiers illisibles** → signaler, ne jamais prétendre que tout va bien.
5. **Conseils de cahier** (cohérence : chapitre sans date, contenu daté hors
   séance, séance sans contenu…).
6. **Conflits d’évaluations**.
7. **Listes d’élèves incomplètes** (absentes ou non fusionnées).
8. **Cahiers vides** → proposer de démarrer.
9. **Suivi doux** : classe sans emploi du temps, cahier qui attend son premier
   contenu, longue période sans nouvelle séance datée.
10. **Rien à signaler** → état serein (ce n’est pas une validation exhaustive).

### Le comportement visible du robot

Le robot **exprime l’état du diagnostic** par sa posture, sans un mot :

| Situation | Gravité | Action | Antenne | Tête | Endormissement |
|---|---|---|---|---|---|
| Tout est prêt, séance à venir | sereine | succès | calme | ronde (100) | après 25 s |
| Séance en cours | mineure | inspection | calme | 90 | jamais pendant le cours |
| Suivi doux | mineure | inspection | calme | 85 | après 60 s |
| 1–2 problèmes | mineure | inspection | calme | 85 | après 60 s |
| 3–5 problèmes | modérée | avertissement | **clignote** | 70 | jamais |
| 6+ problèmes | critique | échec | **clignote** | 55 | jamais |
| Cahier illisible | critique | échec | clignote | 55 | jamais |
| Vérification | mineure | attente | calme | 90 | après 30 s |
| Veille | sereine | attente | calme | 95 | après 25 s |

Règles associées :

- **Une antenne qui clignote = une action attendue** ; calme = rien d’urgent.
- **Le sommeil est suspendu** tant qu’une tâche urgente existe : le robot ne
  s’endort jamais sur un problème critique ou pendant une séance.
- **Un rappel de suivi n’est jamais une accusation** : il est classé « mineur »
  même quand plusieurs classes sont concernées.
- **Une nouvelle classe, ou un problème renouvelé, réveille l’attention** : la
  clé d’attention change, donc le robot se manifeste de nouveau — sans répéter
  la même remarque à chaque rendu.

### La suggestion de contenu

- Elle n’est proposée qu’à une classe **mûre** (au moins trois heures
  d’existence), dont le cahier est **vide ou très bref** (six contenus ou
  moins).
- On compte les **contenus réellement saisis**, jamais les « leçons terminées »
  déduites d’une date ou d’une évaluation : une date n’est pas une preuve de
  travail.
- Un cahier qui ne contient qu’un diagnostic de départ impeccable est considéré
  comme vide.
- L’ordre des classes proposées est stable, indépendant de la disposition
  visuelle, et ignore les dates futures ou invalides.

### Avis de calendrier

Férié, vacances, événement officiel : le compagnon le dit **à la place** d’une
suggestion, jamais en plus. Un message porte un seul sujet.

### Messages et secrétariat

Les réponses non lues du secrétariat passent avant tout conseil : une question
posée mérite une réponse visible. Une réponse lue disparaît de l’arbitrage sans
disparaître de l’historique.

### Référence d’aide

Quand le blocage est un défaut de configuration de l’appareil (installation,
permission), le compagnon renvoie vers l’explication correspondante plutôt que
de répéter un diagnostic pédagogique hors sujet.

---

## 14. Impression et papier

### Circuit

```
réglages d’impression (périmètre, période, options)
   → projection du cahier (mêmes lignes, mêmes numéros, mêmes dates)
   → document papier (en-tête, séances, remarques)
   → mémorisation de ce qui a été imprimé
```

### Règles

- **Même calcul, autre support** : le papier réutilise la projection de l’écran.
  Un contenu qui change de numéro à l’impression serait un défaut, pas une
  option.
- **Les titres de tête restent centrés**, le corps reste au bord de lecture : la
  lisibilité ne dépend pas du support.
- **Ce qui a été imprimé est mémorisé** : les impressions suivantes peuvent
  signaler ce qui est nouveau, et les séances déjà imprimées ne sont pas
  présentées comme oubliées.
- **Les remarques et corrections voyagent avec leur séance** : une correction ne
  se détache jamais de l’évaluation qu’elle corrige.
- **Conservation** : l’enseignant peut toujours retrouver la version imprimée
  (date, périmètre) pour prouver ce qui a été fait.

### Anatomie de la fenêtre d’impression

```
┌────────────────────────────────────────────────┐
│ [imprimante]  Imprimer ou exporter PDF      ×  │  ← barre supérieure : titre, fermeture
├────────────────────────────────────────────────┤
│ Sortie                                         │
│   ● Nouveautés seulement     (recommandé)      │
│   ○ Tout le document                           │  ← corps défilant
│   ○ Séances choisies                           │
│                                                │
│ Dates de séance                                │
│   [12/09 · nouveau] [14/09 · déjà imprimé] …   │
│   tout · aucune · nouveautés                   │
│                                                │
│ Typographie   petit · normal · grand           │
│ Interligne    compact · normal · aéré          │
│ Options       couleur du contenu · n° de page  │
│               en-tête : 1ʳᵉ page / toutes / non │
├────────────────────────────────────────────────┤
│                    [ Imprimer · 3 séances ]    │  ← barre inférieure collante
└────────────────────────────────────────────────┘
```

**Règles de cette fenêtre**

- **Deux barres, une action** : la barre du haut ne défile pas (on peut toujours
  fermer), la barre du bas porte **une seule** action principale, collée au bord
  et toujours atteignable au pouce.
- **Le compte est dans le bouton** : « Imprimer · 3 séances » ou « … tout le
  document ». On sait ce qui va sortir avant de cliquer.
- **Désactivation honnête** : l’action reste éteinte s’il n’y a rien à imprimer
  (aucune nouveauté en mode « nouveautés », aucune date en mode « séances
  choisies »).
- **Chaque séance dit son état** : nouvelle ou déjà imprimée. C’est ce qui
  permet de n’imprimer que le complément sans feuilleter le cahier.
- **Pendant l’impression**, les réglages se verrouillent et une métaphore
  physique remplace le sablier : la feuille sort d’une fente d’imprimante. On
  voit ce qui quitte l’appareil, on ne fixe pas une animation abstraite.
- **Les options retenues ne modifient pas le cahier** : elles changent le papier
  (taille, interligne, couleurs, en-tête, pagination), jamais la donnée.
- **Support** : plein écran sur téléphone, dialogue centré au-delà — même
  convention que toutes les fenêtres.

---

## 15. Administration et messages

### Séparation des espaces

L’espace de direction est **distinct** de l’espace enseignant : il gère des
comptes, des classes, des documents officiels et des messages. Un enseignant ne
peut pas modifier les documents de la direction ; il peut les consulter et voir
ce qui est attendu de lui.

### Circuit des messages

```
direction → message déposé → compteur côté enseignant
   → réponse visible dans le compagnon → lecture → compteur décrémenté
```

### Règles

- **Le compteur est indépendant du contenu pédagogique** : il ne bloque ni ne
  retarde une sauvegarde.
- **Accusé de lecture daté** : un message lu reste dans l’historique.
- **Journal d’audit** : les actions sensibles de l’administration sont tracées
  (qui, quoi, quand) pour qu’une modification de compte ou de classe soit
  explicable.
- **Droits limités par le rôle** : les actions destructives sont réservées et
  confirmées ; les documents officiels sont en lecture seule côté enseignant.

---

## 16. Plateforme : application installable, mises à jour, réseau, retour système

### Installation et coquille

L’application se comporte comme une application native : coquille mise en cache,
polices embarquées, démarrage hors ligne. Une version partielle de
l’installation ne remplace jamais une version qui fonctionne.

### Mises à jour

- La navigation demande **le réseau d’abord** (avec un délai court) : une
  version publiée est vue au premier chargement en ligne.
- Hors ligne, la coquille en cache prend le relais : l’application reste
  utilisable, sans jamais mélanger deux versions.
- Le contrôle de version s’exécute au retour dans l’application, **au plus une
  fois par heure** : pas de minuteur permanent, pas de requête en arrière-plan.
- Le rechargement est **différé** tant qu’une saisie ou une fenêtre est ouverte :
  on ne recharge pas sous les doigts de l’enseignant.

### Réseau

- Toutes les requêtes passent par un **robinet unique** : si un intermédiaire
  (extension, aperçu, outil système) casse la fonction réseau du navigateur, le
  robinet revient à l’implémentation native et réessaie.
- Une écriture n’est rejouée que si l’échec vient de l’intermédiaire, jamais
  après une vraie coupure réseau (pour ne pas doubler une opération).

### Retour système (Android)

Le geste ou bouton retour ferme d’abord la fenêtre ouverte ; s’il n’y a rien à
fermer, il réduit l’application au lieu de quitter brutalement. L’historique de
navigation reste cohérent avec ce que l’enseignant voit.

### Zones sûres et mouvement

Les marges système (encoche, barre gestuelle) sont respectées ; les animations
tombent à zéro si le système demande de réduire le mouvement.

---

## 17. Langue, direction et lisibilité

### Règles

- **La langue de l’interface et la langue du contenu sont indépendantes** : un
  cahier arabe se lit de droite à gauche même dans une interface française, et
  inversement.
- **La direction est calculée par contenu**, pas par écran : un titre latin dans
  un cahier arabe reste latin, avec sa police.
- **Les polices ne se mélangent pas** : les caractères arabes et latins ont des
  plages distinctes, aucune substitution sauvage ne vient déformer un mot.
- **Le texte ne descend pas sous un plancher lisible** ; sur téléphone, l’échelle
  du cahier se resserre mais chaque niveau garde un écart visible avec le
  suivant.
- **Les couleurs ne portent jamais seules une information** : un état a un
  libellé ou un pictogramme en plus de sa teinte.

---

## 18. Branchements réciproques entre les éléments

### 18.1 Le principe

Aucun élément n’en « possède » un autre : chaque relation est **orientée** et
**qualifiée**. Pour chaque paire, trois questions ont une réponse unique :

1. **Qui fait autorité ?** (quelle donnée est la source, laquelle est dérivée)
2. **Qu’est-ce qui remonte ?** (ce que le second élément renvoie au premier)
3. **Qu’est-ce qui est interdit ?** (l’écriture qui créerait une boucle ou une
   perte)

### 18.2 La matrice des allers-retours

| Paire | Sens A → B | Sens B → A | Autorité |
|---|---|---|---|
| **Compte ↔ Espace de travail** | Le compte désigne le propriétaire, donc la portée des données | L’espace conservé permet de rouvrir hors ligne et de restaurer au retour | Le compte pour l’identité, l’espace pour le contenu |
| **Espace ↔ Stockage** | L’espace délimite ce qui peut être lu et écrit | Le stockage rend l’espace durable et le restaure au démarrage | Le stockage est la mémoire, l’espace est le filtre |
| **Stockage ↔ Synchronisation** | Une écriture locale marque du travail en attente | Un lot appliqué réécrit le local (fusion, jamais écrasement) | Le local gagne en cas de doute |
| **Synchronisation ↔ Écrans** | Les signaux (travail en attente, lot appliqué, configuration, classes) déclenchent des recalculs ciblés | Aucun écran ne pousse directement : il décrit une intention | Les signaux, jamais les appels directs |
| **Classe ↔ Emploi du temps** | La classe fournit cycle, niveau, matière et couleur des créneaux | Les créneaux donnent à la classe ses séances réelles ; sans eux, elle n’est pas « datable » | La classe pour l’identité, l’emploi du temps pour le temps |
| **Emploi du temps + Calendrier ↔ Séance** | Les créneaux et le calendrier engendrent les séances (jours travaillés uniquement) | Une séance manquée par absence ne supprime pas le créneau ; elle retire la séance du cahier | Le calendrier tranche ce qui est jour de cours |
| **Séance ↔ Cahier** | La séance donne une date ; la date regroupe les contenus en une seule ligne de séance | Les contenus datés rendent la séance visible ; une séance sans contenu devient un signal de suivi | La date appartient au contenu, la séance est calculée |
| **Cahier ↔ Évaluations** | Un bloc d’évaluation du cahier alimente la feuille de contrôle continu | Une évaluation planifiée (date prévue) revient proposer sa liaison au cahier | Le cahier fait foi pour la date affichée, la planification garde la prévision |
| **Évaluations ↔ Documents** | Un devoir déclare le besoin d’un sujet (requis, facultatif, aucun) | Le sujet déposé satisfait la condition et s’ouvre depuis la ligne | L’évaluation dit le besoin, le document dit la disponibilité |
| **Absences ↔ Emploi du temps** | Les séances réellement prévues pendant l’absence sont identifiées par créneau | Chaque séance manquée reçoit **sa** ligne datée, jamais un jour de calendrier | L’emploi du temps choisit les dates, l’absence ne fait que les couvrir |
| **Absences ↔ Cahier** | Une absence justifiée dépose une ligne « certificat » à la date de la séance | La ligne se fusionne par date avec les contenus du jour ; la réinjection est idempotente | Le cahier reste maître de son contenu |
| **Absences ↔ Évaluations** | Une absence marque les élèves absents à une évaluation | Une évaluation marquée n’est jamais supprimée par l’absence | L’absence qualifie, elle n’efface pas |
| **Contenu ↔ Remarque de séance** | Une remarque écrite sur une séance fusionnée est posée sur la **dernière** ligne du groupe | La cellule de remarque affiche la remarque unique du groupe, sans la répéter | Une seule remarque par séance |
| **Contenu ↔ Numérotation** | Le type et la position du contenu produisent son numéro automatique | Un numéro saisi à la main fait **avancer** le compteur pour la suite | La main de l’enseignant prime sur le calcul |
| **Cahier ↔ Impression** | Le papier lit la projection du cahier (mêmes lignes, mêmes numéros) | L’impression écrit seulement la **mémoire** de ce qui a été imprimé | Le papier ne modifie jamais le cahier |
| **Mémoire d’impression ↔ Compagnon** | Les séances déjà imprimées distinguent le complément du tout | Le suivi signale ce qui est nouveau sans accuser d’oubli | La mémoire informe, elle ne juge pas |
| **Direction ↔ Enseignant (messages)** | Un message déposé alimente le compteur et la conversation | La réponse, puis sa lecture, reviennent à la direction avec une date | La direction émet, l’enseignant acquitte |
| **Messages ↔ Compagnon** | Une réponse non lue devient l’action prioritaire du robot | La lecture la retire de l’arbitrage, sans effacer l’historique | Le message non lu prime sur tout conseil |
| **Réglages ↔ Écrans, alertes, papier** | La politique d’évaluation, les notifications, la numérotation et l’apparence fixent les règles | Chaque écran applique sans réécrire les réglages ; l’aperçu montre le résultat | Les réglages décident, les écrans obéissent |
| **Sélection ↔ Lignes et recherche** | La sélection retient des clés de lignes | Un filtre peut masquer une ligne sélectionnée sans l’annuler ; une opération groupée la retrouve | La clé fait foi, pas la position affichée |
| **Version publiée ↔ Écrans** | Une nouvelle version détectée propose un rechargement différé | Un rechargement n’est jamais déclenché pendant une saisie ou une fenêtre ouverte | La version attend le calme |
| **Compagnon ↔ Diagnostic** | Le diagnostic alimente la décision et la posture | Le compagnon **n’écrit rien** dans le diagnostic : il ne consigne que son attention (mémoire d’attention, reports) | Le diagnostic est en lecture seule |

### 18.3 Les cinq règles d’or des relations

1. **Une seule autorité par donnée.** Deux éléments ne peuvent pas écrire la
   même valeur : la date vit dans le contenu, la séance est dérivée ; le besoin
   de document vit dans l’évaluation, la disponibilité dans le document.
2. **Ce qui est dérivé n’est jamais stocké.** Numéros, fusions, statuts,
   conflits, suggestions : tout est recalculé à la lecture. Une valeur dérivée
   stockée finirait par mentir.
3. **Toute écriture croisée passe par une intention validée.** Le tableau ne
   modifie pas le cahier ; il demande « donner cette date à ces lignes ». Le
   domaine vérifie (jour de cours, absence, cohérence) puis produit une version.
4. **Aucune relation ne supprime en silence.** Une absence ajoute une ligne
   datée sans supprimer le créneau ni le contenu. Supprimer une classe efface
   **son** cahier, son journal et sa mémoire d’impression, puis laisse une
   **pierre tombale** pour que la suppression se propage ; ses créneaux
   deviennent orphelins et sont ignorés, jamais réaffectés à une autre classe.
   Vider une sélection ne supprime aucune ligne.
5. **La rétroaction est explicite et bornée.** Un numéro manuel influence le
   compteur — une fois, pour la suite. Une impression alimente la mémoire
   d’impression — sans jamais revenir modifier le cahier. Aucune boucle ne
   s’auto-entretient : un lot appliqué ne relance pas immédiatement un envoi, et
   une remarque enregistrée ne rouvre pas sa fenêtre.

### 18.4 Le schéma des allers-retours

```
        Compte ──propriété──▶ Espace de travail ──écritures──▶ Stockage
           ▲                        │                            │
           │                    lectures                         │ lots
           │                        ▼                            ▼
      Écrans ◀──signaux──▶ Domaine pédagogique ◀──pull/push──▶ Cloud
        │  ▲                     │        ▲
        │  │                     │        └──politique, notifications, numérotation
        │  │                     ▼
        │  │              Diagnostic (lecture seule)
        │  │                     │
        │  └──── une action ── Compagnon ──mémoire d’attention──▶ (rien d’autre)
        │
        └── impression ──▶ Papier ◀──projection── Cahier
                            │
                            └──▶ Mémoire d’impression ──▶ fenêtre d’impression & suivi
```

**Lecture du schéma** : tout ce qui descend du compte vers le stockage est une
**écriture** ; tout ce qui remonte vers les écrans est un **signal** ; le
compagnon et le papier sont les deux seuls éléments qui **lisent tout et
n’écrivent presque rien** (une mémoire d’attention, une mémoire d’impression).

---

## 19. Invariants : ce que l’application garantit toujours

1. **Aucune perte silencieuse** : une écriture refusée est dite ; un conflit est
   isolé, pas écrasé.
2. **Un seul écrivain, une seule vérité** : l’interface propose, le domaine
   valide, le stockage enregistre.
3. **Le local d’abord** : la saisie ne dépend jamais du réseau.
4. **Pas de fusion silencieuse** : tout regroupement (séance, contenu, doublon)
   est calculé, réversible et explicable.
5. **Le professeur garde le dernier mot** : un numéro manuel, une date choisie,
   un report de rappel priment sur les propositions automatiques.
6. **Une action à la fois dans le compagnon** : jamais de pile de reproches.
7. **Pas de validation exhaustive** : « rien à signaler » signifie « ces
   vérifications ne trouvent rien », pas « tout est parfait ».
8. **Le même calcul partout** : écran, impression, alertes et compagnon lisent
   la même projection.
9. **Rien n’est inventé** : sans créneau, sans date, sans donnée, l’application
   affiche un état vide honnête plutôt qu’une valeur plausible.
10. **Réversible** : annuler, restaurer, archiver, exporter restent possibles à
    tout moment, y compris après une synchronisation.

---

## 20. Tableau des dépendances

| Circuit | Dépend de | Influence |
|---|---|---|
| Démarrage | stockage, polices, réglages | premier rendu, statuts, polices |
| Espace de travail | identité, stockage | tout : données visibles, synchronisation, notifications |
| Stockage | quota, portée | fiabilité des écritures, conflits |
| Synchronisation | espace de travail, taille des cahiers, réseau | cohérence multi-appareils, badges |
| Cahier | rien (modèle pur) | éditeur, évaluations, impression, compagnon |
| Table éditeur | cahier, réglages de numérotation, calendrier | affichage, sélection, dates |
| Évaluations | cahier, calendrier, absences, documents | conflits, suivi, impression |
| Emploi du temps | calendrier, décalage d’horloge, absences | statuts, alertes, compagnon |
| Notifications | emploi du temps, dates saisies, permissions | rappels, badges, invites |
| Compagnon | tout ce qui précède | une action proposée, posture du robot |
| Impression | cahier, réglages, mémoire d’impression | document papier, suivi |
| Administration | comptes, documents, messages | droits, audit, réponses |
| Plateforme | navigateur/système | mises à jour, réseau, retour, zones sûres |

---

## 21. Résumé en une page

- **Un espace de travail possède tout** ; rien ne fuit d’un compte à l’autre.
- **Le stockage local est la vérité** ; le cloud est une copie organisée qui
  arrive toutes les trois minutes, jamais avant la saisie.
- **Le cahier est un arbre immuable** projeté en lignes : la même projection
  sert à l’écran, au papier, aux alertes et au compagnon.
- **La sélection est un ensemble de clés**, pas de positions : elle survit au
  filtre, au repli et au déplacement, et n’agit jamais sur une ligne disparue.
- **Quatre branchements seulement** : écrire, projeter, observer, décider. Ils
  échangent des faits, jamais des ordres.
- **Seize natures d’évaluation** ; chacune ne peut porter que ce qu’elle sait
  porter (note, remise, cahier, absents, correction) et la direction ne peut que
  restreindre.
- **L’impression a deux barres** : une barre haute qui ne défile pas, une barre
  basse qui porte l’unique action avec le nombre exact de séances.
- **Les séances naissent des dates** : mêmes dates = une séance, une remarque,
  une cellule ; les structures séparent, les contenus se suivent.
- **Les numéros sont calculés**, sauf quand l’enseignant écrit le sien — qui
  devient alors la référence pour la suite.
- **Les évaluations sont des blocs datés** liés à des prévisions ; les conflits
  sont signalés, jamais bloquants.
- **Le calendrier marocain, l’année scolaire et les absences filtrent tout** :
  aucune séance n’est inventée un jour non travaillé.
- **Les rappels sont minutés, uniques et silencieux quand il faut**.
- **Le robot arbitre** selon un ordre strict : réparer d’abord, enseigner
  ensuite, configurer en dernier — et il ne montre qu’une action à la fois.
- **Rien n’est perdu, rien n’est silencieux, rien n’est irréversible.**
