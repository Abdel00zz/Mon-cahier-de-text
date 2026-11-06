# L’application Android — blocs, articles et règles de construction

Ce document décrit **de quoi l’application Android est faite** : la coque, les
plugins natifs, les services système, les permissions, les ressources, la chaîne
de build et les règles à ne pas casser pour bâtir une application de ce type.

Il décrit des blocs et des circuits, sans citer de fichier. Pour l’impression
native, voir `peint.md` ; pour la connexion, voir `login.md` ; pour le cloud,
voir `cloude.md`.

Vocabulaire employé :

| Terme | Sens exact dans ce document |
|---|---|
| **Coque** | L’application Android qui embarque l’interface web |
| **Plugin maison** | Un module natif écrit pour l’application, exposé à l’interface web |
| **Pont HTTP** | Le client réseau natif qui conserve les cookies de session |
| **Canal** | Un canal de notification Android (importance, son, vibration) |
| **Jeton** | L’identifiant d’appareil délivré par le service de messagerie |

---

## 1. Ce qu’est l’application

| Couche | Rôle |
|---|---|
| Interface | Application web (React) compilée pour la coque, embarquée dans l’APK |
| Coque | Projet Android natif : activité unique, thème, insets, vue web durcie |
| Plugins | Cinq modules natifs : coque, mises à jour, notifications, Google, impression |
| Services | Messagerie, reprogrammation du jeton, canaux de notification |
| Données | Stockage local de la vue web ; sauvegarde système désactivée |

L’application est **autonome** : l’interface est embarquée, elle ne se charge pas
depuis un serveur. Le réseau ne sert qu’aux fonctions cloud (compte,
synchronisation, messages) et aux mises à jour.

---

## 2. Identité et versions

| Paramètre | Valeur |
|---|---|
| Identifiant d’application | `ma.cahier.textes` |
| Nom affiché | « Mon cahier de textes » / « دفتر نصوصي » (variante arabe) |
| SDK minimum | 23 (Android 6) |
| SDK de compilation et cible | 36 |
| Version de l’application | Lue depuis le manifeste du projet web (une seule source) |
| Code de version | Incrémenté par un script dédié, jamais à la main |
| Signature de production | Quatre variables d’environnement ; absentes ⇒ le build de release **échoue** au lieu de produire un APK non signé |
| Optimisation de release | R8 activé avec réduction des ressources ; fichier de correspondance conservé |
| Variante de test isolée | Un suffixe d’application `.qa` permet d’installer une version de test à côté de la version signée, sans écraser ses données |

---

## 3. La coque

### 3.1 L’activité principale

| Élément | Choix | Raison |
|---|---|---|
| Splash | Écran de lancement du système, masqué par l’application | Éviter un écran blanc au démarrage |
| Plugins | Enregistrés **avant** la création de la coque | Sinon les appels web échouent silencieusement |
| Canaux de notification | Créés au démarrage | Une notification peut arriver avant tout écran |
| Reprogrammation du jeton | Planifiée dès le démarrage | Le jeton peut tourner application fermée |
| Plein écran | Affichage sous les barres système explicite | Android 15 impose l’affichage sous les barres |
| Insets | Barres système + encoche + clavier, appliqués comme rembourrage | Aucun contenu sous la barre d’état ou le clavier |
| Rotation, clavier, thème | L’activité ne se recrée pas | Éviter de perdre l’état de l’éditeur |
| Redimensionnement au clavier | Ajustement par redimensionnement | Le champ actif reste visible |
| Tâche unique | `singleTask` | Une notification ramène à l’instance existante |

### 3.2 Réglages de la vue web

| Réglage | Valeur | Effet |
|---|---|---|
| Zoom de texte | 100 % | L’application gère elle-même la taille de texte ; pas de double mise à l’échelle |
| Stockage DOM | Activé | Persistance locale des données |
| Base de données | Activée | Compatibilité des anciens socles de stockage |
| Sur-défilement | Désactivé | Pas de rebond visuel superflu |
| Barres de défilement | Masquées | Interface plein écran cohérente |

Ces réglages sont réappliqués à chaque retour au premier plan : certaines
restaurations du système les réinitialisent.

### 3.3 Le pont HTTP natif

Sur Android, une requête `fetch` vers le domaine cloud ne partage pas les
cookies de la vue web de la même manière que sur un navigateur. L’application
utilise donc un **client HTTP natif** pour les appels d’API :

| Règle | Détail |
|---|---|
| Périmètre | Uniquement les chemins `/api/`, en HTTPS, vers une origine fixe |
| Origine | Validée (schéma, pas d’identifiants, pas de chemin exotique) sinon erreur |
| Cookies | Conservés par le **pot de cookies natif** : la session `HttpOnly` survit sans être exposée au JavaScript |
| En-têtes | `set-cookie` est retiré de la réponse rendue au web (le navigateur ne doit pas voir la session) |
| Délais | Connexion 8 s, lecture 20 s |
| Corps | Chaîne uniquement ; un corps non textuel est refusé explicitement |
| Annulation | Un signal d’abandon interrompt la requête attendue |
| Repli navigateur | Le reste de l’application continue d’utiliser `fetch` |

**Leçon coûteuse** : certains aperçus embarqués et SDK instrumentent `window.fetch`.
Quand ce wrapper échoue dans son propre code (par exemple une propriété lue sur
`undefined`), toutes les requêtes de l’application tombent alors que le `fetch`
natif fonctionne encore. La parade : garder l’implémentation native sous la main
et rejouer **une seule fois** en natif lorsque l’échec vient du wrapper — jamais
lorsqu’il s’agit d’une vraie panne réseau.

---

## 4. Les cinq plugins maison

| Plugin | Rôle | Points sensibles |
|---|---|---|
| **Coque** | Couleur de fond des barres système, ouverture des réglages de notifications, état d’exécution en arrière-plan, demande d’exemption de batterie, demande d’alarme exacte, apparence claire/sombre des icônes de barre | La couleur est validée avant application ; l’absence de service système ne casse rien |
| **Notifications** | État des permissions, jeton de l’appareil, liaison au compte, activation/désactivation, synchronisation du compteur de non-lus, écoute d’un message reçu | Le jeton est lié au compte **et** à l’installation ; une rotation invalide la liaison |
| **Google** | Connexion Google native par le gestionnaire d’identifiants du système | Renvoie un jeton d’identité au serveur ; aucun jeton n’est conservé côté appareil |
| **Impression** | Impression du document par le cadre d’impression du système | Détail complet dans `peint.md` |
| **Mises à jour** | Vérification et téléchargement d’une mise à jour par le magasin | Téléchargement souple, jamais bloquant |

---

## 5. Les services système

| Service | Déclencheur | Rôle |
|---|---|---|
| **Messagerie** | Message reçu du service de messagerie | Affiche la notification de la boîte, prévient l’interface |
| **Reprogrammation du jeton** | Rotation du jeton, ou filet de sécurité quotidien | Réinscrit l’appareil **sans ouvrir l’application** |
| **Centre de notifications** | Démarrage | Crée les canaux une seule fois, supprime les anciens |

### 5.1 Les canaux

| Canal | Usage | Importance |
|---|---|---|
| Messages | Réponses de la direction | Par défaut |
| Rappels | Séances et retards | Par défaut |
| Tests | Vérification manuelle par l’enseignant | Par défaut |

Trois règles :

1. **Un seul point de création.** Android conserve les réglages choisis par
   l’utilisateur pour un canal existant : renommer un canal après réglage serait
   la seule façon de les perdre.
2. **Marqueur de version.** Les canaux ne sont réécrits que si la version du
   marqueur change.
3. **Titres localisés.** Les noms suivent la langue de l’application enregistrée
   avec l’état de la boîte.

### 5.2 La reprogrammation du jeton

- Un jeton tourné invalide la liaison serveur : sans réinscription, les messages
  de la direction seraient perdus jusqu’au prochain lancement.
- Le planificateur du système (et non une bibliothèque de travaux) porte l’appel
  jusqu’au retour du réseau, **y compris après redémarrage**.
- La requête réutilise la session déjà conservée par la coque, comme les appels
  internes.
- Un filet quotidien n’agit que s’il n’existe **aucune** liaison confirmée ; une
  fois la liaison établie, il ne coûte plus rien.
- Un appareil sans planificateur ne casse pas l’application.

---

## 6. Manifeste et permissions

| Permission | Pourquoi elle est là | Ce qu’elle n’autorise pas |
|---|---|---|
| `INTERNET` | Compte, synchronisation, messages, mises à jour | — |
| `ACCESS_NETWORK_STATE` | Savoir si l’appareil est en ligne | Pas d’accès au contenu du réseau |
| `POST_NOTIFICATIONS` | Notifications (Android 13 et plus) | Rien sans accord explicite |
| `SCHEDULE_EXACT_ALARM` | Rappels à l’heure exacte, **opt-in** | Refusée ⇒ repli sur une alarme tolérante à la veille |
| `RECEIVE_BOOT_COMPLETED` | Reprogrammer les rappels après redémarrage | — |
| `WAKE_LOCK` | Terminer un rappel planifié | Pas d’écran allumé |
| `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` | Proposer l’exemption pour la fiabilité des rappels | Demande explicite à l’utilisateur |

Trois absences volontaires :

1. **`USE_EXACT_ALARM` n’est jamais déclarée** : réservée par le magasin aux
   applications de réveil et d’agenda. L’application demande l’autorisation
   exacte et accepte le refus.
2. **Aucune permission de stockage** : les fichiers exportés passent par un
   fournisseur de fichiers interne.
3. **Aucune permission de localisation, de contacts ni de caméra.**

### 6.1 Configuration de l’application

| Attribut | Valeur | Raison |
|---|---|---|
| Sauvegarde automatique | Désactivée, et règles d’extraction vidées | Les données appartiennent au compte : elles passent par le cloud authentifié, jamais par une sauvegarde système non chiffrée |
| Trafic en clair | Refusé | Tout passe en HTTPS |
| Support RTL | Déclaré | Interface arabe native |
| Thème | Thème applicatif avec variante nuit | Aucun éclair blanc à l’ouverture |
| Fournisseur de fichiers | Déclaré, non exporté | Partage et ouverture de fichiers locaux |
| Lien profond | Schéma `cahier://` | Ouvrir l’application sur une destination précise |
| Messagerie | Initialisation automatique **désactivée** | L’application décide quand s’enregistrer |
| Analytique | Collecte désactivée | Aucune donnée d’usage envoyée |

---

## 7. Ressources et thème

| Ressource | Contenu | Règle |
|---|---|---|
| Thème clair | Couleurs primaires terre cuite, écran de lancement papier | Aligné sur la charte de l’interface |
| Thème nuit | Écran de lancement sombre | Sinon : papier clair puis bascule = éclair blanc |
| Couleur de fond d’icône | Papier | Uniformise l’icône adaptative |
| Icône | Adaptative, ronde, et **monochrome** | Le monochrome permet le thème dynamique d’Android |
| Petite icône de notification | Silhouette de cahier, monochrome | Une icône colorée apparaîtrait comme un carré blanc |
| Chaînes | Nom de l’application, en français et en arabe | Le nom visible doit être exact dans les deux langues |
| Fournisseur de fichiers | Deux chemins (externe et cache) | Aucun accès au reste du stockage |

---

## 8. Comportements de plateforme

| Sujet | Comportement |
|---|---|
| **Bouton retour** | Un **circuit unique** : clavier ouvert ⇒ fermer le clavier ; une superposition ouverte ⇒ la fermer (événement `Échap`) ; sinon, événement applicatif qui peut être intercepté (navigation interne) ; en dernier recours, réduire l’application |
| **Réseau** | Les événements natifs ne mettent pas à jour l’état « en ligne » du navigateur : l’état est suivi par les événements du système et une lecture fraîche au lancement et au retour. Aucune scrutation périodique ; un événement plus récent gagne sur une réponse asynchrone plus ancienne |
| **Clavier** | La hauteur réellement visible est publiée, l’état « clavier ouvert » aussi : les barres et les feuilles s’y adaptent sans saut de mise en page |
| **Barres système** | La couleur de fond et la teinte des icônes suivent le thème choisi, y compris après changement de thème |
| **Notification pressée** | Ouvre `cahier://notifications`, réutilise la fenêtre existante, ne crée jamais un second document, et ne vise **jamais** la console d’administration |
| **Rappels** | Planifiés localement : le cloud ne décide pas du calendrier des rappels |

---

## 9. Mises à jour

| Étape | Comportement |
|---|---|
| Vérification | Disponibilité, version proposée, priorité |
| Téléchargement | Mode **souple** : l’enseignant continue de travailler pendant le téléchargement |
| Fin | Le redémarrage nécessaire est proposé, jamais imposé |
| Repli magasin | Si la mise à jour intégrée n’est pas permise, une action ouvre la fiche du magasin |
| Échec | Aucun blocage : l’application continue avec la version installée |
| Traçabilité | Version installée, version disponible et progression sont exposées à l’interface |

---

## 10. Sécurité native

| Règle | Application |
|---|---|
| Aucun contenu mixte | Mélange HTTP/HTTPS refusé |
| Aucun trafic en clair | Trafic non chiffré refusé |
| Débogage web | Désactivé en production |
| Session | Cookie conservé par le pot natif, jamais lisible par le JavaScript |
| Sauvegarde | Exclue (cloud et transfert d’appareil) |
| Analytique | Aucune |
| Secrets | Aucun secret dans l’APK ; les clés de signature restent hors du dépôt |
| Administration | La console d’administration **n’est pas** embarquée dans l’APK |

---

## 11. La chaîne de build

| Commande | Effet |
|---|---|
| Compilation web Android | Compile l’interface pour la coque |
| Synchronisation | Compile puis copie l’interface et les plugins dans le projet natif |
| APK de test | Assemble la variante de débogage |
| Release | Produit un paquet de publication **et** un APK, exécute les vérifications, puis copie les artefacts |
| Signature | Prépare, sauvegarde ou restaure les clés (hors dépôt) |
| Version | Incrémente le code de version de façon contrôlée |
| Métadonnées de publication | Prépare les textes de fiche magasin |
| Test de fumée | Vérifie le lancement et les parcours critiques sur un appareil |

Contrôles automatiques du build de release :

1. Signature **obligatoire** : sans les variables, la tâche échoue.
2. Vérification de la signature de l’APK et du paquet.
3. Empreinte du certificat exportée (traçabilité de publication).
4. Contrôle des **ressources hors ligne** : calendriers, données officielles,
   polices et icônes réellement présentes dans l’archive.
5. Contrôle d’absence de l’administration dans l’APK.
6. Fichier de correspondance R8 conservé (déchiffrer une trace de plantage).
7. Un descriptif de release (version, code, SDK cible, empreintes, tailles)
   accompagne les artefacts.
8. Un arbre de travail non propre est signalé dans ce descriptif : on ne publie
   pas « en silence » du code non commité.

---

## 12. Ce qu’il ne faut pas faire

| Erreur | Pourquoi |
|---|---|
| Ajouter une bibliothèque de travaux lourde pour un seul petit travail | Dépendance, runtime et base supplémentaires pour rien : le planificateur du système suffit |
| Déclarer `USE_EXACT_ALARM` | Réservée par le magasin à d’autres catégories ; risque de rejet |
| Réécrire les noms de canaux à chaque version | Efface les réglages de l’utilisateur |
| Retirer `set-cookie` de la réponse native **sans** pot de cookies | La session serait perdue |
| Activer la sauvegarde système | Données pédagogiques hors du circuit cloud authentifié |
| Activer l’analytique « par défaut » | Le manifeste le refuse explicitement |
| Laisser la mise à jour « immédiate » par défaut | Elle interrompt une saisie en cours |
| Changer l’identifiant d’application | C’est une nouvelle application : les données de l’ancienne ne suivent pas |
| Publier avec un arbre de travail non commité et une version non incrémentée | Impossible de savoir ce qui est en ligne |

---

## 13. Branchements

| Circuit | Dépend de | Déclenche |
|---|---|---|
| Démarrage | Splash, plugins, canaux, reprogrammation | Interface prête, rappels fiables |
| Session | Pont HTTP natif, pot de cookies | Synchronisation et messages authentifiés |
| Notification | Messagerie, canaux, lien profond | Ouverture de la boîte, jamais de l’administration |
| Jeton tourné | Planificateur | Réinscription silencieuse |
| Retour système | Clavier, superpositions, navigation | Fermeture, retour ou réduction |
| Impression | Plugin d’impression | Issue réelle (voir `peint.md`) |
| Mise à jour | Magasin | Téléchargement souple puis redémarrage |
| Thème | Interface | Couleur des barres système et icônes |

---

## 14. Invariants

1. **Une seule activité**, une seule instance, aucun second document.
2. **Les cookies de session vivent dans le pot natif**, jamais dans le JavaScript.
3. **Une permission n’est demandée que si elle sert**, et un refus n’empêche
   jamais de travailler.
4. **Les canaux de notification ne sont jamais renommés** après création.
5. **Le bouton retour suit un circuit unique** et ferme d’abord ce qui est
   ouvert.
6. **Aucune sauvegarde système** ne transporte les données du compte.
7. **La release est signée ou n’existe pas.**
8. **Les ressources hors ligne sont vérifiées** dans l’archive publiée.
9. **L’administration n’est pas embarquée.**
10. **Un wrapper réseau tiers ne peut pas couper l’application** : le `fetch`
    natif reste le filet de sécurité.
