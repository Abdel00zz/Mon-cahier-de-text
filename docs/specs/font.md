# Les polices — rôles, support arabe et latin, chargement et licences

Ce document décrit **la politique typographique de l’application** : quelle
famille sert à quoi, comment l’arabe et le latin cohabitent dans la même ligne,
comment une police arrive sur l’appareil, ce qui est embarqué, ce qui reste
déclaré sans usage, et quelles licences couvrent chaque fichier.

Il décrit des rôles et des règles, sans citer de fichier. Pour les tailles et les
contrastes, voir `style.md` ; pour le papier, voir `peint.md` ; pour les
ressources livrées, voir `public.md`.

Vocabulaire employé :

| Terme | Sens exact dans ce document |
|---|---|
| **Rôle** | Un usage nommé (corps, titre, lecture, secondaire, document) — jamais une famille en dur |
| **Pile** | La liste de familles essayées dans l’ordre |
| **Plage de caractères** | L’intervalle Unicode qu’un fichier de police couvre réellement |
| **Substitution** | Le passage automatique à la famille suivante quand un caractère manque |
| **Police variable** | Un seul fichier qui couvre toute la plage de graisses |
| **Famille déclarée** | Une famille chargée mais qu’aucun rôle n’utilise |

---

## 1. La règle fondatrice : un rôle, jamais une famille

Aucun composant ne choisit une famille. Il choisit un **rôle**, et le rôle est
résolu par la politique typographique.

| Rôle | Usage |
|---|---|
| **Interface** | Corps de l’application, boutons, champs, menus |
| **Titre** | Titres d’écran et de section |
| **Titre de l’éditeur** | En-tête du cahier |
| **Secondaire** | Libellés, légendes, badges, aides |
| **Contenu** | Tableau du cahier, texte pédagogique |
| **Document** | Feuilles de devoir et documents imprimés |
| **Retour** | Messages courts, états de synchronisation, remarques imprimées |
| **Compagnon** | Textes du robot |

Cette indirection est ce qui permet de changer une police d’interface **sans
toucher un seul composant**, et de garantir qu’un contenu arabe ne se retrouve
jamais composé dans une police latine.

---

## 2. La famille d’interface : une seule, bilingue

L’interface utilise **une seule famille variable**, qui couvre le latin **et**
l’arabe : Readex Pro.

| Propriété | Valeur |
|---|---|
| Formats | Deux fichiers variables (latin, arabe) |
| Graisses | Plage continue |
| Poids par défaut du rôle secondaire | 400 |
| Rôle | Interface, titres d’écran, contenu à l’écran hors éditeur |

**Pourquoi une seule famille ?** Parce qu’un même écran mélange les deux
écritures : le nom d’une classe arabe dans une interface française, une remarque
en français dans une interface arabe. Deux familles différentes produiraient deux
graisses optiques, deux hauteurs d’x et une ligne qui « saute ». Une famille
bilingue donne une **ligne cohérente**, quelle que soit la langue du contenu.

### 2.1 L’inversion de la pile selon la direction

Le rôle n’est pas seulement une famille : c’est un **ordre de préférence** qui
s’inverse selon la direction du texte.

| Direction | Pile du corps |
|---|---|
| Latin (gauche à droite) | Famille latine d’abord, arabe ensuite, puis système |
| Arabe (droite à gauche) | Famille arabe d’abord, latine ensuite, puis système |

L’inversion se recalcule à **chaque frontière de langue ou de direction** : un
texte français dans l’éditeur ne garde pas les réglages arabes, et inversement.
C’est ce mécanisme qui permet à un cahier arabe d’afficher un titre latin sans
que celui-ci paraisse étranger.

---

## 3. L’arabe : trois rôles distincts

| Contexte | Famille | Pourquoi |
|---|---|---|
| **Interface** | Famille bilingue (Readex Pro) | Cohérence avec le latin de la même ligne |
| **Impression d’un cahier** | SamsungOne Arabic | Police système Samsung/One UI, très lisible en petit corps sur papier |
| **Documents A5** | SamsungOne Arabic | Même raison, avec un en-tête administratif arabe |
| **Compagnon** | SamsungOne Arabic d’abord, puis les variantes système Samsung | Le robot parle la langue de l’appareil |

Trois points techniques décisifs pour l’arabe :

1. **Les fichiers latins ne couvrent pas l’arabe.** Chaque police latine déclare
   une **plage de caractères** limitée au latin. Un texte arabe retombe donc
   naturellement sur la famille arabe suivante de la pile, **sans règle de
   langue** à écrire.
2. **Pas d’italique synthétique.** Un arabe penché artificiellement casse les
   ligatures et les attaches. La composition arabe reste **droite**.
3. **Pas d’interlettrage.** Un espacement ajouté entre lettres détache les
   attaches arabes : les libellés arabes des contrôles interdisent
   l’interlettrage, alors que leurs équivalents latins peuvent en avoir.

---

## 4. L’éditeur : une composition, deux écritures

À l’écran, le tableau du cahier n’utilise pas la police d’interface : il utilise
une **fonte de composition** mathématique, et l’arabe garde la police bilingue.

| Élément du cahier | Latin | Arabe |
|---|---|---|
| **Chapitres, blocs de tête, sections** | Computer Modern Sans — Demi Condensed, 600 | famille bilingue |
| **Évaluations, sous-sections, titres d’items** | Computer Modern Sans — Oblique, 500 | famille bilingue |
| **Paragraphes, descriptions, corps de séance** | Computer Modern Sans — Medium, 500 | famille bilingue |
| **Voix marginale** (remarques, pages, puces) | Computer Modern Sans — Oblique | famille bilingue |
| **Numéros de structure** | Medium droit (pour ancrer la marge) | idem |
| **Formules** | Polices mathématiques dédiées (KaTeX) | — |

Quatre règles de composition :

1. **Le crénage est activé et la synthèse de graisse désactivée** : une fonte de
   composition garde ses petites tailles nettes, sans graisse inventée.
2. **Les formules gardent leurs propres fontes** : aucune règle de texte ne
   s’applique à l’intérieur d’une formule.
3. **Le contraste éditorial vient de l’oblique**, pas d’une couleur : le
   sous-titre d’un chapitre bascule en oblique après le deux-points.
4. **L’écran et le papier ont des réglages séparés** : la composition d’écran ne
   contamine pas les métriques du papier.

---

## 5. Le papier : deux familles, un en-tête

| Élément | Famille |
|---|---|
| **Texte du cahier imprimé (latin)** | Latin Modern Sans — regular 400, gras 700, italique |
| **Texte du cahier imprimé (arabe)** | SamsungOne Arabic |
| **Relais latin** | Source Sans 3 (variable, léger) |
| **Pied de page** | La même pile que le corps |
| **Formules** | KaTeX |

Trois règles :

1. **Latin Modern Sans est la fonte de composition LaTeX** : c’est ce qui donne
   au papier son air de document officiel, avec des chiffres et des unités
   cohérents.
2. **Les fichiers ne portent que le latin** : un cahier arabe bascule de lui-même
   sur la police arabe, sans condition.
3. **Repli léger** : Source Sans 3 (un fichier variable de quelques dizaines de
   kilo-octets) sert de relais si Latin Modern n’est pas disponible — inutile de
   charger plus lourd pour du texte.

### 5.1 Les graisses réellement attendues avant impression

Avant d’ouvrir la fenêtre d’impression, la composition **attend le chargement**
de quatre combinaisons : latin régulier, latin gras, latin italique, et arabe
régulier. Sans cette attente, la première page pourrait sortir dans une police
substituée — le défaut classique d’une impression « qui ne ressemble pas à
l’écran ».

---

## 6. Les autres rôles

| Rôle | Famille | Note |
|---|---|---|
| **Retour** | Famille bilingue | Messages courts, état de synchronisation, remarques imprimées arabes |
| **Compagnon** | SamsungOne Arabic, puis variantes système Samsung | Le robot suit la langue de l’appareil |
| **Écran de chargement** | Famille de retour, avec repli Samsung | Aucun texte d’attente dans une police inconnue |
| **Touches de déplacement** | Une famille latine neutre, puis la famille bilingue | Le repère de glissement n’a pas besoin de la finesse éditoriale |
| **Monospace** | Famille à chasse fixe du système | Nombres, identifiants, extraits techniques |

---

## 7. Ce qui est embarqué, ce qui est déclaré

| Famille | Statut | Usage réel |
|---|---|---|
| **Readex Pro** | Embarquée (deux fichiers variables) | Interface et contenu arabe à l’écran |
| **SamsungOne Arabic** | Embarquée | Impression, documents, compagnon, chargement |
| **Latin Modern Sans** | Embarquée (trois fichiers) + licence | Texte imprimé latin |
| **Source Sans 3** | Embarquée (variable) + licence | Relais du texte imprimé |
| **Computer Modern Sans** (quatre fichiers) | Embarquée + licence | Composition de l’éditeur à l’écran |
| **SamsungOne** (système) | Non livrée, cherchée localement | Repli natif sur Galaxy |
| **Arabswell 3**, **Maghribi Font 3** | Embarquées, **déclarées sans rôle** | Réserves de composition arabe |
| **Elgharib Hayyakum Allah** (deux graisses), **KOMission Black** | Embarquées, **déclarées sans rôle** | Réserves d’affichage arabe |
| **Lato, Barlow, Roboto, Open Sans, Lalezar, Amiri, Aref Ruqaa, Lora, Newsreader, Rubik, Roboto Slab, DM Sans, Outfit, Inter, Special Elite** | Embarquées via un catalogue de polices | Réserves : aucune n’est utilisée par un rôle principal |

**Constat assumé** : une quinzaine de familles restent déclarées par héritage de
maquettes successives. Elles ne nuisent pas au rendu — elles ne sont chargées que
si un rôle les demande — mais elles alourdissent la liste des fichiers et
brouillent la lecture de la politique. La règle qui les rend inoffensives : **un
rôle décide, jamais un composant**.

---

## 8. Le chargement

| Règle | Détail |
|---|---|
| **Affichage immédiat du texte** | Chaque police est déclarée avec un affichage de secours : le texte apparaît dans la police suivante puis se substitue |
| **Plage déclarée** | Chaque fichier annonce les caractères qu’il couvre : le navigateur ne télécharge que ce qui sert |
| **Aucun service distant** | Pas de catalogue de polices externe : sans réseau, la typographie reste exacte |
| **Chargement différé** | Les familles de réserve ne sont téléchargées que si un rôle les emploie |
| **Empreinte de build** | Les fichiers sont servis avec les autres ressources et mis en cache à l’installation |
| **Contrôle avant impression** | Les graisses utiles sont attendues explicitement (voir §5.1) |

**Pourquoi bannir le service distant ?** Parce que la première impression hors
ligne d’un professeur se ferait dans une police de secours, et que le cahier ne
ressemblerait plus à ce qu’il a vu.

---

## 9. Les licences

Une police embarquée doit pouvoir être redistribuée. Voici l’état **réel** de la
documentation livrée :

| Famille | Licence attendue | Documentée dans l’application |
|---|---|---|
| **Latin Modern Sans** | GUST Font License | **Oui** — licence dédiée, à côté des polices |
| **Computer Modern Sans** | SIL Open Font License 1.1 | **Oui** — fichier de licence dans le dossier des polices |
| **Source Sans 3** | SIL Open Font License 1.1 | **Oui** — notice de polices |
| DM Sans, Rubik, Roboto Slab, Lato, Newsreader | SIL Open Font License 1.1 | **Oui** — notice de polices |
| **Readex Pro** | SIL Open Font License 1.1 | **Non citée** |
| **SamsungOne Arabic** | Police **propriétaire** (Samsung) | **Non citée** |
| **Arabswell 3**, **Maghribi Font 3**, **Elgharib**, **KOMission** | Non déterminée dans le dépôt | **Non citée** |

**Trois écarts à traiter**, constatés et non supposés :

1. **La famille d’interface n’est pas citée** dans la notice alors qu’elle est
   embarquée : c’est la police la plus visible de l’application.
2. **La police arabe d’impression est propriétaire** : la redistribuer dans un
   paquet suppose une autorisation explicite, ou le remplacement par une famille
   libre équivalente.
3. **Quatre familles de réserve** n’ont aucune provenance documentée : elles
   devraient être soit justifiées, soit retirées.

Règles à tenir :

1. **Une police livrée s’accompagne de sa licence**, dans le dossier public.
2. **Aucune police n’est modifiée** sans vérifier les noms réservés de sa
   licence.
3. **Une police propriétaire n’est jamais redistribuée hors de l’application**
   sans autorisation écrite.

---

## 10. Ce qu’il ne faut pas faire

| Erreur | Conséquence |
|---|---|
| Écrire une famille dans un composant | La politique devient incohérente et impossible à changer |
| Composer de l’arabe dans une police latine | Substitution silencieuse, attaches cassées |
| Ajouter un interlettrage à un libellé arabe | Les lettres se détachent |
| Mettre un arabe en italique synthétique | Ligatures et attaches déformées |
| Charger une police depuis un service distant | Papier faux hors ligne |
| Ajouter une famille « pour essayer » sans rôle | Poids et confusion dans la politique |
| Changer une graisse par `font-synthesis` | Graisse inventée, métriques fausses |
| Composer une formule avec la police du texte | Symboles mathématiques substitués |

---

## 11. Branchements

| Circuit | Ce qu’il reçoit | Effet |
|---|---|---|
| Thème | Rôles et direction | Pile inversée selon la langue |
| Éditeur | Rôles de composition | Titres, corps, voix marginale |
| Impression | Graisses attendues | Composition fidèle, formules intactes |
| Documents A5 | En-tête et corps | Titre arabe ou latin cohérent avec le document |
| Compagnon | Rôle dédié | Texte du robot lisible sur tous les appareils |
| Langue | Direction du texte | Inversion de la pile, arrêt de l’interlettrage arabe |
| Build | Fichiers et licences | Ressources disponibles hors ligne |

---

## 12. Invariants

1. **Un composant choisit un rôle, jamais une famille.**
2. **Une seule famille bilingue pour l’interface** : arabe et latin dans la même
   ligne, même graisse optique.
3. **La pile s’inverse selon la direction du texte**, à chaque frontière.
4. **Une police latine ne couvre pas l’arabe** : la substitution est déclarée,
   jamais subie.
5. **Aucun italique synthétique en arabe ; aucun interlettrage sur l’arabe.**
6. **L’éditeur compose, le papier imprime** : deux réglages, jamais mélangés.
7. **Les formules gardent leurs propres fontes.**
8. **Rien ne vient d’un service distant.**
9. **Chaque fichier annonce sa plage de caractères.**
10. **Une police livrée a sa licence à côté d’elle.**
11. **Une famille déclarée sans rôle reste inoffensive** — mais ne doit pas
    devenir la norme.
