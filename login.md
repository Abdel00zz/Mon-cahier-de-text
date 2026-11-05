# Les mécanismes de connexion

Ce document décrit **comment un professeur (ou un membre de la direction) entre
dans l’application**, comment sa session se maintient, ce qui la révoque, et ce
qu’elle n’autorise jamais.

Il ne recense aucun fichier : il décrit des circuits. Pour les formes de données,
voir `json.md` ; pour la synchronisation, voir `cloude.md` ; pour les
comportements pédagogiques, voir `mecanisme.md`.

Vocabulaire employé :

| Terme | Sens exact dans ce document |
|---|---|
| **Identité** | L’identifiant stable d’un compte : `acct_…` (e-mail/Google) ou un numéro de 8 à 15 chiffres |
| **Propriétaire** | L’identité qui possède les données locales ; jamais un simple numéro de contact |
| **Session** | Le cookie signé qui prouve l’identité au serveur |
| **Espace de travail** | Les données locales rattachées au propriétaire actif |
| **Reprise** | La vérification de session qui se produit au démarrage et au retour dans l’application |
| **Quota** | Un compteur borné de tentatives, par identité ou par adresse |

---

## 1. Principe général

La connexion **n’authentifie qu’une identité**. Elle n’écrit jamais de donnée
pédagogique : ni cycle, ni matière, ni classe. Ces informations appartiennent à
l’assistant de création et à la configuration du compte, qui suit l’utilisateur
par la synchronisation.

Trois conséquences directes :

1. Un professeur peut travailler **hors ligne** avec une session locale non
   vérifiée : la carte, l’éditeur, l’impression fonctionnent.
2. Une session locale **n’autorise jamais un envoi cloud**. Le moteur de
   synchronisation exige une session vérifiée ; sans elle, le travail reste en
   attente.
3. Une connexion réussie ne « répare » pas une donnée locale illisible : elle ne
   touche qu’à l’identité.

---

## 2. Deux portes distinctes

| | Professeur | Direction |
|---|---|---|
| Preuve | Mot de passe ou compte Google | Code d’accès partagé de l’établissement |
| Cookie | `cdt_session` | `cdt_admin` |
| Durée | 30 jours | 12 heures |
| Quota de tentatives | 10 par identité / 5 minutes | 8 par adresse / 15 minutes |
| Portée | Ses propres cahiers | Tous les professeurs de l’établissement |
| Révocation | Blocage du compte par la direction | Expiration du cookie, ou retrait du code |

Les deux cookies sont **séparés** : une session de direction n’ouvre jamais les
cahiers d’un professeur, et une session de professeur n’ouvre jamais la console.

---

## 3. L’identité d’un compte

| Notion | Règle |
|---|---|
| Identifiant | Soit `acct_` suivi de 32 caractères hexadécimaux (comptes e-mail/Google), soit 8 à 15 chiffres (comptes historiques par téléphone) |
| Propriétaire des données | L’identifiant, **jamais** le numéro de téléphone affiché |
| Numéro de contact | Champ de profil distinct, rempli seulement s’il est vide, et jamais utilisé comme clé de propriété |
| Nom affiché | Rempli une seule fois à partir du compte, si le profil local est vide |
| Marqueur d’accueil | Appartient au **compte** (serveur), pas à l’appareil : terminer l’accueil sur un téléphone le termine partout |

Pourquoi cette séparation ? Parce qu’un professeur change de numéro, et qu’un
compte créé par e-mail peut n’avoir aucun numéro. Indexer les cahiers sur un
numéro rendrait les données introuvables au premier changement.

---

## 4. Création de compte

Trois chemins, une seule règle de fin.

### 4.1 Par e-mail et mot de passe

1. Nom, prénom, e-mail, mot de passe (et téléphone facultatif) sont validés.
2. Un quota d’inscription s’applique par adresse e-mail.
3. L’identité est créée chez le fournisseur d’identité, avec un rôle « professeur ».
4. Le profil applicatif est créé **dans la même transaction** que son instantané
   d’administration initial.
5. Si le profil applicatif échoue, l’identité créée est supprimée : jamais de
   compte fantôme.
6. Une session est ouverte immédiatement.

### 4.2 Par téléphone et mot de passe (comptes historiques)

1. Nom, prénom, téléphone et mot de passe sont validés.
2. Le profil est créé **seulement si le numéro est libre** : un numéro déjà pris
   produit un refus explicite (« Un compte existe déjà avec ce numéro »), jamais
   un écrasement.
3. Le mot de passe est conservé sous forme d’empreinte à mémoire dure.
4. L’instantané d’administration est écrit immédiatement ; si cette seconde
   écriture échoue, le profil est retiré et le numéro redevient disponible.
5. Une session est ouverte immédiatement.

### 4.3 Par Google

1. Le client récupère un jeton d’identité Google (fenêtre sur le web, sélecteur
   natif sur téléphone).
2. Le serveur le transmet au fournisseur d’identité pour vérification.
3. Le profil est **provisionné** s’il n’existe pas ; sinon il est réutilisé.
4. Règle absolue : **un fournisseur ne remplace jamais un profil existant**. Si
   l’identité authentifiée ne correspond pas au profil visé, la connexion est
   refusée (« Identité de compte incompatible »), laissant le cahier, les
   classes et l’espace local intacts.

### 4.4 La configuration de départ

L’inscription peut transmettre une identité de classe (cycle, niveau, groupe,
matière). Cette configuration :

- est **facultative** — l’assistant peut la poser plus tard ;
- utilise les mêmes niveaux officiels et les mêmes règles de groupe que le
  tableau de bord, jamais une liste parallèle ;
- crée au plus **une** classe d’essai, rattachée au propriétaire du compte.

À la fin, un marqueur d’accueil est posé **sur le compte** : un appareil neuf ne
rejouera pas l’accueil.

---

## 5. Connexion par mot de passe

Déroulé serveur, dans l’ordre :

| # | Étape | Détail |
|---|---|---|
| 1 | Choix du mode | Un identifiant contenant `@` est traité comme un e-mail, sinon comme un téléphone |
| 2 | Quota | Compteur incrémenté et expiré de façon indivisible ; au-delà de 10 tentatives en 5 minutes : refus 429 |
| 3 | Lecture du profil | Profil absent ⇒ même message qu’un mot de passe faux (pas d’énumération de comptes) |
| 4 | Vérification | Hachage à mémoire dure, comparaison à temps constant |
| 5 | Libération du quota | Une connexion **réussie** remet le compteur à zéro : le quota protège du forçage, pas de l’usage normal (réinstallation, plusieurs appareils) |
| 6 | Blocage | Compte suspendu par la direction ⇒ refus 403 avec un motif explicite |
| 7 | Instantané d’administration | Réparé s’il manque, **sans jamais écraser** les données pédagogiques |
| 8 | Session | Jeton signé, cookie 30 jours, `HttpOnly`, `Secure`, `SameSite=Lax`, portée racine |

Le mot de passe n’est jamais stocké en clair, jamais journalisé, jamais renvoyé.
Il est conservé sous forme d’une empreinte à mémoire dure (sel aléatoire de 16
octets, coût réglé explicitement, longueur dérivée 64 octets), et la comparaison
est à temps constant : un attaquant ne peut pas deviner un mot de passe
caractère par caractère, ni réutiliser une empreinte volée sur un autre compte.

---

## 6. Connexion Google

| Contexte | Chemin | Détail |
|---|---|---|
| Web | Fenêtre contextuelle | L’application demande la configuration publique (clé, domaine) avant d’ouvrir la fenêtre ; le SDK n’est chargé qu’à l’écran de connexion ; la persistance est **en mémoire** |
| Téléphone (application native) | Sélecteur natif | Un jeton d’identité est renvoyé au serveur |
| Échec de configuration | Message dédié | « Connexion Google indisponible sur cette version, utilisez votre e-mail » |

Règle structurante : **le cookie de session est la seule session persistante**.
Le SDK est déconnecté après la connexion, même en cas de succès — aucun jeton
Google ne traîne dans le navigateur.

Cas d’erreur couverts, avec message utilisateur explicite :

| Situation | Message |
|---|---|
| Fenêtre fermée par l’utilisateur | Aucun message (action volontaire) |
| Fenêtre bloquée | Autoriser la fenêtre, puis réessayer |
| Compte existant par e-mail mais connexion par Google | Se connecter avec la méthode habituelle |
| Domaine non autorisé | Utiliser l’e-mail |
| Aucun compte Google sur l’appareil | En ajouter un, ou utiliser l’e-mail |
| Réauthentification exigée | Choisir à nouveau le compte |

---

## 7. Reprise de session

Au démarrage, quatre états sont possibles :

| État | Signification | Ce qui est autorisé |
|---|---|---|
| `loading` | Vérification en cours, aucune identité en cache | Rien, écran d’attente |
| `authenticated` | Session vérifiée par le serveur | Tout, y compris l’envoi cloud |
| `offline` | Identité en cache, serveur injoignable | Travail local complet, aucun envoi cloud |
| `anonymous` | Aucune identité valable | Écran de connexion |

Déroulé de la reprise :

1. Un marqueur de déconnexion explicite l’emporte sur tout : aucune reprise
   silencieuse après une déconnexion volontaire.
2. Sans espace de travail connu mais avec une identité en cache, l’espace est
   réadopté.
3. La vérification interroge le serveur avec un **délai court** (8 s) : un réseau
   lent ne bloque pas indéfiniment l’ouverture.
4. Réponse invalide ou serveur injoignable avec une identité en cache : l’état
   passe en `offline`, l’identité en cache est conservée, et une nouvelle
   tentative est programmée avec un délai croissant.
5. Refus explicite (session expirée, compte supprimé) : le cache est purgé et
   l’état passe à `anonymous`.
6. Compte bloqué par la direction : la session locale est révoquée et l’écran de
   connexion **explique** la situation au lieu d’échouer sans mot.
7. La vérification est rejouée au retour du réseau et au retour au premier plan,
   jamais en boucle quand l’onglet est masqué.

---

## 8. L’espace de travail du compte

Se connecter, c’est **adopter un espace**, pas seulement un jeton.

| Étape | Effet |
|---|---|
| Nettoyage du badge de messages | Un autre compte ne doit pas hériter du compteur du précédent |
| Bascule d’espace | Les travaux en cours sont **vidés** avant la bascule (écriture forcée), l’instantané de l’ancien compte est conservé |
| Réveil de la synchronisation | Les métadonnées du nouvel espace sont relues, la file locale reprend |
| Profil appliqué aux réglages | Numéro de contact vide et nom affiché vide sont remplis, **sans avancer l’horloge des réglages** (sinon la première synchronisation écraserait le cloud) |
| Identité mise en cache | Pour permettre le mode hors ligne |
| Annonce aux écrans | Classes et configuration sont relues |

Contraintes associées :

- Un **changement de compte ne mélange jamais deux espaces** : le propriétaire
  est écrit dans la portée d’espace de travail, et toute écriture d’un composant
  appartenant à l’ancien espace est rejetée.
- Un onglet qui détecte un changement d’espace (autre onglet, déconnexion)
  **invalide son état et se recharge** au lieu d’écrire dans le mauvais espace.
- Après déconnexion, les données non synchronisées **restent** sur l’appareil :
  elles seront reprises à la prochaine connexion de leur propriétaire.

---

## 9. Réinitialisation du mot de passe

| Étape | Règle |
|---|---|
| Demande | Par e-mail uniquement, quota par adresse |
| Envoi | Message de réinitialisation émis par le fournisseur d’identité |
| Réponse | **Identique** pour une adresse inconnue : aucune énumération de comptes |
| Effet | Aucune session n’est ouverte à distance ; l’utilisateur se reconnecte |

Un compte créé uniquement via Google n’a pas de mot de passe : l’écran de
connexion le dit (« Ce compte se connecte avec Google ») plutôt que de laisser
croire à une faute de frappe.

---

## 10. Déconnexion et suppression

### Déconnexion

1. L’appareil est retiré des notifications push (attente bornée à 5 s, jamais
   bloquante).
2. Un marqueur « déconnecté » est posé **avant** la bascule d’espace : si la
   bascule échoue, le marqueur est restauré.
3. L’espace de travail revient à l’état anonyme, l’identité en cache est effacée,
   les écrans rechargent leurs données.
4. Le cookie est effacé côté serveur ; une connexion suivante **attend** cette
   réponse (bornée si le réseau est coupé) pour ne pas réutiliser l’ancienne
   session.
5. Le SDK Google est déconnecté.

Le travail non synchronisé n’est pas supprimé : il reste dans l’espace du
propriétaire et sera poussé à sa prochaine connexion.

### Suppression de compte

La suppression est une opération **en ligne** (elle doit réussir côté serveur).
Ensuite seulement : désabonnement push, espace anonyme, instantané et rappels
natifs du propriétaire effacés, badge retiré, écrans rechargés.

---

## 11. La console de la direction

| Élément | Règle |
|---|---|
| Secret | Variable serveur d’au moins 6 caractères ; absente ⇒ console indisponible (500), jamais ouverte par défaut |
| Comparaison | À temps constant |
| Quota de connexion | 8 tentatives par adresse et par 15 minutes |
| Adresse prise en compte | En-tête de proxy **seulement** derrière l’hébergeur, sinon empreinte « inconnue » : un client ne choisit pas son identité de quota |
| Cookie | `cdt_admin`, 12 heures, distinct du cookie professeur |
| Quotas d’écriture | Notifications 30 / 10 min · suppressions 10 / 10 min · imports 20 / 10 min · autres écritures 120 / 10 min |
| Effet du dépassement | Refus 429 avec `Retry-After`, jamais de mise en file silencieuse |

Une session d’administration volée ne peut donc ni vider un établissement ni
inonder les professeurs : chaque famille d’écritures a son propre budget.

---

## 12. Codes et messages

| Code | Situation | Ce que voit l’utilisateur |
|---|---|---|
| `INVALID_CREDENTIALS` | Identifiant ou mot de passe faux | « Vérifiez votre e-mail et votre mot de passe. » |
| `ACCOUNT_EXISTS` | E-mail déjà utilisé | « Ce compte existe déjà. Connectez-vous ou réinitialisez votre mot de passe. » |
| `PROVIDER_GOOGLE` | Compte sans mot de passe | « Ce compte se connecte avec Google. » |
| `ACCOUNT_BLOCKED` | Compte suspendu | « Accès suspendu. Contactez votre établissement. » |
| `TOO_MANY_ATTEMPTS` | Quota dépassé | « Réessayez dans quelques minutes. » |
| `AUTH_NETWORK_TIMEOUT` | Serveur muet | « Le serveur de connexion ne répond pas. Vérifiez Internet. » |
| `AUTH_UNAVAILABLE` | Google non configuré côté serveur | « Connexion Google indisponible, utilisez votre e-mail. » |
| `GOOGLE_TIMEOUT` | Sélecteur Google sans réponse | « Google n’a pas répondu. Fermez le sélecteur puis réessayez. » |

Deux principes dans ces messages :

1. **Jamais de diagnostic interne** (nom de fournisseur, code technique) dans le
   texte affiché.
2. **Toujours une action** : quoi faire ensuite, sans culpabiliser l’utilisateur.

Les écrans de connexion sont bilingues arabe/français et suivent la langue de
l’application, y compris les messages du fournisseur d’identité.

---

## 13. Ce que la connexion ne fait jamais

1. **Écrire une donnée pédagogique** : aucune classe, aucun cahier n’est créé par
   la connexion, hors la classe d’essai explicitement demandée à l’inscription.
2. **Écraser un profil ou un cahier existant** au motif qu’un fournisseur
   d’identité répond.
3. **Autoriser un envoi cloud** sur la seule foi du cache local.
4. **Mélanger deux comptes** sur le même appareil : l’espace est basculé, mis en
   instantané et isolé.
5. **Avancer l’horloge des réglages** lors du remplissage du profil.
6. **Révéler l’existence d’un compte** par un message différent.

---

## 14. Branchements réciproques

| Circuit | Dépend de | Ce qu’il déclenche |
|---|---|---|
| Connexion | Fournisseur d’identité, quotas, profil, instantané d’administration | Cookie de session, adoption d’espace, réveil de la synchronisation |
| Adoption d’espace | Portée d’espace, écritures en cours, instantané de l’ancien compte | Vidage des travaux, relecture des classes et de la configuration |
| Reprise de session | Cookie, réseau, cache d’identité, portée d’espace | État `authenticated` / `offline` / `anonymous`, purge du cache |
| Blocage | Direction | Révocation au prochain contrôle, message à la connexion |
| Synchronisation | Session vérifiée **et** propriétaire courant **et** espace courant | Envoi cloud autorisé ou différé |
| Déconnexion | Push, marqueur, espace | Cookie effacé, espace anonyme, travail conservé |
| Autre onglet | Portée d’espace, marqueur de déconnexion | Rechargement immédiat de l’onglet |
| Console | Secret, quotas par adresse | Cookie d’administration 12 h, écritures bornées par famille |

---

## 15. Invariants

1. **L’identité est stable, le contact est un champ.** Aucun circuit ne prend un
   numéro de contact pour une clé de propriété.
2. **Un quota libéré par un succès** : dix connexions légitimes ne verrouillent
   pas un compte.
3. **Le cookie est la seule session persistante** ; le SDK externe est déconnecté
   après usage.
4. **Une session locale permet de travailler, jamais de publier.**
5. **Une déconnexion explicite est définitive** jusqu’à la prochaine connexion
   volontaire.
6. **Aucune perte de travail au changement de compte** : l’espace sortant est
   vidé et conservé.
7. **Aucun message ne révèle l’existence d’un compte.**
8. **La console a ses propres quotas**, par famille d’écritures.
