# Les modales de l’éditeur — système, déroulés et enchaînements

Ce document décrit **les fenêtres du tableau éditeur** : la modale de base et ses
comportements, chaque fenêtre et son déroulé exact (ce qui s’ouvre, ce qui se
choisit, ce qui se valide, ce qui s’annule), comment une fenêtre en appelle une
autre, et les règles communes qui empêchent toute perte de saisie.

Il décrit des fenêtres et des enchaînements, sans citer de fichier. Pour les
gestes du tableau lui-même, voir `tabel.md` ; pour le papier, voir `peint.md` ;
pour les formes de données, voir `json.md`.

Vocabulaire employé :

| Terme | Sens exact dans ce document |
|---|---|
| **Feuille** | La présentation mobile : panneau qui monte du bas, poignée, balayage |
| **Dialogue** | La présentation large : panneau centré, sans poignée |
| **Intention** | Le but d’une fenêtre (ajouter, dater, imprimer…), jamais deux à la fois |
| **Brouillon local** | La copie de travail d’une fenêtre, pas encore appliquée au cahier |
| **Étape** | Un écran interne à une même fenêtre (choix, puis formulaire) |
| **Revue** | L’étape de vérification avant une écriture qui mérite un accord |
| **Sortie animée** | Le maintien de la fenêtre fermée le temps de son animation |

---

## 1. Une seule primitive, plusieurs contenus

Toutes les fenêtres de l’éditeur partagent **une seule base**. Ce qui change,
c’est le contenu ; ce qui ne change pas, c’est le comportement : ouverture,
fermeture, focus, clavier, balayage, marges de sécurité, présentation mobile ou
large.

| Réglage de la base | Valeurs | Effet |
|---|---|---|
| **Présentation** | Feuille ou dialogue | Feuille sous un palier d’écran, dialogue au-delà |
| **Largeur** | Dix paliers, de très étroit à plein écran | La fenêtre ne dépasse jamais la largeur utile |
| **Hauteur mobile** | Plafonnée | Une feuille ne mange jamais tout l’écran sans raison |
| **Poignée** | Oui, non, ou contenu personnalisé | Repère de glissement tactile |
| **Balayage pour fermer** | Ouvert ou fermé | Un formulaire en cours peut interdire le balayage |
| **Fermeture bloquée** | Ouverte ou fermée | Une décision obligatoire ne se ferme pas par accident |
| **Bouton de fermeture** | Visible ou masqué | Une invitation peut ne proposer que ses propres actions |
| **Élévation et lueur** | Faible, moyenne, haute ; accent, succès, avertissement, danger | La fenêtre annonce sa gravité avant d’être lue |
| **Direction** | Sens de lecture | L’arabe reste natif, pas miroité à la main |

### 1.1 Les comportements garantis

| Geste | Comportement |
|---|---|
| **Échap** | Ferme la fenêtre — sauf si la fermeture est bloquée |
| **Clic à l’extérieur** | Ferme la fenêtre — même réserve |
| **Balayage vers le bas** | Ferme la feuille — jamais un dialogue, jamais un formulaire qui interdit la sortie |
| **Poignée** | Zone de préhension dédiée, **sans réserve d’espace** quand elle est masquée |
| **Focus** | Confiné dans la fenêtre ; rendu à l’élément d’origine à la fermeture |
| **Clavier** | La hauteur visible est respectée ; le champ actif reste au-dessus du clavier |
| **Marges de sécurité** | Encoche et barres système prises en compte |
| **Empilement** | Une fenêtre au-dessus d’une autre : seule la plus haute répond à Échap |
| **Arrière-plan** | Devient inerte : aucun clic ne peut atteindre le cahier pendant une décision |

### 1.2 Le chargement

Les fenêtres lourdes ne sont pas chargées avec l’éditeur. Elles arrivent à la
demande, avec un **squelette à la forme de la feuille** — titre, corps, pied
d’actions — et non un texte d’attente : la place est déjà celle du contenu, donc
**aucun décalage de mise en page** à l’arrivée.

Une fenêtre qui se ferme reste montée **environ 380 ms** : le temps que son
animation de sortie se termine. Sans cela, elle disparaîtrait d’un coup, ou
afficherait un contenu vidé pendant qu’elle s’efface.

---

## 2. La carte des fenêtres

| Fenêtre | Intention | Écrit-elle dans le cahier ? |
|---|---|---|
| **Ajouter un contenu** | Choisir une nature, puis la décrire | Oui, à la validation |
| **Modifier un contenu** | Corriger ce qui existe | Oui, à la validation |
| **Affecter une date / écrire une remarque** | Situer une séance, l’annoter | Oui, après revue éventuelle |
| **Revue de date** | Vérifier avant d’écrire | Non (elle autorise ou renvoie) |
| **Gérer les leçons** | Réordonner, supprimer, régler numérotation et descriptions | Oui, au retour |
| **Analyse** | Suivre l’avancement, comparer au programme, relier les chapitres | Non |
| **Transfert de données** | Importer, exporter | Oui, à la validation |
| **Impression** | Choisir le contenu et la mise en page | Non (mais elle mémorise l’historique) |
| **Aperçu d’un document de séance** | Lire un sujet en lecture seule | Non |
| **Feuille d’évaluations** | Gérer devoirs et activités | Oui (elle modifie aussi le cahier) |
| **Invitation à l’emploi du temps** | Proposer de renseigner les créneaux | Non |
| **Guide** | Consulter l’aide | Non |

**Principe** : chaque fenêtre a **une intention**. La fenêtre « contenu » ne date
pas, la fenêtre « date » ne change pas le type, l’aperçu ne modifie rien.

---

## 3. Le déroulé d’ajout de contenu

C’est le parcours le plus emprunté : il mérite d’être décrit pas à pas.

### 3.1 Étape 1 — choisir une nature

| Groupe | Contenu | Règle |
|---|---|---|
| **Structures** | Section, sous-section, sous-sous-section | Proposées selon la cible : une section exige un chapitre, une sous-section une section, etc. |
| **Contenu libre** | Ligne libre | Ni numéro, ni progression : hors plan |
| **Contenus** | Leçons, définitions, propositions, théorèmes, activités, exemples, applications, exercices… | Filtrés par la **matière** de la classe |
| **Évaluations** | Diagnostic, contrôle continu, contrôle court, contrôle global, devoir maison, oral, colle, examen blanc, olympiade, concours | Filtrés par **cycle** et par **niveau** : la colle n’apparaît qu’en prépa, l’examen blanc qu’en année d’examen |

Chaque carte indique où le contenu sera posé : « après *tel élément* » ou « à la
fin du cahier ». Ce libellé est calculé sur **l’ordre du cahier**, jamais sur
l’ordre des clics.

### 3.2 Étape 2 — décrire

| Champ | Règle |
|---|---|
| **Type** | Liste restreinte à la matière ; le type déjà choisi reste toujours proposé |
| **Numéro** | Facultatif ; saisi à la main, il prime sur la numérotation automatique |
| **Page** | Facultatif |
| **Titre** | Obligatoire pour une structure et pour un ajout « titre seul » ; facultatif ailleurs |
| **Date** | Proposée pour les évaluations et les blocs datables ; une **plage** est possible (diagnostic, épreuve sur deux jours) |
| **Description** | Éditeur enrichi : gras, italique, souligné, listes, notation mathématique, surlignage, couleurs |
| **Aperçu mathématique** | Affiché dès que la saisie contient une formule : on voit le rendu avant de valider |
| **Langue** | Chaque champ suit **sa propre écriture** : un texte arabe commence à droite même dans une interface latine |

### 3.3 Les règles de validation

| Situation | Comportement |
|---|---|
| Aucune modification | Le bouton d’enregistrement reste **inactif** : une fenêtre ouverte puis refermée sans rien changer n’écrit rien |
| Modification en cours | Le bouton de fermeture demande confirmation implicite par l’inactivité du bouton d’enregistrement |
| Type non proposé à cette classe | La carte n’existe pas ; le type reste accessible en édition pour ne pas bloquer une correction |
| Ajout d’une structure impossible | La carte est **désactivée**, pas masquée : on comprend pourquoi elle ne s’applique pas |

### 3.4 Le cas particulier de l’édition

| Situation | Différence avec l’ajout |
|---|---|
| Étape de choix | Absente : on ouvre directement le formulaire |
| Champs affichés | Selon le nœud : un chapitre n’a pas de numéro, une évaluation porte son numéro dans son titre |
| « Titre seul » | Une structure se renomme sans toucher à ses enfants |
| Portée | Le nombre de lignes réellement modifiées est annoncé (par exemple un contenu répété à plusieurs dates) |

---

## 4. Le déroulé d’affectation d’une date

### 4.1 Deux intentions, une seule fenêtre

| Intention | Ouverture | Ce que la fenêtre met en avant |
|---|---|---|
| **Date** | Clic sur la cellule de date | Affecter, retirer, raccourcis, calendrier |
| **Remarque** | Clic sur la cellule de remarque | La zone de texte, les activités, les documents |

### 4.2 Les opérations disponibles

| Action | Effet |
|---|---|
| **Affecter** | Applique la date à **toute** la séance |
| **Retirer les dates** | Dissocie la séance, avec un rappel de conséquence |
| **Hier / Aujourd’hui / Demain** | Un clic, une journée |
| **Calendrier** | Choix libre, avec sélecteur natif quand il existe |
| **Plage** | Deux dates liées par un connecteur |
| **Activités** | Pastilles d’activités rattachées à la séance |
| **Devoir maison** | Attribution du numéro attendu, création du devoir dans la feuille |
| **Documents** | Sujets associés, avec aperçu en lecture seule |

### 4.3 Les alertes en direct

À chaque changement de date, la fenêtre recalcule : jour férié, vacances,
absence justifiée, séance hors emploi du temps, **recul de date** par rapport au
contenu voisin, et conflit propre au groupe déplacé.

Deux nuances d’affichage :

1. **Une séance passée n’affiche pas d’alerte d’ordre** : on ne reproche pas au
   professeur de dater une séance oubliée.
2. **Un devoir déjà planifié** ne devient jamais un conflit avec lui-même.

### 4.4 L’enchaînement vers la revue

```
[Date choisie] → alertes ? → oui → [Fenêtre de revue] → modifier → retour
                            ↘ non → [Écriture unique] → fermeture
```

| Règle | Détail |
|---|---|
| Revue | Une seule étape, avec la date en clair et les avertissements dédoublonnés |
| Blocage | Un avertissement bloquant désactive la confirmation |
| Retour | « Modifier » revient **exactement** au formulaire, sans perdre la saisie |
| Fraîcheur | Si le cahier a changé entre-temps, l’écriture est abandonnée et l’interface prévient |
| Portée | Une seule mutation, donc **une seule** annulation |

---

## 5. Le déroulé de gestion des leçons

Cette fenêtre travaille sur une **copie locale** : rien n’est appliqué avant le
bouton d’enregistrement.

| Bloc | Contenu |
|---|---|
| **Numérotation** | Activer, choisir le style de structure et de badge, choisir la portée |
| **Descriptions** | Mode d’affichage et types de contenus dont la description apparaît à l’écran |
| **Liste des blocs** | Monter, descendre, supprimer — avec confirmation pour une suppression |
| **Pied d’actions** | Un seul bouton, actif seulement si quelque chose a changé |

Trois règles d’application :

1. **Si seule la configuration a changé**, elle est appliquée et la fenêtre se
   ferme : le cahier n’est pas réécrit pour rien.
2. **Si la liste a changé**, elle est appliquée en une fois et la fenêtre se
   ferme par le même chemin.
3. **Si rien n’a changé**, la fenêtre se ferme sans écrire.

---

## 6. Le déroulé de l’analyse

Une seule fenêtre, **trois vues** :

| Vue | Contenu |
|---|---|
| **Suivi** | Avancement du cahier, chapitres, heures, séances tenues, alertes de date |
| **Programme** | Le programme officiel du niveau, ses chapitres et ses jalons |
| **Relier** | L’appariement entre les chapitres du cahier et ceux du programme |

Deux règles de calcul :

1. **Un seul calcul d’avancement** alimente les trois vues : aucune vue ne peut
   afficher un taux différent d’une autre.
2. **Le catalogue publié n’est chargé qu’à l’ouverture de la vue « Relier »** :
   le suivi ne dépend pas du réseau.

Un lien enregistré dans la vue « Relier » se voit **immédiatement** dans la vue
de suivi : c’est la même vérité, relue.

---

## 7. Le déroulé du transfert de données

| Panneau | Contenu |
|---|---|
| **Importer** | Fichier ou texte collé, aperçu obligatoire, deux modes : remplacer ou ajouter |
| **Exporter** | Tout le cahier, ou les blocs cochés, avec le poids réel de chaque bloc |

Garde-fous propres à cette fenêtre :

| Règle | Détail |
|---|---|
| Aperçu avant écriture | Aucun import n’est appliqué sans avoir montré ce qu’il contient |
| Remplacement | Exige une **confirmation explicite**, en plus de l’aperçu |
| Taille | 10 Mio par fichier, refusé avant lecture |
| Échec | Message explicite, cahier local intact |
| Liste d’export | Calculée **seulement** quand la fenêtre est ouverte : peser chaque bloc à chaque frappe serait inutile et coûteux |
| Double clic | Un verrou empêche un second import simultané |

---

## 8. Le déroulé de l’impression

La fenêtre d’impression choisit **le contenu** et **la mise en page**, puis
laisse la plateforme imprimer.

| Bloc | Choix |
|---|---|
| **Mode** | Nouveautés (recommandé si un historique existe), document complet, séances choisies |
| **Séances** | Sélection par dates, quand le mode le permet |
| **Mise en page** | Taille du texte, aération, numéros de page, couleur, en-tête (première page, toutes, aucun) |
| **Pied** | Action d’impression |

Trois règles d’enchaînement :

1. Les préférences sont mémorisées **dès l’ouverture**, même si l’impression est
   annulée : la fenêtre suivante retrouve les mêmes choix.
2. Le mode recommandé est **resynchronisé** à chaque ouverture ; si les
   nouveautés tombent à zéro, le mode bascule honnêtement sur « complet ».
3. La fenêtre se ferme **avant** l’appel à la plateforme : le document est figé,
   une saisie pendant l’impression ne change pas la feuille.

Détail complet : `peint.md`.

---

## 9. Les fenêtres de confirmation

Une seule primitive de confirmation, avec deux registres :

| Registre | Usage | Comportement |
|---|---|---|
| **Destructif** | Suppression d’un lot, retrait massif | Bouton rouge, lueur de danger, action principale à droite |
| **Neutre** | Remplacement de cahier, choix irréversible mais non destructif | Bouton d’accent |

| Option | Effet |
|---|---|
| **Phrase de confirmation** | Oblige à recopier un texte avant une action très risquée |
| **Indication** | Rappelle la conséquence en une ligne |
| **Attente** | Le bouton affiche un état d’attente pendant l’action |
| **Échap** | Ferme sans agir |

Deux confirmations sont **toujours** demandées : la suppression d’un lot de
lignes, et le remplacement complet du cahier par un import.

---

## 10. L’invitation à renseigner l’emploi du temps

Une fenêtre volontairement **non bloquante**, avec un comportement particulier :

| Propriété | Valeur |
|---|---|
| Fréquence | Une fois par session et par classe |
| Fermeture | « J’ai compris », mémorisé pour la session |
| Échap et clic extérieur | Désactivés : la fenêtre a deux issues explicites |
| Poignée | Masquée, **sans réserve d’espace** au-dessus du titre |
| Balayage | Désactivé |
| Contenu | Le nom réel de la classe, dans la langue de l’application |

Elle n’empêche jamais de travailler : l’action principale mène à l’emploi du
temps, l’action secondaire ferme la fenêtre.

---

## 11. L’aperçu d’un document de séance

| Propriété | Règle |
|---|---|
| Lecture | **Lecture seule** : aucun champ éditable |
| Portée | Le sujet d’un devoir ou d’une activité, tel qu’il sera distribué |
| Langue | Celle du document, pas celle de l’interface |
| En-tête | Le même que la feuille A5 imprimée (titre, classe) |
| Action | Impression possible, avec le même circuit que les documents |

Ce que l’on voit est ce qui sort : l’aperçu et le papier partagent la même
composition.

---

## 12. Les règles communes à toutes les fenêtres

1. **Une intention par fenêtre** : jamais dater et changer le type dans le même
   écran.
2. **Rien ne s’applique avant validation** : les modifications vivent dans un
   brouillon local.
3. **Un bouton actif seulement si quelque chose a changé** : un bouton grisé
   explique mieux qu’un message d’erreur après coup.
4. **Aucune sortie silencieuse d’un formulaire modifié** : la fermeture reste
   possible, mais l’enregistrement est l’action mise en avant.
5. **La fraîcheur est vérifiée** avant toute écriture qui dépend d’un état lu à
   l’ouverture.
6. **Une seule mutation par action** : donc une seule annulation.
7. **Les tailles de cible respectent le doigt** : 44 px au minimum, 48 px sur
   appareil tactile.
8. **Le focus initial** va au premier champ utile, jamais au bouton de fermeture.
9. **Les décisions irréversibles** passent par une confirmation dédiée.
10. **Une fenêtre fermée ne laisse aucune trace** dans le cahier.

---

## 13. Branchements

| Fenêtre | Dépend de | Déclenche |
|---|---|---|
| Contenu (ajout) | Cible sélectionnée, matière, cycle, niveau | Mutation, numérotation recalculée, enregistrement |
| Contenu (édition) | Nœud réel, portée du renommage | Mutation, mise à jour des associations |
| Date / remarque | Emploi du temps, calendrier, absences, devoirs, documents | Revue, mutation, événements, devoirs |
| Revue | Avertissements, fraîcheur du cahier | Confirmation ou retour au formulaire |
| Gérer les leçons | Copie locale, réglages | Liste appliquée **ou** configuration seule |
| Analyse | Cahier, programme, associations | Aucun effet sur le cahier |
| Transfert | Fichier, aperçu, confirmation | Cahier remplacé ou complété |
| Impression | Signatures, préférences | Document figé, historique |
| Aperçu de document | Sujet réel de la séance | Rien (lecture seule) |
| Évaluations | Cahier, feuille, documents | Mutations croisées |
| Invitation emploi du temps | Créneaux manquants | Ouverture des paramètres |

---

## 14. Invariants

1. **Une fenêtre, une intention.**
2. **Rien n’est écrit avant validation**, jamais pendant la frappe.
3. **Un brouillon modifié ne se perd pas** par un retour ou une fermeture.
4. **Le bouton d’action reste inactif sans changement.**
5. **Les décisions destructives demandent une confirmation.**
6. **Une écriture dépendante d’un état lu vérifie sa fraîcheur.**
7. **Une action = une mutation = une annulation.**
8. **La sortie animée ne vide jamais le contenu affiché.**
9. **Le squelette de chargement a la forme du contenu** : aucun saut de mise en
   page.
10. **Échap et le balayage ferment ce qui peut l’être**, et rien d’autre.
11. **Une invitation ne se comporte pas comme une décision** : elle a ses deux
    issues explicites.
12. **L’aperçu ne modifie rien.**
