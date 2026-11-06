# Le compagnon — robot, connexions et circuits

Ce document décrit **le robot compagnon de l’application** : ce qu’il observe,
à quoi il est branché, comment il décide de parler, comment il traduit un état
pédagogique en posture, et ce qu’il n’a pas le droit de faire.

Il décrit des circuits, pas des fichiers. Pour les formes de données, voir
`json.md` ; pour la synchronisation, voir `cloude.md` ; pour le papier, voir
`peint.md`.

Vocabulaire employé :

| Terme | Sens exact dans ce document |
|---|---|
| **Compagnon** | Le robot affiché sur le tableau de bord et dans la bulle d’assistance |
| **Diagnostic** | L’état pédagogique prioritaire, calculé à partir de toutes les sources |
| **Tâche** | Un point d’attention nommé, priorisé, avec sa preuve |
| **Arbitrage** | Le point unique où le compagnon choisit **un** sujet à afficher |
| **Posture** | La traduction visuelle du diagnostic (action, antenne, tête, sommeil) |
| **Preuve** | La règle et l’échantillon qui justifient une tâche ; jamais un jugement |

---

## 1. Ce qu’est le compagnon

Le compagnon est **un avatar robot** (composant d’avatar animé) piloté par une
chaîne de moteurs purs : observation → diagnostic → tâches → arbitrage →
posture → message → action.

Il n’est ni un chatbot, ni un moteur de langage : **il n’invente aucun texte**.
Chaque phrase affichée est la projection d’une décision calculée, dans la langue
de l’interface (arabe, français, anglais).

Trois propriétés le définissent :

1. **Déterministe** : mêmes données, même heure, même décision. Utile pour tester
   et pour comprendre.
2. **Silencieux par défaut** : sans rien à dire, il ne dit rien.
3. **Non bloquant** : il conseille, il ne refuse jamais une action et ne bloque
   aucun écran.

---

## 2. À quoi il est connecté

C’est la question centrale : le compagnon n’a pas de mémoire propre, il **lit
l’état réel** de l’application.

| Source | Ce qu’il en tire | Quand |
|---|---|---|
| **Liste des classes** | Existence, identité, ordre de priorité | À chaque évaluation |
| **Emploi du temps** (grille + créneaux) | Classes sans horaire, séances attendues, séance en cours | À chaque évaluation |
| **Cahier local** de chaque classe | Contenus saisis, dates, anomalies, séance du jour déjà renseignée | Lecture partagée, mise en cache par révision |
| **Calendrier scolaire** | Vacances, rentrée, année scolaire, jours non travaillés | À chaque évaluation |
| **Évaluations** (dates, devoirs manuels, suppressions) | Conflits de date ou de numérotation | À chaque évaluation |
| **Listes d’élèves** | Classes dont la liste manque ou dont les noms ne sont pas rapprochés | À chaque évaluation |
| **Absences justifiées** | Séances réellement attendues, jours d’inactivité | À chaque évaluation |
| **Messages de la direction** | Message non lu, réponse attendue | Boîte locale |
| **État de synchronisation** | Envoi en cours, erreur, hors ligne, préparation des cahiers | Temps réel |
| **État d’installation** | Application installée ou simple onglet | À chaque évaluation |
| **État des notifications** | Permission accordée, refusée, appareil souscrit | À chaque évaluation |
| **Journal d’activité du cahier** | Dernière saisie réelle, pour ne pas confondre ouverture et travail | Lecture par classe |
| **Guide** | Procédure à proposer quand une action précise est possible | Au moment de parler |

Deux séparations volontaires :

- **Le compagnon ne parle pas au cloud.** Il lit l’état de synchronisation, mais
  il ne déclenche aucun envoi : c’est le moteur de synchronisation qui décide.
- **Le compagnon ne modifie rien.** Il propose une action ; c’est l’écran
  concerné qui l’exécute (créer une classe, ouvrir un cahier, ouvrir les
  évaluations, configurer une liste).

---

## 3. La chaîne en six temps

```
[Sources] → 1. Observer → 2. Diagnostiquer → 3. Prioriser
                                   ↓
                        4. Arbitrer (sujet unique)
                                   ↓
                    5. Incarner (posture) + 6. Dire (message, action)
```

| Temps | Rôle | Propriété |
|---|---|---|
| 1. Observer | Lire les cahiers, l’emploi du temps, le calendrier | Coûteux, donc isolé et mis en cache par révision |
| 2. Diagnostiquer | Trouver l’état prioritaire | Ordre strict, jamais de hasard |
| 3. Prioriser | Nommer les tâches et les classer | Priorité numérique, puis classe, puis identifiant |
| 4. Arbitrer | Choisir **un** sujet | Un seul point de décision |
| 5. Incarner | Traduire en posture | Fonction du nombre exact de problèmes |
| 6. Dire | Produire message et action | Projection, jamais invention |

---

## 4. Le diagnostic ordonné

L’ordre n’est pas décoratif : il exprime une priorité pédagogique. Le premier
état satisfait gagne.

| # | État | Signification | Pourquoi à ce rang |
|---|---|---|---|
| 1 | `create` | Aucune classe | Rien d’autre n’a de sens |
| 2 | `active-session` | Une séance est en cours | L’immédiat prime sur la configuration |
| 3 | `checking` | Cahiers en cours de préparation | On ne conclut pas sur des données incomplètes |
| 4 | `notebook-unavailable` | Cahier illisible | Un contenu cassé ne doit pas être masqué |
| 5 | `notebook-issue` | Anomalies de contenu | Formule non fermée, doublons, séances à l’envers |
| 6 | `evaluation-conflict` | Conflit de date ou de numéro | Un devoir mal placé fausse le suivi |
| 7 | `schedule` | Classes sans créneau horaire | Configuration à finir |
| 8 | `roster-incomplete` | Liste d’élèves manquante ou partielle | Nécessaire au suivi nominatif |
| 9 | `notebook-empty` | Cahier vierge | Le premier contenu à saisir |
| 10 | `notebook-followup` | Retard d’écriture constaté | Rappel doux, jamais un reproche |
| 11 | `ready` | Rien à signaler | La sérénité est un état affichable |
| — | `standby` | Tout est écarté par le professeur | Respect de ses décisions |

Les classes sans créneau sont **calculées dès le début** (elles servent aussi aux
alertes), mais elles ne deviennent le sujet affiché qu’à leur rang : une anomalie
de cahier passe avant une case d’emploi du temps vide.

Deux subtilités :

1. **La séance en cours ne cache pas les anomalies.** Le diagnostic continue de
   lire tous les cahiers pendant une séance (« inspecter pendant la séance »),
   mais une séance en cours reste le sujet affiché.
2. **Un cahier illisible prime sur une anomalie de contenu** : on ne peut pas
   corriger ce qu’on ne peut pas lire.

---

## 5. Les règles des sous-moteurs

### 5.1 Anomalies de cahier (conseiller)

Une seule passe sur l’arbre, cinq familles de défauts, **cinq signalements au
plus** (tri final) :

| Code | Ce qui est repéré | Gravité |
|---|---|---|
| `unclosedFormula` | Formule ouverte et jamais fermée (le TeX brut s’afficherait) | 90 |
| `outOfOrderSessions` | Séances datées à l’envers (relecture chronologique cassée) | 85 |
| `duplicateBlocks` | Deux blocs identiques (import fait deux fois) | 82 |
| `controlCharacters` | Caractères de contrôle (texte collé abîmé) | 70 |
| `emptyStructure` | Chapitres ou sections vides | 40 |

Le conseiller **ne valide rien** : il regarde et parle. Il exclut volontairement
les titres vides d’un programme préparé à l’avance — c’est normal, pas un défaut —
donc `emptyStructure` sert surtout à l’aperçu d’import (`json.md`), pas aux
tâches du compagnon.

### 5.2 Retard d’écriture

| Règle | Détail |
|---|---|
| Base | Jours de classe **réellement écoulés** depuis la rentrée, hors vacances et absences justifiées |
| Seuil | Préférence d’inactivité du professeur (5 jours par défaut) |
| Exclusion | Aucun contenu non daté n’est compté comme en retard |
| Jour même | Laissé aux rappels de séance : seules les journées passées comptent |
| Ouverture | L’ouverture d’une classe n’est pas une preuve de travail |

### 5.3 Contenu suggéré

| Règle | Détail |
|---|---|
| Maturité | Une classe doit exister depuis au moins 3 heures |
| Vacuité | Cahier vide, ou contenu de cours très bref (6 items au plus) |
| Stabilité | L’ordre des suggestions ne dépend pas de la disposition visuelle |
| Comptage | On compte le contenu **attribué**, jamais des leçons « terminées » déduites d’une date |

### 5.4 Évaluations et listes

| Contrôle | Ce qui est signalé |
|---|---|
| Dates | Devoir prévu un jour non travaillé, doublon de date, incohérence de semestre |
| Numéros | Même numéro réutilisé pour deux devoirs d’une même période |
| Listes | Liste absente, ou noms non rapprochés avec le cahier |

### 5.5 Calendrier

Les faits viennent **exclusivement** du calendrier configuré : vacances
proches, rentrée, fin de période. Aucune date n’est inventée ni déduite d’un
texte libre.

### 5.6 Aide

Une référence au guide n’est proposée que si **une procédure précise** est
couverte : un statut, une conversation, une offre ou un rappel courant n’en ont
pas besoin.

---

## 6. Le classement des tâches

1. Les tâches dont l’identifiant figure dans les **écartées** sont retirées.
2. Tri par **priorité décroissante**, puis par **rang de classe** (classe
   préférée d’abord, puis activité récente), puis par identifiant.
3. Une **séance en cours** ne peut pas être déplacée par une exploration
   manuelle.
4. Une tâche corrigée ou disparue s’efface d’elle-même : la liste est recalculée
   à partir de l’état réel, pas d’un historique.

---

## 7. L’arbitrage : une seule décision

Un seul point décide du sujet. L’ordre exact est le suivant — il est repris tel
quel dans le code, ce qui rend chaque anomalie de comportement reproductible.

| # | Condition | Décision |
|---|---|---|
| 1 | Connecté, en ligne, synchronisation en erreur ou transfert en échec | « réessayer la synchronisation » |
| 2 | Connecté, en ligne, boîte de messages en erreur | « réessayer la boîte » |
| 3 | Une séance est en cours | Sujet pédagogique de la séance (reste actionnable hors ligne) |
| 4 | Connecté, hors ligne, sync non terminée ou transfert en échec | « hors ligne » |
| 5 | Connecté, préparation des cahiers en cours | « en préparation » |
| 6 | Message de la direction non lu (le plus ancien d’abord) | « lire la réponse » |
| 7 | Un diagnostic autre que « prêt » | Ce diagnostic |
| 8 | Connecté, hors ligne | « hors ligne » |
| 9 | Connecté, envoi en attente ou en cours | « en attente » |
| 10 | Connecté, boîte non chargée ou état inconnu | « vérification » |
| 11 | Un avis de calendrier existe et l’état est « prêt » | « calendrier » (un seul sujet) |
| 12 | En ligne, installation de l’application requise | « installer » |
| 13 | En ligne, notifications à proposer | « activer les notifications » |
| 14 | Aucune donnée de cahier + offre possible et en ligne | « proposer du contenu » |
| 15 | Sinon | Le diagnostic (souvent « prêt ») |

Trois principes dans cet ordre :

1. **La panne de service passe avant la pédagogie** : inutile de parler d’un
   cahier si le travail ne peut pas être enregistré.
2. **Une vraie séance passe avant une configuration** d’une autre classe.
3. **Un échec de vérification n’est jamais une offre** : l’inconnu ne devient
   pas un succès.

### 7.1 Les actions proposées

| Action | Ce qu’elle ouvre |
|---|---|
| `create-class` | L’assistant de création de classe |
| `schedule` | L’emploi du temps, sur la classe concernée |
| `open-class` | Le cahier de la classe |
| `open-evaluations` | Les évaluations, éventuellement sur un onglet précis |
| `configure-roster` | La liste d’élèves de la classe |
| `install-app` | L’installation de l’application |
| `enable-notifications` | L’activation, ou les réglages si la permission est refusée |
| `retry-sync` / `retry-inbox` | Nouvelle tentative sur le service concerné |
| `read-reply` | La conversation avec la direction |
| `request-content` | La proposition de contenu |
| `none` | Aucune action : le message informe seulement |

---

## 8. La posture : du diagnostic au robot

| État | Gravité | Regard | Antenne | Rondeur de tête | Sommeil |
|---|---|---|---|---|---|
| Prêt / prochaine séance | sereine | joie discrète | calme | 100 (ronde) | 25 s |
| Repos (tout écarté) | sereine | attention douce | calme | 95 | 25 s |
| Vérification | mineure | attente | calme | 90 | 30 s |
| Séance en cours | mineure | inspection | calme | 90 | aucun (veille) |
| Retard d’écriture | mineure | inspection | calme | 85 | 60 s |
| 1 à 2 problèmes | mineure | inspection | calme | 85 | 60 s |
| 3 à 5 problèmes | modérée | inquiétude | **clignotante** | 70 | aucun |
| 6 problèmes et plus | critique | alerte | **clignotante** | 55 (carrée) | aucun |
| Cahier illisible | critique | tristesse | **clignotante** | 55 | aucun |

Le robot utilise un avatar animé dont les attributs sont pilotés directement :
action native, clignotement d’antenne, rondeur de tête, délai de sommeil,
réveil à l’interaction. L’antenne ne clignote que pour une alerte réelle ; le
sommeil est désactivé tant qu’une urgence existe.

Règle morale : **le nombre de problèmes est exact**, jamais arrondi vers le haut.
Un rappel de relecture n’est pas une défaillance, et le robot ne le joue pas
comme telle.

---

## 9. La parole

| Règle | Détail |
|---|---|
| Un sujet par message | Un avis de calendrier **remplace** une offre, il ne la préfixe pas |
| Une seule classe | Le message nomme la classe concernée, jamais un mélange |
| Projection | Le texte découle de la décision ; la mise en forme ne choisit jamais une autre action |
| Longueur | Un extrait de message long est tronqué, avec le nom de la classe en tête |
| Langue | Interface (arabe, français, anglais) ; les noms de classe restent dans leur langue |
| Conseils | Les astuces ne s’affichent que sur un état « prêt » réel, hors installation et hors notification |
| Aide | Une référence de guide n’apparaît que pour une procédure précise |
| Trace | Une trace technique (règle + preuve) accompagne la décision, pour l’explication sans exposer d’élève ni de secret |

---

## 10. Les sollicitations de l’appareil

| Sollicitation | Conditions |
|---|---|
| **Installer l’application** | Uniquement en ligne, et jamais avant un vrai sujet pédagogique |
| **Activer les notifications** | Après l’installation ; appareil compatible ; état initial connu ; silencieux si déjà accordé ; bascule en « réglages » si la permission a été refusée |
| **Ignorer l’optimisation de batterie** | Proposé seulement si l’appareil ne garantit pas l’exécution en arrière-plan |
| **Alarme exacte** | Proposé seulement si le système la refuse ; l’application fonctionne sans |

Ces demandes sont **facultatives** : elles ne doivent jamais masquer une classe,
une réponse de la direction ou une action de reprise.

---

## 11. Où il apparaît, comment il se place

| Emplacement | Rôle |
|---|---|
| Tableau de bord | Robot principal, message du jour, action recommandée |
| Bulle d’assistance | Version compacte, ouverte à la demande |
| Conseils | Bloc discret sous le message quand l’état est « prêt » |

Le placement est calculé à partir de la **zone réellement visible** (viewport
visuel, clavier ouvert, zoom, sens d’écriture) : la bulle se place au-dessus ou
en dessous de son ancre, reste dans la marge, et se limite en hauteur. Elle
n’impose jamais de défilement horizontal.

---

## 12. Ce que le compagnon ne fait jamais

1. **Inventer un fait pédagogique** : aucun contenu, aucune date, aucun nom.
2. **Choisir une autre classe** que celle décidée par l’arbitrage.
3. **Compter une ouverture comme du travail**, ou une date comme une leçon faite.
4. **Transformer un échec de vérification en offre**.
5. **Parler pendant l’accueil** ou interrompre un parcours en cours.
6. **Bloquer une action** : il conseille, l’écran exécute.
7. **Écrire dans le cahier** ou déclencher une synchronisation.
8. **Harceler** : une même tâche écartée ne revient pas ; un message lu ne se
   répète pas.
9. **Afficher plusieurs sujets** dans une même bulle.
10. **Réprimander** : un retard est un rappel, formulé sans reproche.

---

## 13. Branchements réciproques

| Circuit | Dépend de | Déclenche |
|---|---|---|
| Observation | Cahier local, emploi du temps, calendrier | Diagnostic et tâches, par révision de cahier |
| Diagnostic | Emploi du temps, listes, évaluations, absences | État prioritaire et classe cible |
| Tâches | Diagnostic, priorités, écartées | Sujet proposé |
| Arbitrage | État de synchronisation, boîte, séance en cours, installation, notifications | Décision unique |
| Posture | Nombre de problèmes | Action, antenne, tête, sommeil |
| Message | Décision, langue, classe cible | Texte, action, aide, astuces |
| Action | Écran concerné | Ouverture de la classe, des évaluations, de l’emploi du temps, des réglages |
| Synchronisation | — | Peut changer l’arbitrage (erreur, hors ligne, préparation) sans être déclenchée par lui |
| Direction | Messages et réponses | Sujet « lire la réponse » |

---

## 14. Invariants

1. **Un seul sujet par bulle.**
2. **Un seul point de décision**, avec un ordre documenté.
3. **Le nombre de problèmes est exact** ; la posture en découle, sans arrondi.
4. **Aucune invention** : tout fait vient d’une source listée en §2.
5. **Une séance en cours ne cache pas les anomalies**, mais reste le sujet.
6. **Un cahier illisible prime** sur toute anomalie de contenu.
7. **Une tâche écartée ne revient pas** ; une tâche résolue disparaît seule.
8. **Les sollicitations système passent après la pédagogie.**
9. **Le compagnon ne modifie rien** : il propose, l’écran exécute.
10. **Le ton reste bienveillant** : rappel, jamais reproche.
