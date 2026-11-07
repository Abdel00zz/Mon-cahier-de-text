# Le tableau — gestes, fusion intelligente, associations et branchements

Ce document décrit **comment le tableau du cahier se manipule** : ce qu’un clic
fait, comment les lignes se groupent, comment une date s’affecte ou se dissocie,
ce qui s’associe automatiquement, comment une ligne se déplace d’un chapitre à
un autre, ce qui peut être annulé, et ce qui part vers l’impression, les
évaluations ou le cloud.

## Présentation de lecture — 7 novembre 2026

À l’écran, les trois rôles date / contenu / remarque restent associés aux
mêmes données et aux trois colonnes visibles **Date · Contenu · Remarque**.
La date et la remarque deviennent des pastilles à l’intérieur de leurs colonnes.
Une séance fusionnée garde une seule date et une seule remarque partagées.
Les blocs sans date gardent des commandes discrètes de datation et de remarque.
La lettre de section est un badge carré arrondi. Lexend compose les contenus,
Bricolage Grotesque les titres et IBM Plex Sans Arabic les textes arabes.

Ce changement concerne le rendu CSS et les repères accessibles. Le calcul de
l’ordre, les limites de déplacement, la hiérarchie, les clés de ligne, la
sélection, les fusions et l’historique restent ceux décrits ci-dessous. Les
colonnes imprimées et les formules KaTeX conservent leur composition.

Pour les formes de données, voir [le modèle JSON](json.md). Pour le papier,
voir [l’impression](peint.md). Pour les évaluations, voir
[le contrat de capture](docs/architecture/workflow-evaluations.md).

Vocabulaire employé :

| Terme | Sens exact dans ce document |
|---|---|
| **Ligne** | Une entrée du cahier projetée à l’écran (chapitre, section, contenu, ligne libre) |
| **Rangée** | Ce qui est réellement dessiné : une ligne seule, ou une séance fusionnée |
| **Séance** | Ensemble de lignes consécutives partageant une date (ou un même contenu à plusieurs dates) |
| **Groupe** | Les lignes réunies pour l’affichage et les gestes de séance |
| **Cible** | Le point d’insertion ou de dépôt |
| **Plan** | Le calcul préalable d’un déplacement, avant toute écriture |
| **Mutation** | Une écriture unique et annulable du cahier |

---

## 1. Ce qu’est le tableau

Le tableau édite le cahier dans trois colonnes. Chaque entrée du document
donne une ligne de travail. Plusieurs lignes peuvent partager une rangée de
séance à l’écran.

| Colonne | Contenu | Gestes propres |
|---|---|---|
| **Date** | La date de la séance, ou plusieurs dates si la séance est double | Un clic **ouvre la date**, il ne sélectionne pas |
| **Contenu** | Chapitre, section, contenu numéroté, ligne libre | Un clic **sélectionne**, un double-clic **édite** |
| **Remarque** | La remarque de la séance, les activités, les absents | Un clic **ouvre la remarque** |

Règle structurante : **ce qui est cliqué décide de l’action**. Cliquer sur une
date ne sélectionne jamais la ligne ; cliquer sur un contenu ne change jamais la
date. Chaque cellule a un seul métier.

---

### 1.1 De l’arbre à la rangée

1. **Parcourir le plan.** Le chapitre vient avant ses contenus directs, puis
   ses sections. À chaque niveau, les contenus directs précèdent les
   sous-titres. Chaque ligne retient son chemin, sa position dans l’ordre
   d’origine et ses ancêtres.
2. **Séparer le type de l’emplacement.** Une évaluation insérée au milieu
   d’une section reste une évaluation. Une ligne libre reste hors plan,
   même sous un titre. Le niveau règle le retrait, tandis que le type
   détermine le rendu et le rôle pédagogique.
3. **Filtrer puis grouper.** La recherche conserve les ancêtres des résultats
   et leur ordre source. La fusion vérifie les positions d’origine pour
   éviter de réunir deux lignes qu’un résultat masqué séparait.
4. **Composer la grille.** Une grille commune aligne en-tête, lignes et
   séances fusionnées. Les colonnes latérales ont des minima adaptés à
   l’écran. Le contenu prend la place restante et revient à la ligne.

La clé de ligne sert à retrouver une position dans l’arbre. L’identité
persistante d’une évaluation ou d’une activité sert à retrouver son suivi
après une modification de date ou un déplacement. Le rendu, la recherche et
l’impression partagent le parcours de [`lessonRows.ts`](src/domain/notebook/lessonRows.ts).

## 2. La carte des gestes

| Geste | Où | Effet |
|---|---|---|
| **Clic** | Cellule de contenu | Sélectionne la ligne. Si la cellule représente un contenu répété, elle sélectionne ses occurrences ensemble |
| **Double-clic** | Cellule de contenu | Ouvre l’édition du contenu, **après avoir rétabli** l’état de sélection modifié par le premier clic |
| **Clic** | Cellule de date | Ouvre la fenêtre de date (affecter, retirer, plage) |
| **Clic** | Cellule de remarque | Ouvre l’édition de la remarque — une seule cible, donc une seule saisie et une seule annulation pour tout le groupe |
| **Clic** | Poignée de déplacement | Active le choix d’une destination sans sélectionner le contenu |
| **Entrée ou Espace** | Cellule de contenu focalisée | Équivalent du clic de sélection |
| **Flèches haut / bas** | Poignée focalisée | Déplace la ligne (ou le groupe) d’un cran, sans souris |
| **Glissement** | Poignée | Déplacement avec aperçu ; dépôt avant ou après une cible |
| **Échap** | Pendant un glissement | Annule le geste (annonce vocale de l’annulation) |
| **Balayage vers le bas** | Barre de sélection | Désélectionne (seuil 44 px) |
| **Clic hors de la liste** | Barre de sélection | Désélectionne |
| **Ctrl / Cmd + S** | Éditeur | Enregistre et déclenche un envoi, sauf si une fenêtre est ouverte |
| **Ctrl / Cmd + Z** | Éditeur | Annule (ignoré pendant une saisie) |
| **Ctrl / Cmd + Maj + Z ou Ctrl + Y** | Éditeur | Rétablit (ignoré pendant une saisie) |

Trois protections dans les gestes :

1. **Les éléments interactifs ne sélectionnent pas** : un clic sur un bouton, un
   champ, un lien ou une zone de texte éditable est ignoré par la sélection.
2. **Le double-clic n’est pas deux sélections** : le premier clic a déjà basculé
   la ligne, le second ne la rebascule pas.
3. **Le glissement n’est pas une sélection** : la capture du pointeur est prise
   sur la poignée, jamais sur la rangée, sinon le glissement volerait le clic.

---

## 3. La sélection

### 3.1 Ce qu’une sélection retient

Une sélection est un ensemble de **clés de coordination** (`chapitre | section |
sous-section | sous-sous-section | item`) et des coordonnées associées. Elle ne
retient jamais un texte, ni un objet : une ligne déplacée reste identifiable.

### 3.2 Ce qui se sélectionne réellement

| Point cliqué | Ce qui est sélectionné |
|---|---|
| Ligne isolée | Elle seule |
| Contenu distinct dans une fusion par date | Cette ligne seulement |
| Rangée d’un contenu répété (même intitulé, plusieurs dates) | Tout le groupe de ce contenu |

Le calcul des groupes est **partagé** avec le rendu : l’écran et les actions
utilisent exactement la même liste. Une sélection ne peut donc pas viser une
autre ligne que celle qui est dessinée.

### 3.3 Les actions de la barre

| Action | Quand elle existe | Effet |
|---|---|---|
| **Aujourd’hui** | Une date peut être affectée, et toutes les lignes ne portent pas déjà la date du jour | Affecte la date du jour |
| **Choisir une date** | Une date peut être affectée | Ouvre la fenêtre de date |
| **Modifier** | **Un seul** contenu est sélectionné | Ouvre l’édition |
| **Dissocier la date** | Au moins une ligne porte une date | Retire la date (et la remarque, qui n’a plus de séance) |
| **Ajouter après** | Une cible d’insertion existe | Insère après la **dernière** ligne sélectionnée dans l’ordre du cahier |
| **Supprimer** | Toujours | Demande confirmation, puis supprime le lot |
| **Fermer** | Toujours | Désélectionne |

Deux règles de situation :

- **« Aujourd’hui » disparaît** quand tout porte déjà la date du jour : un bouton
  qui ne changerait rien ne doit pas être proposé.
- **« Modifier » n’existe que pour un contenu unique** : modifier dix contenus à
  la fois n’a pas de sens, et le formulaire ne saurait pas quoi afficher.

### 3.4 Le verrou de transition

Pendant qu’une sélection se recalcule, **toutes les actions sont verrouillées**.
Aucune mutation ne doit partir d’une sélection qui n’est pas encore à jour : c’est
la cause classique d’une suppression « d’une autre ligne que celle vue ».

### 3.5 Accessibilité

La barre se parcourt aux flèches (début et fin compris), s’annonce
vocalement (nombre de lignes, présence d’une date), et se ferme par Échap. Le
nombre de lignes est utilisé pour l’annonce, jamais affiché comme décoration.

---

## 4. Le groupement intelligent (la fusion)

Le tableau ne montre pas une ligne par nœud : il montre des **séances**. Deux
formes de fusion existent, calculées dans une seule passe.

### 4.1 Fusion par la date

Des contenus **consécutifs** qui portent la même date forment une seule séance.

| Règle | Détail |
|---|---|
| Consécutivité réelle | Les lignes doivent se suivre dans l’arbre d’origine, pas seulement à l’écran : un filtrage ne doit pas rapprocher deux séances étrangères |
| Garde-fou | Le moteur borne chaque groupe à **120 lignes**, y compris pour la fusion par contenu |
| Rupture | Une **séquence de contenu répété** qui commence (même intitulé, autre date) coupe la séance : elle aura sa propre fusion |
| Date absente | Une ligne sans date ne fusionne pas par la date |

### 4.2 Fusion par le contenu

Un **même contenu** répété sur des lignes consécutives à des dates différentes
forme une rangée à plusieurs dates. Si les deux fusions peuvent commencer
au même endroit, la fusion par contenu prend la priorité. Elle conserve
l’ordre du cahier.

| Règle | Détail |
|---|---|
| Identité | Type + numéro + titre + description + page, normalisés (Unicode NFC, espaces compactés) |
| Dates | Chaque ligne doit porter une date, et deux dates consécutives doivent différer |
| Structures | Les chapitres, sections, sous-sections et sous-sous-sections sont exclus de la fusion par contenu |
| Ligne libre | Son identité est son texte (titre + description), préfixée pour ne pas la confondre avec un contenu typé |

### 4.3 La remarque d’une séance

Une rangée fusionnée présente une cellule Date et une cellule Remarque.
La date peut contenir plusieurs jours.

| Cas | Comportement |
|---|---|
| Aucune remarque, une seule, ou plusieurs identiques | Le groupe affiche une remarque partagée |
| Plusieurs remarques différentes | La cellule commune affiche leurs textes distincts, sur des lignes séparées |
| Remarque de groupe enregistrée | Le nouveau texte est porté par la dernière ligne du groupe et les autres champs remarque sont retirés |
| Remarque vidée | Le champ est **supprimé** du JSON, pas laissé en chaîne vide |
| Date retirée | La remarque est retirée avec elle : une remarque sans séance n’a pas de sens |

### 4.4 Ce que le groupement change à l’écran

- Un filet d’entrée et de sortie marque le début et la fin d’une **suite datée**,
  sans jamais couper l’intérieur d’un groupe.
- Une ligne sans date ne dessine pas de trait entre les textes : elle se lit
  comme un contenu continu.
- Une séance en alerte (date impossible, recul de date) teinte l’ensemble du
  groupe, pas une seule cellule.

La date et la remarque couvrent la hauteur du groupe. Dans une fusion par
date, les contenus restent distincts, séparés par des pointillés dans leur
colonne. Dans une fusion par contenu, l’intitulé commun n’apparaît qu’une fois.
Le regroupement est une projection de [`tableRows.ts`](src/domain/notebook/tableRows.ts)
et de [`SessionGroupRow.tsx`](src/features/editor/SessionGroupRow.tsx).

---

## 5. Affecter et dissocier une date

### 5.1 Une intention, deux portes

La même fenêtre sert deux intentions :

| Intention | Déclencheur | Titre |
|---|---|---|
| **Date** | Clic sur la cellule de date, ou « Choisir une date » | « Affecter une date » |
| **Remarque** | Clic sur la cellule de remarque | « Remarque de la séance » |

Les deux passent par **une seule transaction** : aucun brouillon partiel n’est
jamais écrit.

Dans une fusion par date, la cellule Date vise le contenu sélectionné s’il
est seul dans le groupe. Sinon, elle vise le contenu à la hauteur du clic
et se replie sur la première ligne au clavier. L’action de barre agit sur
la sélection. Modifier la remarque vise la séance entière.

### 5.2 Ce que la fenêtre propose

| Élément | Rôle |
|---|---|
| **Affecter** | Applique la date choisie aux lignes ciblées |
| **Retirer les dates** | Dissocie les dates des lignes ciblées, avec un rappel de conséquence |
| **Hier / Aujourd’hui / Demain** | Raccourcis d’une journée |
| **Calendrier** | Choix libre, avec sélecteur natif quand il existe |
| **Plage** | Deux dates liées par un connecteur pédagogique (« du … au … », « … et … ») |
| **Activités** | Pastilles d’activités rattachées à la séance (contrôle des cahiers, remédiation, soutien, rattrapage) |
| **Devoir maison** | Pastille « Devoir maison N donné », avec détection du numéro et création du devoir dans la feuille |
| **Documents** | Sujets ou documents associés, avec aperçu |

### 5.3 Les alertes en direct

Chaque changement de date recalcule :

| Alerte | Source |
|---|---|
| Jour non travaillé, férié, vacances | Calendrier scolaire |
| Absence justifiée | Absences de l’enseignant |
| Séance hors emploi du temps | Emploi du temps de la classe |
| **Recul de date** | Ordre chronologique du contenu (voisins datés) |
| Conflit propre à la sélection | Contrôle propre au déplacement d’un groupe |

### 5.4 La revue avant écriture

Si des avertissements existent, une **revue** s’affiche au lieu d’écrire :

- un avertissement **bloquant** empêche la confirmation ;
- l’utilisateur peut revenir modifier la date ;
- confirmer applique **une seule** mutation, donc **une seule** annulation.

Deux protections supplémentaires :

1. **Fraîcheur de la source** : si le cahier a changé (autre révision) entre
   l’ouverture et la confirmation, l’écriture est abandonnée et l’interface
   prévient — jamais d’application sur une version périmée.
2. **Dates mixtes** : si les lignes sélectionnées portaient des dates
   différentes, la fenêtre le dit (« les dates seront conservées ») au lieu de
   laisser croire à une uniformisation.

---

## 6. Les associations automatiques

Le tableau n’est pas seul : certaines écritures créent ou relient des objets
ailleurs. C’est là que se joue l’intelligence du carnet.

### 6.1 Devoir maison : une seule écriture, plusieurs effets

| Élément | Effet |
|---|---|
| Pastille posée dans la remarque | Annote la séance |
| Devoir créé dans la feuille d’évaluations | Document, remise élève par élève |
| Numéro | Détecté à partir des devoirs déjà donnés (feuille + dates), jamais recompté à 1 |
| Deux temps distincts | « Donné » et « Correction » sont **deux lignes** du même devoir : chaque détection ignore l’autre temps |
| Attribution retirée puis reposée | Le devoir **renaît** au lieu de rester une trace morte |
| Bloc « Correction du devoir maison » | Date le **second** temps ; le numéro du titre l’emporte, sinon c’est le devoir qui attend encore sa correction |

### 6.2 Capture des activités et évaluations

Le tableau est la porte de saisie. **Ajouter un contenu** pose les blocs
typés d’épreuve ou d’activité. La **remarque d’une séance datée** fournit
le contrôle des cahiers, la remédiation, le soutien et le rattrapage,
saisis par puce ou reconnus dans le texte. Le devoir maison donné passe
par la puce de remarque ou la carte du même nom.

La feuille « Contrôle continu et activités » reçoit ces entrées pour les
suivre. La capture parcourt tout le document, y compris les blocs imbriqués,
indépendamment de la recherche et des lignes montées à l’écran. Les critères
de détection et les cas sans date sont dans
[le contrat de capture](docs/architecture/workflow-evaluations.md#4-flux-et-sens-des-écritures).

### 6.3 Documents de séance

Un devoir ou une activité peut porter un sujet. Si un document existe,
le titre du contenu peut devenir cliquable avec une icône de fichier, ou
un bouton portant le titre du document peut apparaître sous la remarque
de la séance. L’aperçu s’ouvre en lecture sans sélectionner la ligne.

### 6.4 Évaluations : synchronisation raisonnée

| Situation | Comportement |
|---|---|
| Contenu ajouté ou daté | L’évaluation correspondante est créée ou datée |
| Contenu supprimé ou dédaté | L’identité de l’évaluation est conservée : documents et suivis d’élèves **restent attachés** à leurs identifiants stables |
| Remarque modifiée | Les activités détectées sont recalculées à partir du texte daté. Le rendu écarte les annotations qui répètent la remarque |
| Devoir d’un planning officiel daté par le professeur | Transmis à la feuille « Contrôle continu et activités » |

### 6.5 Chapitres officiels

L’association d’un chapitre du cahier à un chapitre du programme est stockée par
classe. Elle est **invalidée** dès que le titre ou l’index du cahier change : une
progression calculée sur une association périmée mentirait.

---

## 7. Réordonner une ligne ou une séance

### 7.1 Le principe : d’abord un plan, ensuite une mutation

Aucun déplacement n’écrit directement. Un **plan** est d’abord calculé ; s’il est
refusé, rien ne bouge et l’interface le sait (`canReorder` renvoie faux, donc la
poignée ne promet rien). S’il est accepté, **une seule** mutation applique le
plan, donc **une seule** annulation.

### 7.2 Les quatre plans

| Plan | Situation | Peut changer de parent ? |
|---|---|---|
| **Permutation entre frères** | Glissement avant ou après une ligne du même parent | Non |
| **Déplacement d’un cran** | Flèche haut/bas sur la poignée | Non (sauf bord de liste) |
| **Relocalisation** | Ligne **libre** qui suit l’ordre de lecture | Oui, y compris « sous un titre » |
| **Transfert** | Bloc d’**exercices** au bord d’une liste, ou contenu autonome vers la racine | Oui |

### 7.3 Les règles de refus

| Refus | Pourquoi |
|---|---|
| Les lignes ne forment pas un **bloc contigu** de frères | Un retrait atomique est impossible |
| Des trous dans la sélection | Le bloc ne serait pas un bloc |
| Les lignes viennent de **parents différents** | On ne déplace pas deux branches à la fois |
| Destination identique à la source | Aucun changement : pas de mutation |
| Dépôt à l’intérieur de sa propre sélection | Le bloc se mangerait lui-même |
| Transfert demandé alors que le bord de liste n’est pas atteint | Une permutation suffit |
| Transfert d’un contenu qui n’est ni un exercice ni autonome | Les structures gardent leur place |

### 7.4 Ce qui peut sortir d’un chapitre (« hors chapitre »)

| Type | Peut aller à la racine | Peut entrer dans un chapitre ou un paragraphe |
|---|---|---|
| Ligne libre | Oui | Oui |
| Évaluation et correction (sans enfants) | Oui | Oui |
| Exercice | Non | Oui (n’importe quel paragraphe, même vide) |
| Chapitre, section, sous-section | Non (garde sa place) | — |
| Contenu ordinaire | Non | Non (permutation seulement) |

Un nœud transféré **conserve son contenu complet** ; seuls les numéros sont
recalculés dans le chapitre d’arrivée. Rien n’est dupliqué.

### 7.5 Le geste en détail

| Aspect | Règle |
|---|---|
| Capteur | La poignée uniquement ; un glissement démarré ailleurs ne déplace rien |
| Tactile | Un seul doigt ; un second doigt annule |
| Aperçu | Copie visuelle du contenu, avec ses badges et formules, soulevée dans sa colonne et suivant le pointeur verticalement. Elle reste dans la zone visible, sans identifiants dupliqués ni prise de focus |
| Défilement automatique | Zone de bord avec accélération progressive (quadratique), jamais un saut brutal |
| Mesures | Les positions sont relevées **avant** de modifier les styles, pour éviter un calcul de mise en page par image |
| Rendu | Une seule image d’animation pilote l’aperçu et le défilement ; React ne redessine qu’au début, à la fin et au changement d’ordre |
| Annulation | Échap, perte de capture, onglet masqué, ou disparition de la source (recherche, remplacement) |
| Après le dépôt | La sélection suit le bloc déplacé ; un mouvement clavier ramène la ligne à l’écran |
| Annonce | Un message vocal confirme le déplacement ou son annulation |

---

## 8. Ajouter, modifier, supprimer

### 8.1 Ajouter

| Ajout | Où il se pose |
|---|---|
| **Ligne libre** | Juste **après** la ligne de contenu visée, dans son propre parent ; **sous** un titre si l’ancre est un titre ; après le dernier chapitre si aucune ancre |
| **Contenu** | Après la dernière ligne sélectionnée, dans l’ordre du cahier |
| **Section / sous-section** | Après la cible indiquée, ou en fin de liste |
| **Bloc d’évaluation** | Après le contenu ciblé dans sa liste, sous un titre de section comme premier item, après un chapitre ciblé à la racine, ou en fin de cahier sans ancre |

Le point d’insertion est calculé sur l’**ordre du cahier**, jamais sur l’ordre des
clics ni sur celui d’une recherche. Une sélection périmée n’insère donc pas
« par défaut » à la fin.

Une ligne libre reste **hors plan** : elle est reconnue par son **type**, jamais
par sa position. Le fait d’avoir un parent ne la fait pas entrer dans la
hiérarchie — aucun numéro, aucune progression, aucun effet sur les chapitres.

### 8.2 Modifier

Le double-clic (ou « Modifier » pour un contenu unique) ouvre le formulaire de
contenu. Les champs disponibles dépendent du type : un chapitre n’a pas de
numéro, une évaluation porte son numéro dans son titre, une ligne libre n’a ni
l’un ni l’autre.

### 8.3 Supprimer

| Étape | Règle |
|---|---|
| Confirmation | Toujours demandée pour un lot |
| Ordre d’exécution | **Le plus profond d’abord**, puis de la fin vers le début |
| Nœud structurel | Ses enfants sont **promus** au parent, jamais détruits |
| Résultat | Une seule mutation, une seule annulation, sélection vidée |

L’ordre profond-d’abord n’est pas une coquetterie : supprimer un parent **décale
les coordonnées** de ses descendants, et un lot mal ordonné retirerait une autre
ligne que celle visée.

---

## 9. Annuler, rétablir, enregistrer

### 9.1 L’historique

| Aspect | Règle |
|---|---|
| Mécanisme | Une copie immuable par mutation ; la modification en place est impossible |
| Capacité | 50 états |
| Mutation sans effet | Non enregistrée (l’identité de l’état est comparée, pas son texte) |
| Effets de bord | Chaque entrée peut porter une action de compensation (par exemple rejouer un enregistrement collatéral) |
| Chargement ou restauration | Remplace l’historique : ce n’est **pas** une édition annulable |
| Raccourcis | Ctrl/Cmd + Z, Ctrl/Cmd + Maj + Z, Ctrl + Y |
| Saisie en cours | Les raccourcis sont ignorés pour ne pas voler l’annulation native d’un champ |

### 9.2 L’enregistrement

| Déclencheur | Effet |
|---|---|
| Édition | État « non enregistré » puis sauvegarde différée |
| Ctrl/Cmd + S | Sauvegarde forcée, puis envoi cloud |
| Onglet masqué | Sauvegarde forcée immédiate |
| Fermeture de la page | Sauvegarde forcée immédiate |
| Sortie de l’éditeur | Sauvegarde forcée |

La règle : **quitter vite ne peut pas annuler la dernière saisie**. Le
déclencheur de fermeture existe précisément parce qu’une sauvegarde différée
n’a pas toujours le temps de partir.

---

## 10. Rechercher

| Aspect | Règle |
|---|---|
| Délai | La saisie est amortie (150 ms) avant de filtrer |
| Champs | Titre, description, remarque, numéro, page, nom, contenu, date |
| Contexte | Une ligne trouvée **conserve ses ancêtres** : on voit dans quel chapitre elle se trouve |
| Surlignage | Le terme est surligné dans les lignes |
| Focus | Deux points d’entrée distincts (téléphone, bureau), avec gestion de la composition (langues asiatiques) |
| Fermeture | Clic hors de la zone ou Échap |

Un filtrage ne doit jamais **rapprocher** deux séances étrangères : le groupement
vérifie la contiguïté dans l’arbre d’origine, pas dans la liste filtrée.

---

## 11. Échanger des données

| Opération | Choix proposés | Règles |
|---|---|---|
| **Import** | Remplacer tout le cahier, ou ajouter au cahier existant | Remplacer exige une **confirmation explicite** ; l’aperçu est obligatoire avant l’écriture |
| **Export** | Tout le cahier, ou les blocs cochés | Aucune recopie, aucune renumérotation : le fichier reste réimportable tel quel |
| Bornes | 10 Mio par fichier | Un fichier trop gros est refusé avant lecture |
| Aperçu | Blocs, contenus, poids réel de chaque bloc | L’aperçu de taille ne ment pas |
| Échec | Message explicite, cahier local conservé | Un import raté n’efface rien |

Les détails de normalisation et de budgets appartiennent à `json.md` ; ceux du
papier à `peint.md`.

---

## 12. Les états visuels d’une ligne

### 12.1 Badges de contenu

Le badge donne la **nature du contenu**. Son sigle est suivi du numéro quand
il existe. Le nom complet figure dans l’infobulle. La numérotation peut être
réglée à l’échelle du chapitre, de la section ou du document. Un numéro saisi
prime sur le calcul. Les structures ont leur propre repère de plan.

| Famille de teinte | Sigles et noms |
|---|---|
| Bleu | **DÉF** Définition, **INTRO** Introduction |
| Neutre | **REM** Remarque de contenu, **DÉM** Démonstration / Preuve, **MÉTH** Méthode, **PROTO** Protocole |
| Rouge | **THM** Théorème, **PROP** Proposition, **LEM** Lemme, **COR** Corollaire, **CONS** Conséquence, **RÈGLE** Règle, **PROPR** Propriété, **REL** Relation, **LOI** Loi, **PRINC** Principe, **SÉC** Consigne de sécurité |
| Violet | **ACT** Activité de recherche ou de découverte |
| Vert | **EX** Exemple, **EXO** Exercice, **APP** Exercice d’application, **OBS** Observation, **COMP** Comparaison, **CLASS** Classification, **STRUCT** Structure, **FONC** Fonction, **MÉCA** Mécanisme, **PROC** Processus, **EXP** Expérience, **INTERP** Interprétation, **CONCL** Conclusion, **GRAND** Grandeur, **MOD** Modèle |

**REM** désigne un item du cours dans la colonne Contenu. La remarque de
séance est le texte de la troisième colonne. **ACT** identifie un item du
cours. La capture des activités à suivre utilise les blocs et remarques
décrits au §6.2. Les sigles et teintes viennent de
[`type-keys.ts`](src/constants/type-keys.ts).

### 12.2 Alignements et éléments sans badge

| Élément | Rendu dans le tableau |
|---|---|
| En-têtes Date, Contenu, Remarque | Tous centrés horizontalement et verticalement dans leur cellule, en français comme en arabe |
| Date | Centrée horizontalement. Dans un groupe, la cellule est aussi centrée en hauteur |
| Chapitre | Titre centré et marqué par la typographie, sans badge de type |
| Épreuve, activité à bloc, correction | Titre centré, y compris quand le bloc est imbriqué. Le retrait peut varier. Le numéro éventuel fait partie du titre |
| Section, sous-section, sous-sous-section | Titre au bord de lecture, avec retrait progressif et repère de plan. Le style classique donne par exemple **A.**, **1.**, **i.** |
| Item de cours | Badge sur la ligne de base du titre. Le titre, la description et la page s’alignent sur la colonne de texte |
| Ligne libre | Texte au bord de lecture, sans badge ni numéro automatique |
| Remarque de séance et annotations | Au bord de lecture. La cellule commune est centrée **verticalement** dans le groupe |
| Aperçu de document | Bouton sous la remarque, centré dans cette colonne, ou titre cliquable avec icône dans la colonne Contenu |

Le bord de lecture correspond au début de la ligne, à gauche en LTR et à
droite en RTL. La direction des titres et remarques suit leur texte, et les
numéros sont isolés pour garder leur ordre. Voir
[`ContentRenderer.tsx`](src/features/editor/ContentRenderer.tsx) et
[`editor-surface.css`](src/styles/editor-surface.css).

Le filet vertical entre Contenu et Remarque reste continu, y compris pour
les lignes non datées. Les icônes de date et de remarque vides sont grises
et discrètes (opacité de 55 %, renforcée au survol ou au focus), dans une cible
tactile inchangée de 44 px minimum.

Dans la fenêtre de remarque, les puces d’action **Devoir à la maison assigné
aux élèves**, **Contrôle des cahiers**, **Remédiation**, **Soutien** et
**Rattrapage** aident à saisir la séance. Une fois dans le tableau, les
annotations correspondantes se lisent en texte dans la colonne Remarque.

### 12.3 Repères d’interaction

| État | Signification |
|---|---|
| Repos | Ligne normale |
| Survol | Zone cliquable repérée, sans couleur d’action |
| **Sélectionnée** | Aplat d’accent sur la rangée **entière** (date, contenu, remarque) |
| **En cours d’édition** | Même aplat, un cran plus dense, avec un filet de 1 px |
| **En alerte** | Teinte d’avertissement portée par le groupe |
| **Séance** | Filet d’entrée et de sortie, intérieur continu |
| **Ligne libre** | Pointillés : hors plan |
| **En déplacement** | Source estompée, aperçu flottant, cible repérée |

Deux états d’action sont portés par **un seul attribut** pour qu’ils se cumulent
sans se confondre : « sélectionné » et « édition ».

---

## 13. Performance

| Mécanisme | Seuil ou règle |
|---|---|
| Virtualisation | Au-delà de **140 lignes** projetées avant fusion. Le navigateur monte les rangées autour de la zone visible avec une marge de 16. Il estime la hauteur à partir de 72 px, tient compte des groupes et mesure les hauteurs réelles |
| Cache des lignes | Une projection par version du cahier (le cahier est immuable, l’identité du tableau est donc une clé sûre) |
| Cache du groupement | Une fois par liste de lignes ; une édition produit une nouvelle liste, donc un nouveau calcul |
| Validation du calendrier | Résultat partagé par date, classe, langue et réglages ; invalidation lorsque le calendrier officiel est actualisé. Cache local borné à 512 dates |
| Composition du contenu | Des coordonnées recréées mais identiques ne recomposent pas les textes et formules inchangés. Déplacement, édition, recherche et document restent invalidants |
| Sélection | Mise à jour immédiate, sans passage différé qui désactive brièvement les actions de date |
| Mémoïsation | Une rangée ne se redessine que si une valeur affichée change ; l’oubli d’une fonction d’aperçu figerait les pastilles |
| Largeurs | Une seule source de largeurs pour toute l’application, redéfinie pour le téléphone avec des **bornes minimales** |
| Références stables | Aucune valeur par défaut littérale (`[]`) dans les dépendances de mémoïsation |

---

## 14. Branchements réciproques

| Circuit | Dépend de | Déclenche |
|---|---|---|
| Sélection | Groupes calculés, lignes visibles | Barre d’actions, actions situationnelles |
| Affectation de date | Emploi du temps, calendrier, absences, ordre du contenu | Mutation unique, revue, historique, enregistrement |
| Groupement | Dates, identités normalisées, contiguïté réelle | Rangées, sélections, impression, numérotation |
| Remarque | Groupe cible, activités, devoirs | Événements pédagogiques, feuille d’évaluations |
| Devoir maison | Feuille d’évaluations, dates, suppressions | Pastille, devoir, documents, remises |
| Réordonnancement | Plans, groupes, conteneurs | Mutation unique, sélection mise à jour, annonce vocale |
| Suppression | Profondeur des coordonnées | Promotion des enfants, mutation unique |
| Historique | Mutations et effets de bord | Annuler / rétablir |
| Enregistrement | État de sauvegarde, visibilité, fermeture | Cahier local, marque « à envoyer », cloud |
| Impression | Lignes, numéros gelés, signatures | Nouveautés, historique d’impression |
| Compagnon | Anomalies et progression lues dans le cahier | Diagnostic, tâche, posture |
| Synchronisation | Marques posées par l’éditeur | Envoi différé, fusion |

---

## 15. Invariants

1. **Une cellule, un métier** : la date ouvre la date, le contenu sélectionne ou
   édite, la remarque ouvre la remarque.
2. **La cible dépend du geste.** La remarque vise la séance. La sélection,
   la date et le déplacement peuvent viser un contenu d’une séance à date
   commune. Les occurrences d’un contenu fusionné restent liées.
3. **Le point d’insertion suit l’ordre du cahier**, jamais l’ordre des clics.
4. **Aucun déplacement sans plan accepté** ; aucun plan sans mutation unique.
5. **Un déplacement refusé ne promet rien** : la poignée ne s’active pas.
6. **On ne déplace que des frères contigus**, jamais deux branches à la fois.
7. **Suppression profonde d’abord** ; un parent supprimé promeut ses enfants.
8. **Une remarque par séance**, écrite sur la dernière ligne du groupe.
9. **Une date retirée retire sa remarque.**
10. **Toute action passe par une seule mutation annulable** ; un chargement n’est
    pas annulable.
11. **Quitter vite n’annule pas la dernière saisie.**
12. **Le filtrage ne rapproche pas deux séances étrangères.**
13. **Une ligne libre reste hors plan**, quoi qu’il arrive à sa position.
14. **Aucune copie de libellé d’activité** ne survit à côté de sa pastille.
15. **Une association de chapitre périmée est invalidée**, jamais réutilisée.
