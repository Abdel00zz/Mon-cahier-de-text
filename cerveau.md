# Le cerveau principal — organes, diagnostic, arbitrage et invariants

Ce document décrit **le cerveau de l’application** : la chaîne qui observe un
cahier, en déduit un état pédagogique, classe les points d’attention, choisit un
seul sujet à montrer, et décide de la posture et de l’action.

Il décrit l’architecture et les règles, sans citer de fichier. Pour la mise en
scène du robot et le ton des messages, voir `bot.md` ; pour les échéances
officielles, voir `bulletin.md` ; pour les notifications système, voir
`notification.md` ; pour les calculs du cahier, voir `json.md`.

Vocabulaire employé :

| Terme | Sens exact dans ce document |
|---|---|
| **Organe** | Un module d’analyse qui produit un constat à partir d’une source |
| **Diagnostic** | L’état pédagogique prioritaire, avec la classe visée et le nombre exact de points |
| **Constat** | Une observation nommée, avec sa règle, son nombre et un exemple de chemin |
| **Tâche** | Un constat devenu actionnable, classé par priorité |
| **Arbitrage** | Le point unique où un seul sujet est choisi |
| **Couverture** | Ce que le cerveau a réellement pu lire, et ce qui lui a échappé |
| **Trace** | L’explication vérifiable d’une décision, sans donnée sensible |

---

## 1. Ce qu’est le cerveau

Un **enchaînement de fonctions pures** : ni interface, ni stockage, ni réseau.
Tout ce qui entre est un état déjà lu ; tout ce qui sort est une décision
explicable.

Quatre propriétés fondatrices :

| Propriété | Conséquence |
|---|---|
| **Déterministe** | Même état, même heure, même décision — donc reproductible et testable |
| **Sans invention** | Aucun fait n’est produit : toute phrase vient d’une source observée |
| **Non bloquant** | Il conseille ; c’est l’écran qui exécute |
| **Honête sur ses limites** | Ce qu’il n’a pas pu lire est déclaré, jamais comblé par une supposition |

---

## 2. Les cinq couches

```
[Sources] → 1. PERCEVOIR → 2. DIAGNOSTIQUER → 3. CLASSER
                                                    ↓
                            5. INCARNER ← 4. ARBITRER
                                   ↓
                              6. DIRE (texte, action)
```

| Couche | Rôle | Sortie |
|---|---|---|
| **1. Percevoir** | Lire l’état réel : classes, emploi du temps, cahiers, calendrier, évaluations, listes, absences, messages, synchronisation, appareil | Un instantané en lecture seule |
| **2. Diagnostiquer** | Appliquer les organes dans un ordre strict | Un état prioritaire et ses preuves |
| **3. Classer** | Transformer chaque constat en tâche priorisée | Une liste ordonnée, écartables comprises |
| **4. Arbitrer** | Choisir **un** sujet parmi tout ce qui est possible | Une décision unique |
| **5. Incarner** | Traduire le nombre exact de points en posture | Action, antenne, tête, sommeil |
| **6. Dire** | Projeter la décision en message, action, aide | Ce que voit l’enseignant |

---

## 3. Les organes de perception

| Source | Ce qui est lu | Garde-fou |
|---|---|---|
| **Liste des classes** | Existence, identité, ordre de priorité | Aucune classe ⇒ état « créer », rien d’autre n’a de sens |
| **Emploi de temps** | Créneaux valides, séance en cours, classes sans horaire | Jour et heure validés contre les créneaux connus ; classes inconnues ignorées |
| **Cahier de chaque classe** | Contenus, dates, anomalies, séance du jour | Lecture stricte ; un cahier illisible devient un constat, pas un vide |
| **Calendrier** | Vacances, fériés, année effective, fin des cours | Faits uniquement ; aucune date générée |
| **Évaluations** | Devoirs manuels, dates, suppressions | Une ligne du tableau et son entrée de réglages comptent **une** fois |
| **Listes d’élèves** | Présence et rapprochement des noms | Une absence n’est jamais interprétée comme une liste de classe |
| **Absences justifiées** | Jours réellement enseignés | Traitées comme des vacances personnelles |
| **Messages** | Non-lus, réponses attendues | Le plus ancien d’abord |
| **Synchronisation** | Envoi, erreur, hors ligne, préparation | Une panne de service prime sur la pédagogie |
| **Appareil** | Installation, autorisation, batterie, alarme | Une sollicitation ne masque jamais un vrai sujet |
| **Activité du cahier** | Dernière saisie réelle | Une ouverture n’est pas du travail |
| **Guide** | Procédure couvrant l’action proposée | Aucune référence pour un simple statut |

Deux organes de perception sont **volontairement isolés** : la lecture des
cahiers (coûteuse, mise en cache par version du cahier) et l’état des services
(rapide, mis à jour en continu). Une arrivée de message ne doit pas relire
quinze cahiers.

---

## 4. Le contrat du diagnostic

Le diagnostic est un objet unique, toujours de la même forme :

| Champ | Rôle |
|---|---|
| État | L’étape prioritaire (voir §4.1) |
| Classe visée | La classe concernée, s’il y en a une |
| Nombre de points | Le total **exact** de points à traiter |
| Classes sans horaire | Liste complète |
| Cahiers vierges | Liste complète |
| Anomalies de cahier | Par classe, avec les conseils |
| Conflits d’évaluation | Par classe, avec la nature dominante |
| Listes incomplètes | Par classe, avec la raison |
| Retards d’écriture | Par classe, avec l’ancienneté |
| Cahiers illisibles | Liste complète |
| Séance en cours | La classe, si une séance est en cours |

### 4.1 L’ordre des états

| # | État | Déclencheur | Nombre de points |
|---|---|---|---|
| 1 | Créer | Aucune classe | 1 |
| 2 | Séance en cours | Une classe est en séance **et** la lecture n’est pas en cours | 0 |
| 3 | Vérification | Les cahiers sont en cours de préparation | 0 |
| 4 | Cahier illisible | Au moins un cahier n’a pas pu être lu | Nombre de cahiers illisibles |
| 5 | Anomalie de cahier | Formule non fermée, doublons, dates à l’envers, caractères de contrôle | Somme des conseils |
| 6 | Conflit d’évaluation | Identité, liaison, doublon ou chevauchement | Somme des conflits |
| 7 | Sans horaire | Au moins une classe sans créneau | Nombre de classes |
| 8 | Liste incomplète | Liste absente, ou noms non rapprochés | Nombre de classes |
| 9 | Cahier vierge | Cahier vide, ou seulement le diagnostic initial | Nombre de classes |
| 10 | Retard d’écriture | Jours de classe écoulés sans saisie | Nombre de classes |
| 11 | Prêt | Aucun point | 0 |
| — | Repos | Toutes les tâches écartées par le professeur | Nombre écarté |

Trois finesses décisives :

1. **La séance en cours ne cache pas les anomalies.** Le cerveau continue
   d’inspecter tous les cahiers pendant une séance, mais la séance reste le
   sujet : on ne dérange pas un cours en train de se donner.
2. **Un cahier illisible prime sur une anomalie de contenu** : on ne corrige pas
   ce qu’on ne peut pas lire.
3. **Une anomalie de cahier prime sur un horaire manquant** : le contenu réel
   passe avant la configuration.

---

## 5. Les organes d’analyse

### 5.1 L’empreinte d’un bloc

Deux blocs sont **le même bloc** s’ils portent les mêmes textes, la même date et
la même structure — peu importe l’ordre des clés ou l’identité des objets en
mémoire.

| Règle | Détail |
|---|---|
| Parcours canonique | Ordre de champs fixe, aucune allocation intermédiaire |
| Deux couloirs d’empreinte | Deux multiplicateurs distincts : les collisions corrélées deviennent improbables |
| Exclusions | L’identifiant temporaire de session et tout champ inconnu |

Sans cette exclusion, deux copies parfaitement identiques d’un chapitre
paraîtraient différentes à cause d’un détail technique.

### 5.2 Le conseiller de cahier

Il **regarde** un cahier et parle. Il ne refuse rien, il ne bloque rien.

| Code | Ce qu’il repère | Gravité |
|---|---|---|
| Formule non fermée | Le TeX brut s’afficherait au papier | Avertissement |
| Séance datée à l’envers | La relecture chronologique est cassée | Avertissement |
| Bloc dupliqué | Import fait deux fois, copier-coller de chapitre | Avertissement |
| Caractère de contrôle | Texte collé abîmé | Avis |
| Structure vide | Plan annoncé mais pas rempli | Avis |

| Règle | Détail |
|---|---|
| Une seule passe | Le parcours partagé, pas de tableau intermédiaire par nœud |
| Tri | Les avertissements avant les avis ; à gravité égale, le plus fréquent d’abord |
| Limite | **Quatre conseils** au maximum par défaut : un professeur agit sur trois ou quatre remarques, pas sur trente |
| Exclusions | Ligne libre, activité hors cours, et **titre vide d’un programme préparé** ne déclenchent rien |
| Chronologie | Comparée **chapitre par chapitre**, jamais entre chapitres |
| Exemplaire | Le premier endroit concerné est conservé, pour situer le conseil |
| Nombres | Le nombre est **exact**, jamais arrondi vers le haut |

### 5.3 Le cycle de vie d’un chapitre

| État | Signification |
|---|---|
| Non commencé | Ni titre daté, ni contenu daté |
| Programmé | Titre daté, mais aucune séance encore tenue |
| En cours | Au moins une séance datée tenue |
| Terminé | Le dernier contenu est daté, dans la période, et la fin est échue |
| Incohérent | Date invalide, titre manquant alors que des séances existent, ou chronologie rompue |

Trois règles :

1. **Dater le dernier contenu vaut achèvement**, même si des dates intermédiaires
   sont vides : c’est la vérité du professeur, pas un trou à corriger.
2. **Pendant le déroulement**, la position atteinte fournit une **estimation**,
   jamais des heures mesurées.
3. **Une date hors période n’est pas comptée** : elle rend le chapitre incohérent
   au lieu de fausser le taux.

### 5.4 Les conflits d’évaluation

| Nature | Signification |
|---|---|
| **Identité** | Deux évaluations différentes portent le même numéro et le même type |
| **Liaison** | Une mention de séance et une évaluation ne désignent pas le même devoir |
| **Doublon** | La même évaluation existe deux fois |
| **Chevauchement** | Deux évaluations occupent la même période |

Trois garde-fous :

1. **Le même type seul ne fait pas un doublon** : deux contrôles de même type
   peuvent parfaitement coexister à des dates différentes.
2. **Une ligne du tableau et son entrée de réglages comptent une fois.**
3. **Une prédiction officielle non datée par le professeur n’est pas un
   rendez-vous** : elle ne provoque aucun conflit.

### 5.5 Les listes d’élèves

| Raison | Signification |
|---|---|
| Liste absente | La classe a un suivi nominatif, mais aucune liste |
| Noms non rapprochés | Des noms historiques existent, sans rapprochement explicite |

Le nombre manquant est **exact**. Aucune liste n’est inventée à partir des
absences : une absence n’est pas une inscription.

### 5.6 Le retard d’écriture

| Règle | Détail |
|---|---|
| Base | Jours de classe **réellement écoulés** depuis la rentrée |
| Exclusions | Vacances, fériés, absences justifiées |
| Seuil | Préférence d’inactivité du professeur (5 jours par défaut) |
| Aujourd’hui | Laissé aux rappels de séance : seules les journées passées comptent |
| Non comptés | Les contenus non datés ne sont jamais « en retard » |
| Ouverture | L’ouverture d’une classe n’est pas une preuve de travail |

### 5.7 Le contenu proposé

| Condition | Valeur |
|---|---|
| Maturité de la classe | **3 heures** d’existence au moins |
| Vacuité | Cahier vide, ou contenu de cours **très bref (6 items ou moins)** |
| Contact récent | Une classe contactée il y a moins de 24 heures n’est pas proposée |
| Écartées | Les classes ignorées par le professeur ne reviennent pas |
| Ordre | Classe préférée, puis dernière ouverture, puis création, puis identifiant |
| Priorité | Continuer la classe en cours ; sinon un cahier vide est l’occasion la plus claire |
| Comptage | Le contenu **attribué**, jamais des leçons « terminées » déduites d’une date |
| Repli | Aucun : un cahier illisible n’est jamais traité comme vide |

### 5.8 L’avis de calendrier

Les faits viennent **exclusivement** du calendrier configuré : vacances proches,
rentrée, fin de période, fin des cours. Aucune date n’est déduite d’un texte.

### 5.9 La référence d’aide

Une procédure n’est proposée que si elle est **couvrable et actionnable**. Un
statut, une conversation, une offre ou un rappel courant n’ont pas besoin d’un
mode d’emploi : proposer une aide inutile fatigue et décrédibilise la suivante.

---

## 6. Le classement des tâches

Chaque constat devient une tâche avec une priorité numérique, une règle, un
nombre d’occurrences et un exemple de chemin.

| Priorité | Tâche | Pourquoi ce rang |
|---|---|---|
| **130** | Cahier illisible **pendant la séance de cette classe** | Le cours est en train de se donner |
| **120** | Séance en cours | L’immédiat prime |
| **110** | Cahier illisible | Un contenu cassé ne doit pas être masqué |
| **100** | Aucune classe | Rien d’autre n’existe |
| **90** | Formule non fermée | Le papier serait faux |
| **88** | Conflit d’évaluation | Fausse le suivi des notes |
| **85** | Séance datée à l’envers | Casse la chronologie |
| **82** | Bloc dupliqué | Fausse les compteurs |
| **80** | Classe sans horaire | Pas de séance, pas d’alerte |
| **75** | Liste d’élèves incomplète | Nécessaire au suivi nominatif |
| **70** | Caractère de contrôle | Lisibilité |
| **60** | Cahier vierge | Premier contenu à saisir |
| **50** | Retard d’écriture | Rappel doux |
| **40** | Structure vide | Finition |

**Départage** : priorité décroissante, puis **classe préférée**, puis identifiant
stable. Aucun ordre ne dépend de l’ordre d’affichage du tableau de bord.

Une tâche **corrigée ou supprimée disparaît d’elle-même** : la liste est
recalculée à partir de l’état réel, jamais d’un historique.

---

## 7. L’arbitrage : le cortex

C’est le seul endroit qui choisit. Quinze conditions, dans cet ordre exact :

| # | Condition | Décision |
|---|---|---|
| 1 | Connecté, en ligne, synchronisation en erreur ou transfert en échec | Réessayer la synchronisation |
| 2 | Connecté, en ligne, boîte en erreur | Réessayer la boîte |
| 3 | Une séance est en cours | Le sujet de la séance (actionnable hors ligne) |
| 4 | Connecté, hors ligne, travail non terminé | Hors ligne |
| 5 | Connecté, préparation des cahiers | En préparation |
| 6 | Message non lu | Lire la réponse (le plus ancien d’abord) |
| 7 | Un diagnostic autre que « prêt » | Ce diagnostic |
| 8 | Connecté, hors ligne | Hors ligne |
| 9 | Envoi en attente ou en cours | En attente |
| 10 | Boîte non chargée, ou état inconnu | Vérification |
| 11 | Avis de calendrier, état « prêt » | Calendrier (sujet unique) |
| 12 | Installation requise | Installer |
| 13 | Notifications à proposer | Activer |
| 14 | Cahier vide + offre possible + en ligne | Proposer du contenu |
| 15 | Sinon | Le diagnostic (« prêt » le plus souvent) |

Trois principes dans cet ordre :

1. **La panne de service avant la pédagogie** : inutile de parler d’un cahier si
   le travail ne peut pas être enregistré.
2. **Une vraie séance avant une configuration d’une autre classe.**
3. **Un échec de vérification n’est jamais une offre** : l’inconnu ne devient
   pas un succès.

---

## 8. De l’attention à la posture

Le cerveau calcule un **nombre d’attention** :

```
points en attente (hors séance en cours)
+ messages non lus
+ 1 si un service est en erreur
+ 1 si l’appareil doit être configuré
```

Ce nombre n’est pas une décoration : il pilote la posture (antenne, tête,
sommeil) et il est **exact**. Trois dérogations au calcul par gravité :

| Situation | Posture |
|---|---|
| Configuration de l’appareil | Attention neutre, antenne allumée, jamais d’alarme |
| Panne de service | Critique si erreur, attente sinon |
| Réponse de la direction | Inspection discrète, sans clignotement |

---

## 9. La couverture, ou l’honnêteté sur ce qu’on ignore

| État de couverture | Signification |
|---|---|
| En cours | Les cahiers se préparent |
| Déconnecté | Aucune lecture possible |
| Partielle | Certaines classes n’ont pas pu être lues |
| Complète | Toutes les classes lues |

Règles :

1. **Une couverture partielle interdit une conclusion globale** : le cerveau ne
   dit pas « tout va bien » quand il n’a pas tout lu.
2. **Un cahier illisible produit un constat nommé**, jamais un cahier vide.
3. **Une lecture partielle pendant la préparation suspend les tâches**, mais pas
   le diagnostic : on ne propose pas de corriger ce qui est en train d’arriver.

---

## 10. Le déterminisme et la mémoire

| Mécanisme | Règle |
|---|---|
| Horloge explicite | Le jour et l’instant sont passés en paramètre : deux appelants à la même heure obtiennent la même réponse |
| Caches par version | Le cahier est immuable : l’identité du tableau sert de clé sûre ; une édition produit un nouvel arbre, donc un nouveau calcul |
| Cache d’analyse | Le conseiller, l’empreinte et le cycle de vie gardent leur dernier résultat par version de cahier |
| Cache d’évaluation | Une évaluation par instantané et par période : pas de cache qui grossit jour après jour |
| Aucun aléatoire | Aucun tirage, aucun ordre instable : deux exécutions identiques donnent la même liste |
| Ordre stable | Toujours priorité, puis classe préférée, puis identifiant |

---

## 11. La preuve et la trace

Chaque tâche porte une **preuve** :

| Élément | Rôle |
|---|---|
| Règle | Le nom de la règle appliquée |
| Occurrences | Le nombre exact de cas |
| Exemple de chemin | Où regarder, en un endroit précis |

La trace d’une décision contient la règle, la preuve, le nombre de points en
attente et l’instant d’observation. Elle **ne contient jamais** : nom d’élève,
note, contenu de cours, secret de fournisseur.

**Pourquoi une trace ?** Parce qu’une décision inexplicable est ingérable. Un
professeur qui demande « pourquoi me dit-il cela ? » doit pouvoir obtenir une
réponse factuelle, pas une reformulation vague.

---

## 12. Écarter, attendre, tourner

| Mécanisme | Effet |
|---|---|
| **Écarter une tâche** | La tâche quitte la liste ; les autres restent |
| **Écarter une offre** | L’offre de cette classe ne revient plus |
| **Écarter un message** | Le message reste en boîte, mais n’est plus le sujet |
| **Tout écarter** | Le cerveau passe en **repos** : la sérénité est un état affichable |
| **Tâche suivante** | Rotation explicite parmi les tâches en attente, sans perdre la séance en cours |
| **Exploration manuelle** | Ne peut pas déplacer une séance en cours |
| **Nouveauté** | Une nouvelle classe, ou un problème aggravé, réveille l’attention |

Le repos n’est pas un échec : c’est le résultat d’une décision du professeur, et
il doit se voir comme tel.

---

## 13. Ce que le cerveau ne fait jamais

1. **Inventer un fait** : aucune date, aucun contenu, aucun nom.
2. **Compter une ouverture comme du travail.**
3. **Traiter un cahier illisible comme vide.**
4. **Transformer un échec de vérification en succès ou en offre.**
5. **Parler de deux sujets à la fois.**
6. **Déranger pendant une séance** avec une tâche secondaire.
7. **Réprimander** : un retard est un rappel.
8. **Écrire dans un cahier**, dans les réglages ou au cloud.
9. **Décider à partir d’un ordre d’affichage.**
10. **Cacher une couverture partielle.**

---

## 14. Branchements

| Circuit | Ce que le cerveau en reçoit | Ce qu’il en fait |
|---|---|---|
| Éditeur | Contenus, dates, anomalies | Diagnostics et conseils |
| Emploi du temps | Créneaux, séance en cours | Priorité du sujet, classes sans horaire |
| Calendrier | Vacances, année, fin des cours | Silence motivé, avis, retard borné |
| Évaluations | Devoirs, conflits | Tâche de conflit, jamais un blocage |
| Listes d’élèves | Complétude | Tâche de configuration |
| Messages | Non-lus | Sujet « lire la réponse » |
| Synchronisation | Erreur, hors ligne, préparation | Priorité de service, couverture |
| Impression | Aucun | Rien : le cerveau ne décide pas du papier |
| Robot | Nombre d’attention | Posture |
| Guide | Procédure | Référence d’aide |
| Carte et tableau de bord | Décision | Message, action, cible |

---

## 15. Invariants

1. **Un seul sujet par décision.**
2. **Un seul point d’arbitrage**, avec un ordre documenté.
3. **Le nombre de points est exact**, jamais arrondi vers le haut.
4. **Aucune invention** : tout fait vient d’une source observée.
5. **La panne de service prime sur la pédagogie.**
6. **Une séance en cours reste le sujet**, sans cacher les anomalies.
7. **Un cahier illisible prime sur toute anomalie de contenu.**
8. **Une tâche corrigée disparaît seule** ; une tâche écartée ne revient pas.
9. **Une couverture partielle interdit une conclusion globale.**
10. **Le calcul est déterministe** : mêmes entrées, même heure, même décision.
11. **Aucun cache ne survit à une modification** du cahier.
12. **La trace n’expose aucune donnée sensible.**
13. **Le cerveau ne modifie rien** : il propose, l’écran exécute.
14. **Le repos est un état légitime**, pas une absence de résultat.
