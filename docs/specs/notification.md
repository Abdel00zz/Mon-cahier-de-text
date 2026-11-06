# Les notifications — techniques, messages et circuits

Ce document décrit **comment l’application prévient l’enseignant** : ce qui
déclenche une notification, comment elle est calculée, par quels canaux elle
part, ce qu’elle contient, ce qu’elle ne contient jamais, et comment elle ramène
l’utilisateur au bon endroit.

Il décrit des circuits et des règles, sans citer de fichier. Pour le compagnon
(qui parle dans l’application), voir `bot.md` ; pour les échéances officielles,
voir `bulletin.md` ; pour le cloud, voir `cloude.md`.

Vocabulaire employé :

| Terme | Sens exact dans ce document |
|---|---|
| **Rappel** | Une notification **calculée sur l’appareil**, à partir de l’emploi du temps |
| **Message** | Une notification **envoyée par la direction**, avec un état de lecture |
| **Canal** | Un canal Android (importance, son, vibration) que l’utilisateur peut régler |
| **Pastille** | Le compteur sur l’icône de l’application |
| **Cible** | La destination ouverte quand on touche la notification |
| **Réclamation** | Le verrou qui empêche deux onglets de diffuser le même rappel |
| **Fenêtre de fraîcheur** | La tolérance de temps pendant laquelle un rappel est encore valable |

---

## 1. Deux natures, deux techniques

| | Rappel de séance | Message de la direction |
|---|---|---|
| Origine | Calcul local (emploi du temps, calendrier, cahier) | Serveur, sur décision humaine |
| Transport | Planification locale du système | Messagerie du système (Android), notification locale (web) |
| Fonctionne hors ligne | Oui, entièrement | Non (le message doit d’abord arriver) |
| Fonctionne application fermée | Oui (alarme planifiée) | Oui, sur Android ; non sur le web |
| Compteur de pastille | Ne touche jamais le compteur | Seule source du compteur |
| Contenu | Titre et corps calculés dans la langue de l’application | Titre et corps rédigés par la direction |

Principe structurant : **un rappel n’augmente jamais le compteur de messages**.
Mélanger les deux rendrait le compteur faux, et un compteur faux ne sert plus à
rien.

---

## 2. Les six natures de notification

| Nature | Déclencheur | Intention |
|---|---|---|
| `session-reminder` | Une séance va se terminer | « Pensez à renseigner la séance » |
| `missing-date` | Une séance est terminée sans contenu daté | « Cette séance n’a pas encore de trace » |
| `lateness` | Retard d’écriture constaté | « Votre cahier attend une mise à jour » |
| `assessment` | Échéance d’évaluation proche | « Un devoir approche » |
| `admin` | Message de la direction | « La direction vous a écrit » |
| `test` | Vérification manuelle | « Vos notifications fonctionnent » |

Chaque nature a une **étiquette** par défaut : deux notifications de même
étiquette **se remplacent** au lieu de s’empiler. Trois rappels de la même
séance ne laissent donc qu’une ligne dans le volet.

---

## 3. Le calcul des rappels

### 3.1 Les conditions d’un jour actif

Un rappel ne se calcule que si **toutes** ces conditions sont réunies :

| Condition | Détail |
|---|---|
| Jour travaillé | Ni repos hebdomadaire, ni férié, ni vacances |
| Enseignant présent | Aucune absence justifiée sur la période |
| Année scolaire | Le jour est dans l’année effective |
| Classe connue | Le créneau correspond à une classe existante |
| Créneau valide | Jour et heure connus, après normalisation de l’horloge de référence |

Sinon, le moteur renvoie un **silence motivé** : il sait pourquoi il se tait, et
il reprogramme son prochain réveil.

### 3.2 Les deux rappels d’une séance

| Rappel | Moment | Contenu |
|---|---|---|
| **Fin proche** | `fin − préavis` | « Séance en cours · il reste n minutes » avec les classes concernées |
| **Date manquante** | `fin + grâce` | « Séance terminée sans contenu daté », une seule fois |

| Réglage | Défaut | Bornes |
|---|---|---|
| Préavis | **5 minutes** | 1 à 10 minutes |
| Grâce avant rappel de date manquante | 5 minutes | 1 à 30 minutes |
| Rappel de fin | Activé | — |
| Rappel de date manquante | Activé | — |
| Silence pendant les vacances | Activé | — |

Une ancienne valeur par défaut d’une minute est **migrée** vers cinq : une
minute est trop court pour reposer le téléphone et reprendre la main. Un choix
ultérieur explicite reste respecté.

### 3.3 La fenêtre de fraîcheur

Un rappel n’est émis que pendant une fenêtre de **soixante secondes** autour de
son instant. Cette borne a deux effets :

1. Un simple redessin de l’interface ne redéclenche rien.
2. Un rappel ne sonne **jamais** après la fin de la séance.

Le réveil suivant est programmé au plus proche parmi : début de séance, fin de
séance, instant de rappel, ou minuit local.

### 3.4 Le minuit qui n’est pas à minuit

Le passage au jour suivant est calculé par **recherche dichotomique** sur la
date marocaine, jamais par un ajout de 24 heures : le Maroc change d’offset
saisonnièrement, et une soustraction fixe produirait des rappels décalés deux
fois par an.

---

## 4. Le plan natif (Android)

À l’activation, l’application planifie **quatorze jours** de rappels de fin de
séance, avec un plafond de **64 notifications** planifiées.

| Étape | Règle |
|---|---|
| Source | Emploi du temps et horloge de référence de la classe |
| Conversion | Heure scolaire → instant réel, en tenant compte du fuseau de Casablanca et de ses changements |
| Filtre | Les instants déjà passés sont ignorés |
| Contenu | même texte que le rappel affiché à l’écran, dans la langue de l’application |
| Cible | La classe concernée si elle est seule, l’accueil sinon |
| Tri | Par instant, puis réduction aux 64 premiers |
| Signature | Un plan identique n’est pas replanifié : pas deux fois le même travail |

L’identifiant d’une notification planifiée est **dérivé de sa clé** (empreinte
bornée), ce qui rend la replanification idempotente : replanifier le même plan
remplace au lieu de dupliquer.

### 4.1 Les alarmes exactes

| Situation | Comportement |
|---|---|
| Autorisation exacte accordée | Alarme exacte |
| Autorisation refusée ou absent | Alarme **tolérante à la veille** : elle perce quand même le mode Doze |
| Aucune planification possible | L’application continue de fonctionner ; aucun écran bloqué |

La permission n’est **jamais** demandée en mode « usage réservé » : l’application
demande l’autorisation, accepte le refus, et retombe sur un comportement dégradé
mais honnête.

### 4.2 La batterie

Android peut endormir une application en arrière-plan. L’application peut donc
proposer une exemption d’optimisation de batterie — proposée, jamais imposée, et
seulement si le système indique que l’exemption manque.

---

## 5. Le web et l’ordinateur

| Élément | Règle |
|---|---|
| Transport distant | **Aucun** : le Web Push a été retiré (plus d’abonnement navigateur, plus de clé de signature d’envoi) |
| Notifications locales | Affichées par le service worker tant que **la page vit** |
| Page fermée | Aucune notification possible : c’est une limite assumée, pas un défaut |
| iOS | Notifications uniquement si la page est **installée** sur l’écran d’accueil |
| Permission refusée | Les couches internes (message à l’écran, vibration, pastille) restent le signal de base |
| Service worker absent | Aucune exception : l’envoi local renvoie simplement « non envoyé » |

Sur un ordinateur, la même mécanique s’applique : une notification du système
apparaît dans le centre de notifications du système d’exploitation, à condition
que la permission soit accordée et que la page soit ouverte.

**Pourquoi avoir retiré le Web Push ?** Parce qu’un abonnement navigateur sans
application installée produit une promesse qu’on ne peut pas tenir : notifications
manquées, abonnements morts, secrets à gérer côté serveur. Le choix retenu est
plus honnête : rappels **locaux** partout, envoi distant **uniquement** vers
l’application Android.

---

## 6. Le canal Android et ses règles

| Canal | Usage | Importance |
|---|---|---|
| Messages | Réponses de la direction | Par défaut |
| Rappels | Séances et dates manquantes | Par défaut |
| Tests | Vérification manuelle | Par défaut |

Trois règles :

1. **Créés une seule fois.** Android conserve les réglages de l’utilisateur pour
   un canal existant : le renommer après réglage serait la seule façon de les
   perdre.
2. **Marqueur de version.** Les canaux ne sont réécrits que si la version change.
3. **Titres localisés.** Les noms suivent la langue enregistrée avec l’état de
   la boîte.

La petite icône est **monochrome** : Android aplatit le canal alpha, une icône
colorée deviendrait un carré blanc.

---

## 7. Les messages de la direction

### 7.1 Le circuit

| # | Étape | Détail |
|---|---|---|
| 1 | Rédaction | La direction écrit un titre (80 caractères au plus) et un message (1 200 au plus) |
| 2 | Enregistrement | Le message rejoint la conversation du professeur, horodaté |
| 3 | Compteur | Le nombre de messages en attente est recalculé et publié |
| 4 | Envoi | Une notification distante est tentée vers chaque appareil lié |
| 5 | Repli | Sans appareil joignable, le message reste **disponible dans l’application** |

Le compteur affiché est **toujours** celui du serveur, jamais le nombre de
notifications envoyées. Un message lu sur un appareil décrémente le compteur de
tous les autres.

### 7.2 La liaison d’un appareil

| Règle | Détail |
|---|---|
| Identité | Un appareil est identifié par l’empreinte de son jeton, pas par le jeton lui-même |
| Liaison | Une valeur aléatoire, renvoyée à l’appareil : c’est elle qui autorise l’affichage |
| Propriétaire | Un même appareil ne peut appartenir qu’à un compte à la fois ; le transfert est atomique |
| Installation | Une réinstallation remplace l’ancien enregistrement de la même installation |
| Limite | **5 appareils** par compte |
| Rotation du jeton | Le jeton change ⇒ l’ancienne liaison est effacée, une réinscription silencieuse est déclenchée |
| Désabonnement | Vérifié par la liaison : un désabonnement tardif ne peut pas retirer une liaison plus récente |
| Jeton révoqué | Un refus explicite du service de messagerie marque l’appareil comme mort ; un simple refus de format ne le fait pas |

### 7.3 La validation native

Sur Android, la notification est envoyée **en données seules** : l’application
vérifie elle-même la liaison avant d’afficher quoi que ce soit. Une notification
qui ne correspond pas à l’appareil, ou reçue alors que l’utilisateur s’est
désabonné, est ignorée silencieusement — sans jamais afficher un contenu qui ne
le concerne pas.

### 7.4 Le compteur partagé

Un message de type « synchronisation de compteur » est envoyé après un accusé de
lecture. Il est envoyé en priorité **basse** et peut être remplacé par un
message plus récent : une confirmation tardive ne doit jamais remplacer un
message neuf en attente.

---

## 8. L’anti-doublon

Un même rappel peut être calculé par plusieurs onglets, ou par l’application et
un onglet resté ouvert.

| Mécanisme | Rôle |
|---|---|
| Verrou du navigateur | Sérialise la décision entre onglets coopératifs |
| Repli local | Un registre local borné (256 entrées) et une durée de vie de 48 heures |
| Réclamation en mémoire | Garantit la déduplication même si le stockage est indisponible |
| Revalidation avant diffusion | L’instant **et** la preuve de date sont revérifiés juste avant l’envoi : un verrou qui a retardé l’envoi ne fait pas sonner un rappel périmé |

Une réclamation échouée est **rendue** : un échec d’envoi ne doit pas empêcher
une tentative ultérieure légitime.

---

## 9. Le contenu d’une notification

| Contrainte | Valeur | Raison |
|---|---|---|
| Titre | 72 caractères au plus | Lisible dans le volet |
| Corps | 180 caractères au plus | Deux lignes sur la plupart des appareils |
| Étiquette | 96 caractères au plus | Remplacement correct |
| Langue | Celle de l’application, détectée à défaut par le texte | Cohérence avec l’interface |
| Sens d’écriture | Droite à gauche en arabe | Lisibilité |
| Actions | « Ouvrir » et « Fermer » (ou « Ouvrir le cahier ») | Agir sans ouvrir l’application |
| Vibration | Trois impulsions courtes si activée | Signal discret, jamais par défaut |
| Horodatage | Celui du fait, jamais celui de l’envoi | Ordre chronologique honnête |

Une notification n’affiche **jamais** de nom d’élève, de note, ni de contenu
pédagogique détaillé : seulement des classes et une action à faire.

---

## 10. La cible et le retour dans l’application

| Destination | Ouverture |
|---|---|
| Une classe précise | Le cahier de cette classe |
| Les paramètres | Les paramètres |
| Rien de précis | L’accueil |

Règles de navigation :

1. **La cible est validée par une liste blanche** : une adresse non reconnue
   ramène à l’accueil. Une notification ne peut pas ouvrir une page arbitraire.
2. **La fenêtre existante est réutilisée** : on ne crée pas un second document,
   et un brouillon en cours n’est pas perdu.
3. **La console d’administration n’est jamais visée.**
4. **Le lien profond `cahier://`** ramène à l’instance existante sur Android.
5. **Le message est ouvert immédiatement** si l’application est déjà active,
   sans attendre l’écran de la boîte.

---

## 11. Le parcours d’activation

| Étape | Ce qui est demandé | Ce qui est expliqué |
|---|---|---|
| 1 | Rien | L’application **explique le bénéfice** avant toute fenêtre système |
| 2 | Autorisation des notifications | Rappels de séance et messages de la direction |
| 3 | Liaison de l’appareil (Android) | Les messages peuvent arriver application fermée |
| 4 | Exemption de batterie | Pour que les rappels survivent à la veille |
| 5 | Alarme exacte | Pour une heure précise ; un refus dégrade sans bloquer |

Trois refus, trois issues propres :

| Refus | Conséquence | Ce que voit l’enseignant |
|---|---|---|
| Autorisation refusée | Aucun rappel système | Message à l’écran, pastille et vibration restent |
| Batterie non exemptée | Rappels possibles mais moins fiables | Avertissement, réglage proposé |
| Alarme exacte refusée | Rappels approximatifs | Aucun blocage : l’alarme tolérante est utilisée |

L’état réel est **toujours** relu, jamais supposé : une autorisation accordée
puis retirée dans les réglages du système est détectée au lancement suivant.

---

## 12. Les états affichés

| Information | Signification |
|---|---|
| Supporté / non supporté | L’appareil peut-il afficher une notification ? |
| Permission | Accordée, refusée, ou jamais demandée |
| Abonné (local) | Les rappels sont armés sur cet appareil |
| Inscrit (serveur) | L’appareil peut recevoir les messages de la direction |
| Livraison | Locale (toujours) |
| Batterie / alarme exacte | Fiabilité réelle des rappels |
| Motif | Pourquoi l’activation n’a pas abouti (`refus`, `fermeture`, `installation requise`, `indisponible`) |

Un motif lisible évite le pire des messages : « échec » sans explication.

---

## 13. Pannes et dégradations

| Panne | Comportement |
|---|---|
| Messagerie non configurée côté serveur | L’inscription répond « non configurée » ; l’application continue |
| Réseau absent | Les rappels planifiés continuent de fonctionner (ils sont locaux) |
| Appareil non joignable | Le message reste dans l’application |
| Limite de 5 appareils atteinte | Refus explicite, avec la possibilité de nettoyer |
| Compte supprimé | L’inscription échoue proprement |
| Jeton révoqué | L’appareil est retiré, une réinscription est tentée |
| Service worker absent | Aucune notification web ; aucun plantage |
| Notification refusée au dernier moment | L’envoi renvoie « non envoyé » ; les couches internes restent |

Aucune de ces pannes ne bloque un écran, ni n’empêche d’enregistrer une séance.

---

## 14. Branchements réciproques

| Circuit | Dépend de | Déclenche |
|---|---|---|
| Calculateur de rappels | Emploi du temps, calendrier, absences, cahier | Rappel de fin, rappel de date manquante |
| Plan natif | Calculateur, langue, classe | Alarmes planifiées sur 14 jours |
| Planificateur de premier plan | Visibilité, réseau, économie de données | Réveil borné, sans scrutation quand l’onglet est masqué |
| Anti-doublon | Verrou, registre local, instant | Diffusion unique |
| Messagerie | Liaison d’appareil, compteur serveur | Notification de message, pastille |
| Pastille | Compteur du serveur | Nombre sur l’icône, remis à zéro après lecture |
| Boîte de messages | Réseau, session | Lecture, accusé, compteur |
| Compagnon | État des notifications, messages non lus | Demande d’activation, sujet « lire la réponse » |
| Conversation | Message envoyé, réponse | Fil de discussion, compteurs de demandes |
| Impression et édition | Aucun | Rien : une notification ne touche jamais un cahier |

---

## 15. Invariants

1. **Un rappel ne touche jamais le compteur de messages.**
2. **Le compteur vient du serveur**, jamais du nombre de notifications reçues.
3. **Un rappel ne sonne pas après la fin de la séance.**
4. **Un même rappel ne part qu’une fois**, quel que soit le nombre d’onglets.
5. **Une panne de notification ne bloque jamais l’application.**
6. **Aucune notification ne contient de nom d’élève, de note ou de contenu de
   cours.**
7. **La cible est validée** ; la console d’administration n’est jamais visée.
8. **Un appareil appartient à un seul compte**, et son transfert est atomique.
9. **La limite de 5 appareils** est explicite, jamais silencieuse.
10. **Les canaux ne sont jamais renommés** après création.
11. **L’autorisation est demandée avec une explication**, et son refus dégrade
    proprement.
12. **Un rappel planifié est idempotent** : replanifier ne duplique pas.
13. **Le passage au jour suivant tient compte du fuseau marocain.**
14. **Une confirmation tardive ne remplace pas un message neuf.**
