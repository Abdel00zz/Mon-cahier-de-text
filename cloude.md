# Les mécanismes du cloud

Ce document décrit **ce que l’application envoie au cloud, quand, comment, et ce
qu’elle en reçoit** : file de travail, cadence, découpage en lots, fusion,
conflits, suppressions, premier chargement, pannes et reprises.

Il décrit des circuits, pas des fichiers. Pour les formes JSON, voir `json.md` ;
pour la connexion et la session, voir `login.md` ; pour le comportement
pédagogique, voir `mecanisme.md`.

Vocabulaire employé :

| Terme | Sens exact dans ce document |
|---|---|
| **Local d’abord** | Toute écriture est d’abord locale et durable ; le cloud ne fait que suivre |
| **Push** | Envoi du travail local vers le cloud |
| **Pull** | Rapatriement de l’état cloud vers l’appareil |
| **File** | L’ensemble des travaux locaux marqués « à envoyer » |
| **Lot** | Un envoi borné en octets, contenant une ou plusieurs classes |
| **LWW** | *Last writer wins* : l’horodatage le plus récent gagne, à égalité de nature |
| **Filigrane** | Un horodatage imposé par la direction, que le local ne peut pas dépasser |
| **Pierre tombale** | La trace durable d’une classe supprimée, qui empêche sa résurrection |
| **Espace de travail** | Les données locales du compte actif ; le cloud lui correspond par propriétaire |

---

## 1. Principe : le cloud est un miroir, pas une dépendance

| Règle | Conséquence |
|---|---|
| L’écriture locale précède toujours l’envoi | Aucun écran n’attend le réseau pour enregistrer |
| L’envoi est regroupé dans un cycle espacé | Une rafale d’édition ne produit pas une rafale de requêtes |
| Le pull n’écrase jamais un travail local plus récent | Le local gagne quand il est postérieur, sauf champ autoritaire |
| Un échec cloud laisse le travail **en attente** | Il n’est ni perdu, ni marqué « synchronisé » à tort |
| Le cloud n’est jamais la source de vérité d’un calcul | Les compteurs, la progression, la numérotation restent locaux |

---

## 2. Deux fournisseurs, une seule interface

| Fournisseur | Sélection | Remarque |
|---|---|---|
| Base clé-valeur distante (Upstash) | Variables d’environnement `UPSTASH_*`, ou variables historiques `KV_*` | Mode par défaut |
| Base documentaire (Firestore) | Drapeau d’environnement `CLOUD_PROVIDER=firestore` | Transactions explicites, mêmes opérations |

Trois règles structurantes :

1. **Aucun repli en mémoire** : un repli mémoire rendrait les comptes invisibles
   entre les fonctions de connexion, de synchronisation et d’administration.
   Mieux vaut une erreur claire (« Base de données non configurée ») qu’un
   miroir fantôme.
2. **Une seule interface d’opérations** : lecture, écriture, hachage, incrément
   avec expiration, transaction. Les appelants ignorent le fournisseur.
3. **Gel de migration** : un drapeau d’environnement suspend toutes les écritures
   cloud (« Migration cloud en cours. Vos modifications locales seront
   synchronisées après la reprise. ») — le local continue de fonctionner.

Organisation du stockage :

| Objet | Clé logique |
|---|---|
| Profil d’un compte | par identité |
| Bloc « classes » : liste, créneaux, grille, réglages, métadonnées, pierres tombales, surcharges | par propriétaire |
| Cahier d’une classe | par propriétaire **et** par classe |
| Instantané de direction | index par propriétaire |
| Messages de la direction | par propriétaire |
| Appareils de notification | par propriétaire |
| Référentiels imposés (horloge, politique d’évaluation) | global, plus une affectation par propriétaire |
| Compteurs de quota | par identité ou par adresse |

---

## 3. Ce qui circule, ce qui ne circule jamais

### 3.1 Ce qui monte

| Donnée | Pourquoi |
|---|---|
| Liste des classes et leurs métadonnées | Retrouver son espace sur un autre appareil |
| Cahier de chaque classe, avec sa direction d’écriture | Le cœur du métier |
| Emploi du temps (grille et créneaux par classe) | Il ouvre l’espace et déclenche les alertes |
| Réglages du professeur | Préférences pédagogiques et listes partagées |
| Listes d’élèves, évaluations, documents, absences d’évaluation | Saisie lourde, à ne pas refaire |
| Remarques de séance personnalisées | Même raison |
| Instantané de direction | Projection en lecture seule pour l’établissement |
| Pierres tombales de classes supprimées | Empêcher la résurrection |

### 3.2 Ce qui ne monte jamais

| Donnée | Raison |
|---|---|
| État d’abonnement aux notifications d’un appareil | Propre à un téléphone : un appareil peut recevoir, l’autre non |
| Vibration de séance | Propre à l’appareil |
| Référentiel d’horloge imposé par la direction | **Autoritaire** : il descend du serveur, ne remonte pas |
| Politique de contrôle continu imposée | Même règle : résolue par le serveur à chaque pull, hors LWW |
| Jetons, cookies, secrets | Jamais dans un blob synchronisé |
| Journaux d’édition et mémoire d’impression | Restent locaux (sauvegarde complète seulement) |

---

## 4. L’unité de travail

Le moteur ne parcourt pas les données pour deviner quoi envoyer : tout écrivain
**marque** son travail.

| Marque | Signification |
|---|---|
| Classe sale | Le cahier de cette classe a changé |
| Liste de classes sale | L’identité ou l’ordre des classes a changé |
| Suppression enregistrée | Cette classe doit disparaître partout |
| Réglages touchés | Une clé synchronisable a changé |

À cela s’ajoutent deux mémoires d’horodatage :

| Mémoire | Contenu | Usage |
|---|---|---|
| Par classe | dernier instant local, dernier instant synchronisé | Décider qui gagne, détecter un conflit |
| Réglages | même paire | Arbitrer les réglages sans casser l’état local d’un appareil |

Quatre annonces circulent entre moteurs et écrans : « sale », « pull appliqué »,
« configuration changée », « classes changées ». Aucun écran ne scrute le
stockage : il écoute.

---

## 5. Déclencheurs et cadence

| Déclencheur | Effet |
|---|---|
| Édition ordinaire | Marque la classe, programme une fenêtre cloud |
| Changement d’emploi de temps | Envoi **immédiat**, avec un plafond qui absorbe une rafale de cases cochées |
| Retour du réseau | Reprise immédiate de la file |
| Retour au premier plan | Reprise, sans scrutation en boucle quand l’onglet est masqué |
| Fermeture / mise en arrière-plan de la page | Envoi de secours (« keepalive »), borné en taille |
| Fin de pull | Nettoyage puis envoi de ce qui reste dû |
| Action explicite de l’utilisateur | Réveil de la file, **sans** contourner la cadence |

**Cadence** : trois minutes entre deux échanges cloud. La première fenêtre
s’ouvre trois minutes après le premier besoin. Un travail arrivé plus tôt est
programmé pour la fenêtre suivante ; un travail impératif (action explicite) part
tout de suite, mais ne raccourcit pas la fenêtre des autres.

Pourquoi trois minutes ? Parce qu’un cahier s’écrit par rafales (une séance
entière en une minute) : envoyer chaque frappe coûterait cher, saturerait le
quota et rendrait les conflits plus fréquents.

---

## 6. Le push

### 6.1 Composition

Un envoi contient, selon ce qui est dû : la liste des classes, les créneaux,
la grille, les réglages, les suppressions horodatées, une liste de cahiers, et
l’instantané de direction.

### 6.2 Découpage en lots

| Borne | Valeur | Rôle |
|---|---|---|
| Corps accepté par le serveur | ≈ 950 000 octets | Au-delà : refus explicite |
| Budget d’un lot | 700 000 octets de cahiers | Décide du découpage, avec marge pour le cadrage de la requête |
| Plafond de fil | 900 000 octets | Marge pour la liste des classes, les réglages, l’instantané, les suppressions |
| Charge décompressée | 3 Mio | Refus au-delà |
| Encodage | compression + base 64 | Allège les gros cahiers |

Pourquoi découper ? Parce qu’un envoi monolithique de plusieurs cahiers
volumineux dépassait la limite du serveur **à chaque tentative** : la file
échouait indéfiniment et le badge affichait « Erreur de synchro » en permanence.
Un lot qui tient sous le budget passe ; un cahier trop gros part **seul**.

### 6.3 Le cahier trop gros

- Il est **nommé** dans le plan d’envoi.
- Il ne bloque pas le compte : les classes suivantes montent normalement.
- Son travail **reste en attente** (aucun nettoyage trompeur).
- Le professeur est prévenu **une fois**, avec le nom de la classe : c’est un
  contenu à répartir, pas une panne de synchronisation.
- Toute **autre** panne (réseau, serveur, conflit, lot multi-classes) arrête la
  file : enchaîner des requêtes vouées à l’échec ne ferait que la retarder.

### 6.4 Échecs et reprises

| Situation | Traitement |
|---|---|
| Réseau absent | État hors ligne, reprise au retour |
| Réponse 401 | Session expirée : message dédié, aucune boucle |
| Réponse 409 | Compte actif changé : message dédié, rechargement nécessaire |
| Réponse 413 | Charge trop lourde : message nommant la classe |
| Échec serveur passager | Nouvelle tentative, délai croissant avec **gigue bornée** et respect de l’en-tête `Retry-After` |
| Donnée locale illisible | État d’erreur, copie conservée, synchronisation suspendue |
| Stockage local plein | État d’erreur et message explicite |

Chaque **cause** d’erreur produit au plus un message : répéter le même toast à
chaque tentative harcèlerait l’enseignant. Pendant l’accueil, aucun message
n’interrompt le parcours : l’erreur reste visible dans l’état de synchronisation.

### 6.5 Nettoyage sélectif

Après un envoi, le moteur ne nettoie **que ce qui est réellement parti**. Un lot
partiel ou un cahier écarté laisse son travail marqué : le prochain cycle le
reprendra. Un nettoyage complet marquerait « synchronisé » un cahier qui n’a
jamais quitté l’appareil — c’est exactement le mensonge que ce circuit interdit.

### 6.6 Envoi de secours

À la fermeture de la page, un envoi « keepalive » tente de vider la file. Sa
limite est d’environ 64 Ko : au-delà, la requête serait rejetée. Un gros cahier
n’est donc pas perdu — il sera repris au prochain démarrage grâce aux
métadonnées, précisément parce qu’il n’a pas été marqué synchronisé.

---

## 7. Le pull

### 7.1 Ce qui est demandé

| Demande | Réponse |
|---|---|
| Bloc complet | Liste des classes, créneaux, grille, réglages, métadonnées, surcharges de direction, pierres tombales, plus l’horloge imposée et la politique d’évaluation résolues |
| Cahier d’une classe | Cahier + direction d’écriture + horodatage |
| Capacités | Encodage accepté et taille décompressée maximale |
| Horloge seule | Politique effective pour ce compte |

Un pull ne remplace jamais l’instantané local sans l’avoir validé.

### 7.2 Deux phases

**Phase 1 — décisions (synchrone).** Pour chaque classe du serveur : appliquer,
remettre en file, ou ne rien faire. Les décisions se prennent **avant** toute
écriture, sans attendre le réseau.

**Phase 2 — exécution (parallèle).** Un aller-retour par cahier, avec deux
garanties :

1. **Aucune écriture avant la fin des lectures** : le lot de validations précède
   les écritures.
2. **Aucun entrelacement** : à partir du commit, il n’y a plus d’attente, donc
   aucune saisie de l’utilisateur ne peut s’intercaler entre la décision et son
   application.

Une saisie ou un push **invalide la réponse en vol** : le pull est annulé par un
mécanisme d’abandon, et inversement.

### 7.3 Ce qui est décidé à la main

| Situation | Décision |
|---|---|
| Classe connue uniquement du serveur | Appliquer |
| Serveur plus récent que le local | Appliquer |
| Surcharge de direction présente | Appliquer, **même** si le local est plus récent ; seules les métadonnées de classe sont appliquées, le cahier local est conservé |
| Local plus récent que le serveur | Remettre en file (le local gagnera au prochain push) |
| Local et serveur identiques | Ne rien faire |
| Classe supprimée (pierre tombale) | Retirer la copie locale avant toute fusion |
| Conflit détecté | Archiver la version **perdante** avant remplacement |

### 7.4 Réglages, listes et documents

| Cas | Règle |
|---|---|
| Appareil **neuf** (aucun réglage local) | Tous les réglages descendus du cloud sont restaurés |
| Appareil déjà configuré | Les réglages locaux sont respectés ; l’état d’envoi reste par appareil |
| Réglages plus récents au cloud | Fusion par horodatage, clé par clé |
| Suivis d’élèves | Fusion **granulaire par élève et par évaluation** : deux saisies sur deux évaluations différentes ne s’écrasent pas |
| Listes d’élèves | Réconciliation avec les éditions acceptées par le serveur |
| Documents pédagogiques | Fusion dédiée, jamais un remplacement en bloc |
| Classes supprimées | Toute référence (créneaux, grille, évaluations, ordre du tableau de bord) est purgée |

### 7.5 Avancement visible

Chaque cahier rapatrié fait avancer un compteur publié aux écrans, sans écran
bloquant : « Préparation des cahiers · 3 / 7 ». La règle de sûreté reste intacte
(rien n’est écrit avant la fin des lectures).

---

## 8. Conflits et autorité

### 8.1 Trois niveaux d’autorité

| Niveau | Qui gagne | Exemple |
|---|---|---|
| **Autoritaire** | Le serveur, toujours | Horloge de référence, politique de contrôle continu |
| **Protégé par filigrane** | Le serveur jusqu’à un envoi plus récent | Dates de devoirs imposées, cahier importé par la direction |
| **LWW** | L’horodatage le plus récent | Cahier, métadonnées de classe, réglages |

### 8.2 Détection de conflit

Un conflit est signalé quand **les deux côtés ont bougé** depuis le dernier point
commun : un travail local en attente dont le serveur est plus récent, ou deux
horodatages postérieurs au dernier instant synchronisé et différents entre eux.
Un conflit n’est pas une erreur : c’est une divergence à arbitrer.

Avant tout remplacement, la version perdante est **archivée localement** (côté
local comme côté cloud) : elle reste consultable, et l’utilisateur ne découvre
pas une disparition silencieuse.

### 8.3 Ce que le serveur refuse d’accepter

| Refus | Motif |
|---|---|
| Cahier plus ancien qu’un import de direction | Un appareil resté hors ligne ne remplace pas un contenu imposé |
| Cahier plus ancien que la version cloud déjà connue | Le serveur compare des instants, y compris les anciens formats à décalage horaire |
| Réglages plus anciens qu’une date imposée | Même logique, appliquée aux dates de devoirs |
| Classe inconnue, cahier dupliqué, identifiant manquant | Intégrité du bloc |

Le serveur renvoie les identifiants **acceptés** ; le client nettoie seulement
ceux-là.

---

## 9. Suppression d’une classe

Une suppression n’est jamais un simple effacement local.

1. Un marqueur horodaté (pierre tombale) est écrit localement **et** envoyé.
2. Au pull, la pierre tombale fait retirer la copie locale du cahier et ses
   métadonnées.
3. Le serveur conserve la pierre tombale : un appareil ancien ne peut pas
   recréer la classe supprimée.
4. Les références à cette classe sont purgées du bloc de réglages (créneaux,
   grille, évaluations, ordre du tableau de bord).
5. Seules les **nouvelles** suppressions effacent réellement un cahier cloud :
   rejouer chaque pierre tombale historique à chaque envoi faisait croître le
   coût sans fin, jusqu’à dépasser la limite d’opérations d’une transaction et
   bloquer **tous** les envois.

La mémoire d’impression et le journal d’édition d’une classe supprimée restent
locaux : ils ne partent jamais au cloud.

---

## 10. Premier chargement d’un appareil neuf

| Étape | Poids | Signification |
|---|---|---|
| Emploi de temps et réglages | 55 % | Ils **ouvrent** l’espace : grille, préférences, listes |
| Liste des classes | 45 % | Elle complète l’espace |
| Cahiers | hors barre | Téléchargés **à la demande**, quand une classe est ouverte |

L’écran de chargement affiche exactement ce qui a été réellement appliqué, pas
une animation décorative. Une liste de classes écrite suffit à considérer le
premier chargement comme complet, même si rien n’avait changé localement.

---

## 11. Réglages : deux listes, deux rôles

| Liste | Question à laquelle elle répond |
|---|---|
| Clés **synchronisables** | Qu’est-ce qui appartient au professeur et doit le suivre d’un appareil à l’autre ? |
| Clés **déclenchantes** | Qu’est-ce qui, modifié, doit marquer le bloc de réglages comme sale ? |

Elles se recoupent sans être identiques : l’emploi du temps, les créneaux, les
listes d’élèves, les évaluations, les documents, les absences d’évaluation et
les remarques de séance sont à la fois synchronisables et déclenchantes.
L’abonnement aux notifications et la vibration de séance, eux, ne se synchronisent
pas : propres à chaque téléphone, ils remontent seulement en **lecture** vers la
direction (dans l’instantané) et ne déclenchent aucun envoi de réglages.

L’horloge et la politique de contrôle continu n’apparaissent dans aucune des
deux : elles sont autoritaires et redescendent à chaque pull.

---

## 12. Notifications et messages

| Canal | Mécanisme |
|---|---|
| Notifications serveur | Réservées à l’application Android (service de messagerie du système) : enregistrement d’un appareil par propriétaire et par installation, désabonnement, statut, envoi de test. Le Web Push a été retiré : plus d’abonnement navigateur, plus d’index d’appareils web. Un appareil qui se déconnecte est retiré ; un échec de retrait n’empêche jamais la déconnexion |
| Rappels de séance | Planifiés **localement** à partir de l’emploi de temps et des réglages ; le rappel de retard revient avec la tâche des notifications natives planifiées ; les rappels locaux et le fil interne restent indépendants de l’envoi serveur |
| Messages de la direction | Boîte par propriétaire, compteur de non-lus, accusé de lecture explicite ; le compteur est repris dans l’instantané de direction |

---

## 13. Sécurité et validation

| Contrôle | Règle |
|---|---|
| Identité | Session vérifiée obligatoire sur **chaque** requête cloud |
| Propriétaire déclaré | L’en-tête de propriétaire doit correspondre à la session, sinon refus 409 « Le compte actif a changé » |
| Taille | Corps borné (≈ 950 000 octets), liste de cahiers bornée au nombre de classes connues |
| Structure | Chaque cahier est validé par le moteur partagé de l’arbre, refus explicite au premier défaut |
| Réglages | Validés clé par clé ; les suivis d’élèves exigent un horodatage |
| Instantané | Intégralement validé ; le téléphone et l’instant sont **imposés** par la session, jamais par le client |
| Cache | Aucune réponse de synchronisation n’est mise en cache par le navigateur |

Ce que le serveur **préserve** d’un instantané déjà stocké : coordonnées de
contact, statut de blocage, compteurs de messages et de demandes, dernier
message. Le client ne peut donc pas effacer un état administratif en réécrivant
sa projection.

---

## 14. États affichés

| État | Sens | Ce que l’utilisateur comprend |
|---|---|---|
| `idle` | Rien à envoyer | Tout est à jour |
| `pending` | Du travail attend la fenêtre cloud | Ce sera envoyé sous peu |
| `syncing` | Échange en cours | Patienter, sans blocage |
| `synced` | Dernier échange réussi | Heure du dernier envoi |
| `offline` | Pas de réseau, ou serveur injoignable | Travail conservé localement |
| `error` | Refus, donnée illisible, stockage plein | Message nommant la cause et l’action |

Un seul message par cause, jamais par tentative. La préparation des cahiers
prime sur l’état générique : « Préparation des cahiers · n / total ».

---

## 15. Observabilité

| Mesure | Usage |
|---|---|
| Durée de la synchronisation, des classes, de l’emploi du temps | Repérer les régressions de performance |
| Avancement du pull (cahiers préparés / total) | Alimenter l’écran de préparation |
| Cause d’erreur mémorisée | Éviter la répétition des messages |
| Version applicative et état de mise à jour | Distinguer un défaut de données d’un défaut de version |

---

## 16. Branchements réciproques

| Circuit | Dépend de | Déclenche |
|---|---|---|
| Éditeur | Enregistrement local | Marque la classe sale, programme un envoi |
| Emploi de temps | Créneaux, horloge | Envoi immédiat, puis alertes de séance recalculées |
| File locale | Marques et horodatages | Plan de lots |
| Push | Session vérifiée, propriétaire courant, budget de lot | Nettoyage sélectif, métadonnées, réponse d’acceptation |
| Pull | Bloc cloud, métadonnées locales | Décisions, archivage des perdants, purge des tombales, réglages restaurés |
| Connexion | Session | Autorise ou interdit le push |
| Changement de compte | Espace de travail | Réveille une file différente |
| Direction | Filigranes et surcharges | Bloque un cahier ou une date anciens, impose l’horloge et la politique |
| Suppression | Pierre tombale | Purge locale, purge des références cloud, blocage de résurrection |
| Notifications | Compte et installation | Abonnement, retrait à la déconnexion |

---

## 17. Invariants

1. **Le local écrit d’abord**, toujours ; le cloud suit.
2. **Un travail non parti reste en attente** : jamais marqué synchronisé par
   optimisme.
3. **Un cahier trop gros ne bloque pas le compte** ; une autre panne arrête la
   file.
4. **La cadence cloud n’est pas contournée** par une édition ordinaire.
5. **Aucune écriture avant la fin des lectures** ; aucun entrelacement avec une
   saisie.
6. **La version perdante est archivée**, jamais effacée.
7. **Une suppression est durable** : une pierre tombale empêche la résurrection.
8. **Le serveur est autoritaire** sur l’horloge et la politique ; le reste est
   LWW.
9. **Les champs administratifs d’un instantané survivent** à tout envoi client.
10. **Un message par cause**, pas par tentative.
