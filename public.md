# Le dossier public — inventaire, rôles et règles de chargement

Ce document décrit **le contenu du dossier public** : chaque famille de fichiers,
son rôle exact, comment elle est chargée, ce qui est embarqué, ce qui est
précaché, ce qui est exclu du paquet Android, et les règles à respecter quand on
y ajoute un fichier.

Il décrit des fichiers et des circuits, sans citer de chemin de code. Pour la
forme des données pédagogiques, voir `json.md` et `bulletin.md` ; pour les
polices et les icônes, voir `style.md` ; pour Android, voir `android.md`.

Vocabulaire employé :

| Terme | Sens exact dans ce document |
|---|---|
| **Embarqué** | Copié dans l’application, disponible hors ligne dès la première ouverture |
| **Précaché** | Téléchargé à l’installation du service worker, disponible hors ligne ensuite |
| **À la demande** | Chargé seulement quand l’écran en a besoin |
| **Exclu du paquet** | Présent dans le dépôt, absent de l’application Android |
| **Source de rédaction** | Document de travail qui sert à produire une donnée livrée, mais qui n’est pas livré lui-même |

---

## 1. Le rôle du dossier

C’est **la bibliothèque statique de l’application** : données officielles,
programmes prêts à charger, polices, icônes, manifests, captures du guide et
service worker. Rien n’y est généré au démarrage ; tout y est relu, validé, puis
servi.

Trois natures cohabitent, et il faut les distinguer :

| Nature | Comportement |
|---|---|
| **Données de référence** | Validées au chargement, jamais modifiées par l’application |
| **Ressources de présentation** | Servies telles quelles (polices, icônes, images) |
| **Documents de travail** | Conservés dans le dépôt pour la traçabilité, pas livrés |

Poids total : environ **8,6 Mo**, dont près de la moitié de sources
documentaires qui ne partent jamais sur un téléphone.

---

## 2. L’inventaire

| Emplacement | Poids | Rôle | Livré au navigateur | Livré dans l’APK |
|---|---|---|---|---|
| **Racine** (JSON de données + manifests + service worker) | ≈ 1,2 Mo | Référentiels et coque hors ligne | Oui | Oui |
| **`contenus/`** | 1,26 Mo (95 fichiers) | Programmes prêts à charger, un dossier par matière | À la demande | Oui |
| **`bulletins_json_college_2026_2027/`** | 0,04 Mo (13 fichiers) | Sources de rédaction des échéances du collège | Non | **Non** |
| **`bulletins_json_lycee_2026_2027/`** | 0,16 Mo (18 fichiers) | Sources de rédaction des échéances du lycée | Non | **Non** |
| **`doc_officiel/`** | 2,41 Mo (14 fichiers) | Catalogue de progression + documents scannés d’origine | Catalogue oui | Catalogue oui, **images non** |
| **`fonts/`** | 1,37 Mo (12 fichiers) | Polices mathématiques, arabes et d’affichage | À la demande | Oui |
| **`guide/current/`** | 0,45 Mo (22 fichiers) | Captures d’écran du guide, en arabe et en français | À la demande | Oui |
| **`icons/`** | 0,31 Mo (9 fichiers) | Icônes d’application et pastille de notification | Précachées | Oui (sauf les très grandes) |
| **`licenses/`** | 0,03 Mo (2 fichiers) | Licences des polices | Oui | Oui |
| **`assets/`** | 1,41 Mo (21 fichiers) | Matériel de référence (mascotte, planches) | Oui | Oui |
| **`favicon.ico`, `rosette.svg`, polices arabes d’interface** | — | Présentation | Oui | Oui |

---

## 3. Les JSON de la racine, un par un

### 3.1 Le calendrier scolaire

| Champ | Contenu |
|---|---|
| `version` | Version du format |
| `pays` / `fuseau` | `MA` et le fuseau de référence (`Africa/Casablanca`) |
| `anneeScolaire` | Année courante : libellé, début, fin |
| `anneesScolaires` | Historique des années (facultatif) |
| `joursFeries` | 21 jours fériés datés |
| `vacances` | 14 périodes de vacances |

**Consommé par** : le tableau de bord, les alertes de séance, le retard
d’écriture, la progression, l’impression, les rappels planifiés.

**Trois règles** :

1. **Validé au chargement** : version, fuseau non vide, années cohérentes, dates
   ISO. Un calendrier invalide est refusé, pas corrigé.
2. **Remplaçable par la direction** : une version publiée peut être servie par
   l’API ; l’application l’utilise sans cache et retombe sur l’embarqué en cas
   d’échec.
3. **Précaché** : sans lui, aucun rappel ne peut être calculé hors ligne.

### 3.2 Le registre des sources

| Champ | Contenu |
|---|---|
| `version` | Version du registre |
| `sources[]` | Identifiant, numéro et date du document, titre, autorité, statut, méthode de vérification, pages utilisées, note |

**Consommé par** : la lecture des règles d’évaluation, qui refuse une règle dont
la source est inconnue.

**Règle** : une règle sans source référencée n’est pas appliquée. La provenance
n’est pas une décoration documentaire, c’est une condition d’exécution.

### 3.3 Le bulletin d’échéances agrégé

| Champ | Contenu |
|---|---|
| `version`, `schoolYear` | Version et année |
| `source` | Titre, date, langue, note de transcription |
| `events[]` | Échéances : catégorie, titre, début, fin, niveaux, nature de date, action de l’élève, page source, matière éventuelle |

**Consommé par** : les examens du jour, la fin des cours, les périodes affichées,
la projection de la direction.

**Précaché**, parce que la fin des cours conditionne le calcul de retard : sans
ce fichier, l’application reprocherait un « retard » après la fin de l’année.

Détail complet de la validation et des déductions : `bulletin.md`.

### 3.4 Les règles d’évaluation

| Champ | Contenu |
|---|---|
| `version`, `scope` | Le périmètre est explicitement `official_rules_only` |
| `rules[]` | Matière, cycle, niveaux, semestres, type d’évaluation, **nombre officiel**, durées officielles, règles de calendrier, source, pages, statut, confiance |

Les règles de calendrier sont de deux formes : **semaine scolaire** (semaine 5,
semaine 10) ou **fenêtre de fin de semestre**.

**Consommé par** : les propositions de devoirs et la vérification de cohérence
d’un devoir saisi.

**Trois règles de prudence** :

1. Le périmètre `official_rules_only` interdit d’inventer une règle « par
   habitude ».
2. Le statut et la confiance sont portés par chaque règle : une règle vérifiée
   n’est pas une règle supposée.
3. Les tableaux varient selon le niveau et la filière : une ligne ne doit
   **jamais** être généralisée à une filière absente de la source.

### 3.5 Les plans de devoirs

| Champ | Contenu |
|---|---|
| `version`, `schoolYear` | Version et année |
| `rulesFile`, `sourcesFile` | Renvois vers les règles et le registre |
| `plans[]` | 12 plans : matière, cycle, classe, branche, volume horaire, coefficient, **liste de niveaux et d’alias**, semestres, examens |

Chaque plan porte ses **devoirs par semestre** (type, numéro, semaine, durée,
fenêtre éventuelle), la clôture des notes et la remise des bulletins.

Trois règles structurantes :

1. **Les semaines sont relatives au semestre** : la semaine 5 du semestre 1 et
   la semaine 5 du semestre 2 ne tombent pas au même moment.
2. **Les dates produites sont indicatives** et modifiables par le professeur :
   une proposition n’est pas une obligation.
3. **Les alias de niveaux sont multiples** (formes courtes, formes longues,
   formes arabes) : une classe nommée « 1ère Année Collégiale » ou « الأولى
   إعدادي » trouve le même plan.

### 3.6 Le manifeste des contenus

| Champ | Contenu |
|---|---|
| `version` | Version 2 |
| `contenus[]` | 145 entrées : niveau, matière, titre, **nom de fichier** |

Le manifeste ne contient **aucun chemin** : le dossier est déduit de la matière.
Renommer un dossier ne casse donc pas les entrées, et une matière peut vivre
dans un dossier au nom différent de son libellé.

### 3.7 La partition de mouvement (référence de conception)

Un fichier décrit le **scénario d’animation** de la mascotte et des transitions :
tempo, nombre de battements, images par seconde, et les moments clés (entrée,
pointage, déploiement, validation, repli) avec leur critère visuel.

**Ce n’est pas une donnée d’exécution** : aucun écran ne le lit. C’est une
référence de chorégraphie pour l’équipe de design, conservée au même endroit que
les autres références.

---

## 4. Les polices

| Famille | Usage | Format |
|---|---|---|
| Sans mathématique (Computer Modern) | Composition des mathématiques du cahier | WOFF2, quatre graisses |
| Latin Modern Sans | Texte imprimé | OTF, trois styles |
| Arabe de texte | Corps arabe | TTF |
| Arabe d’affichage | Titres, ornements | TTF/OTF |
| Arabes d’interface | Interface arabe | TTF, à la racine |

**Règles** :

1. **Une police utilisée doit être livrée localement** : aucune dépendance à un
   service de polices distant, sinon la première impression hors ligne serait
   fausse.
2. **Les licences sont livrées** avec les polices, dans le même dossier public.
3. **Chargement explicite** : l’impression attend le chargement des graisses
   réellement utilisées avant de composer (voir `peint.md`).

---

## 5. Les icônes et les manifests

| Élément | Règle |
|---|---|
| Icône 192 / 512 | Indispensables à l’installation |
| Icône maskable | Adaptée aux masques du système |
| Icône Apple | 180 px, pour l’écran d’accueil iOS |
| **Pastille de notification** | 96 px, **monochrome sur fond transparent** : Android aplatit le canal alpha, un carré plein deviendrait un carré blanc |
| Favoris | 16 / 32 / ICO |
| Manifests | Deux : un par sens d’écriture, avec nom, couleurs et icônes |

Les manifests sont **précachés** : sans eux, l’installation hors ligne échoue.

---

## 6. Le service worker

Un fichier unique, à la racine, dont l’identifiant de version et la liste des
ressources sont **remplacés au build** par une empreinte de contenu.

| Règle | Détail |
|---|---|
| Liste précachée | Coque HTML, manifests, icônes, calendrier, bulletin, plus les ressources du build |
| Échec partiel | Une installation incomplète supprime le cache et échoue : jamais une coque à moitié téléchargée |
| Activation | Les anciennes coques sont supprimées, la précédente est conservée pour les onglets encore ouverts |
| Navigation | Réseau d’abord, coque en cache en secours |
| Requêtes `no-store` | Jamais interceptées : une donnée fraîche doit rester fraîche |
| Ressources statiques | Cache d’exécution borné aux fichiers de présentation |

**Pourquoi la précédente coque est-elle conservée ?** Parce qu’un onglet ouvert
sur l’ancienne version demande encore ses fichiers découpés, avec une empreinte
dans le nom. Les supprimer immédiatement casserait cet onglet.

---

## 7. Ce qui n’est pas livré dans l’application Android

| Élément exclu | Pourquoi |
|---|---|
| Les **31 bulletins par matière** | Sources de rédaction : seule la version agrégée est nécessaire |
| Les **images des documents officiels** | Sources scannées, plusieurs mégaoctets, jamais affichées à l’enseignant |
| Les démonstrations animées de présentation | Poids pour un usage vitrine |
| Les très grandes icônes de navigateur | Inutiles au système Android, qui a ses propres densités |

Le retrait est **explicite et documenté au build** : le message de compilation
indique la place économisée et rappelle que les données de cours et l’aide
restent, elles, embarquées.

---

## 8. Ce qui est livré à la demande

| Famille | Pourquoi ne pas tout précacher |
|---|---|
| Programmes (95 fichiers) | Un professeur n’ouvre qu’une matière et un niveau : précacher 1,26 Mo pour rien serait du gaspillage |
| Captures du guide | 22 images bilingues, utiles seulement si l’aide est consultée |
| Polices | Chargées par le navigateur selon les graisses réellement utilisées |

Une seule règle : **ce qui conditionne un calcul critique est embarqué et
précaché ; ce qui dépend d’un choix de l’utilisateur est chargé à la demande.**

---

## 9. Les règles de chargement

| Contexte | Politique |
|---|---|
| Donnée officielle qu’on veut fraîche (calendrier publié, catalogue) | Jamais de cache, ou cache court côté serveur |
| Donnée embarquée | Importée au build : aucun aller-retour réseau |
| Contenu choisi par l’utilisateur | Chargé sans cache, une fois, puis gardé en mémoire |
| Ressource de présentation | Cache d’exécution |
| Donnée critique de calcul | Précachée à l’installation |

Trois garde-fous :

1. **Une réponse invalide n’écrase jamais une version saine.**
2. **Un échec de chargement produit un message explicite**, jamais un écran vide
   silencieux.
3. **Une donnée absente n’autorise aucune conclusion** : pas de bulletin, pas de
   fin d’année inventée ; pas de calendrier, pas de rappel calculé.

---

## 10. Ajouter un fichier : la liste de contrôle

| # | Question | Si la réponse est non |
|---|---|---|
| 1 | Le fichier est-il nommé en minuscules, sans accent ni espace ? | Le renommer |
| 2 | S’il s’agit d’un programme, est-il déclaré dans le manifeste (niveau, matière, titre, fichier) ? | Sans manifeste, il est invisible |
| 3 | Le dossier correspond-il au slug de la matière ? | Le chargement échouera |
| 4 | Les données sont-elles validées par une règle de forme (version, dates, bornes) ? | Ajouter la validation avant de livrer |
| 5 | Le fichier conditionne-t-il un calcul critique ? | Si oui : embarqué **et** précaché |
| 6 | Est-il volumineux et facultatif ? | Si oui : à la demande |
| 7 | Est-ce un document source (scan, brouillon) ? | Le placer dans les sources de rédaction, pas dans les données livrées |
| 8 | Une licence s’applique-t-elle ? | La livrer à côté |
| 9 | Une empreinte est-elle attendue (document officiel) ? | La calculer et la consigner |
| 10 | Le fichier est-il réellement lu par un écran ou un moteur ? | Sinon, c’est une référence : le documenter comme telle |

---

## 11. Branchements

| Donnée publique | Consommateur | Effet |
|---|---|---|
| Calendrier | Tableau de bord, alertes, retard, progression, rappels, impression | Jours travaillés, vacances, année effective |
| Registre | Règles d’évaluation | Une règle sans source n’est pas appliquée |
| Bulletin agrégé | Examens, fin des cours, périodes | Attente de séances, avis, projections |
| Règles d’évaluation | Propositions et cohérence des devoirs | Nombre et durée officiels |
| Plans de devoirs | Dates indicatives par semaine de semestre | Propositions modifiables |
| Manifeste + programmes | Cahier vide d’une classe | Programme proposé, puis modifiable |
| Catalogue de progression | Progression, heures, jalons | Appariement des chapitres |
| Polices | Écran, impression | Composition fidèle hors ligne |
| Icônes et manifests | Installation, notifications, pastille | Apparence système correcte |
| Service worker | Tous les écrans | Ouverture hors ligne |

---

## 12. Invariants

1. **Une donnée critique de calcul est embarquée et précachée.**
2. **Une donnée facultative se charge à la demande.**
3. **Toute donnée officielle est validée avant usage**, et rejetée en bloc si
   elle est invalide.
4. **Une réponse invalide n’écrase jamais une version saine.**
5. **Aucune police, aucune icône ne vient d’un service distant.**
6. **Une règle sans source référencée n’est pas appliquée.**
7. **La pastille de notification reste monochrome.**
8. **Le manifeste ne contient pas de chemin**, seulement un nom de fichier.
9. **Un document source n’est pas livré comme donnée d’application.**
10. **Une installation de service worker partielle est annulée**, jamais
    conservée à moitié.
11. **Une donnée absente n’autorise aucune conclusion.**
12. **Un fichier sans lecteur est une référence** : il est documenté comme tel,
    et son poids est assumé.
