# Les bulletins officiels, les JSON de leçons et les vice-versa intelligents

Ce document décrit **les données officielles de l’application** : les bulletins
d’échéances du ministère, les progressions annuelles, les contenus de leçons
préparés, comment ils sont validés et chargés, ce que les moteurs en déduisent,
et comment ces sources se répondent dans les deux sens.

Il décrit des circuits et des règles, sans citer de fichier. Pour les formes
générales, voir `json.md` ; pour le papier, voir `peint.md` ; pour les
alertes d’interface et les notifications, voir `notification.md` et `bot.md`.

Vocabulaire employé :

| Terme | Sens exact dans ce document |
|---|---|
| **Bulletin** | Le fichier d’échéances élèves d’une matière et d’une année |
| **Progression** | Le plan annuel d’un niveau : chapitres, heures, jalons |
| **Contenu de leçon** | Le programme prêt à charger dans un cahier vide |
| **Registre** | La fiche de provenance d’un document (numéro, date, statut, pages) |
| **Transcription** | Une saisie humaine d’un document : elle n’est pas une certification |
| **Empreinte** | L’empreinte SHA-256 d’un document, qui atteste de l’exemplaire utilisé |
| **Jalon** | Une évaluation prévue par le plan officiel (devoir surveillé, maison) |
| **Repli** | La version embarquée, utilisée si la version publiée est indisponible |

---

## 1. Trois familles de données officielles

| Famille | Contenu | Autorité | Livrée dans l’application |
|---|---|---|---|
| **Bulletin d’échéances** | Périodes de contrôles, examens, résultats, fin des cours | Ministère | Oui, en version agrégée, plus la version publiée par la direction |
| **Progression annuelle** | Chapitres, semestres, heures allouées, jalons, fenêtres de devoirs | Ministère ou enseignant (les deux sont distingués) | Oui |
| **Contenus de leçons** | Programme détaillé prêt à charger (activités, règles, exemples, applications) | Éditorial, validé par l’enseignant qui l’adopte | Oui, à la demande |

Trois principes communs :

1. **Une donnée transcrite reste distinguée d’une donnée certifiée.** Le registre
   porte le statut, la méthode de vérification et les pages utilisées.
2. **Aucune donnée officielle n’est inventée.** Les dates de vacances, de
   rentrée et d’examens viennent d’un fichier, jamais d’un calcul approximatif.
3. **Une source absente n’autorise aucune conclusion.** Sans bulletin pour
   l’année suivie, l’application ne prétend pas connaître la fin des cours.

---

## 2. Le registre des sources

Chaque document utilisé est décrit par une fiche :

| Champ | Rôle |
|---|---|
| Identifiant | Référence stable du registre |
| Numéro et date du document | Référence administrative réelle |
| Titre et autorité | Ce que le document est, et qui l’émet |
| Statut | `référence en attente d’archive`, `transcrit partiellement`, `archive vérifiée` |
| Vérification | `référence secondaire`, `pages contrôlées`, `empreinte vérifiée` |
| Pages utilisées | Les pages réellement lues : une transcription ciblée, pas un document entier |
| Note | Ce qui a été retenu, et ce qui reste à faire |

Exemple de note conservée telle quelle : « les dates transcrites doivent rester
distinguées des projections ; archiver le PDF officiel et son empreinte avant de
passer à *archive vérifiée* ».

**Pourquoi ce luxe de détails ?** Parce qu’un professeur peut être amené à
justifier une date devant sa direction. Une date sans provenance est une date
qu’on ne peut pas défendre.

---

## 3. La forme d’un bulletin

| Niveau | Champ | Contenu |
|---|---|---|
| Racine | `version` | Version du format |
| Racine | `schoolYear` | Année scolaire, forme `2026-2027` |
| Racine | `source` | Titre, date, langue, note de transcription et référence réglementaire de la matière |
| Racine | `events` | Les échéances, triées par date à la lecture |

Chaque échéance porte :

| Champ | Signification |
|---|---|
| `id` | Identité stable de l’échéance |
| `category` | `school` · `assessment` · `exam` · `result` · `support` · `competition` |
| `title` | Libellé lisible |
| `start` / `end` | Bornes ISO ; `end` absent = jour unique |
| `levels` | Niveaux concernés (`college`, `3ac`, `lycee`, `tc`, `1bac`, `2bac`…) |
| `dateKind` | `fixed` (jour certain) · `window` (période) · `indicative` (ordre de grandeur) |
| `studentAction` | **Ce que l’élève doit faire** pendant cette période |
| `sourcePage` | Page du document d’origine |
| `matiere` | Matière concernée ; absente = toutes les matières |

Le champ `studentAction` n’est pas décoratif : c’est lui qui transforme une date
administrative en information utile. « Passer les derniers contrôles continus du
premier semestre dans la période officielle » se comprend ; « 04/01 – 09/01 » ne
se comprend pas seul.

---

## 4. La validation à la frontière

Aucun bulletin n’entre dans l’application sans passer un validateur unique, que
la source soit le fichier embarqué, la version publiée par la direction ou une
importation :

| Contrôle | Règle |
|---|---|
| Forme | Un objet, jamais un tableau |
| Année scolaire | Format `AAAA-AAAA` obligatoire |
| Source | Objet obligatoire, date ISO obligatoire, titres et notes bornés |
| Événements | Au moins un, **500 au plus** |
| Identifiants | Uniques, non vides, bornés |
| Catégories | Uniquement les six valeurs connues |
| Niveaux | Uniquement les étiquettes connues |
| Nature de date | `fixed`, `window` ou `indicative` seulement |
| Bornes | `end` jamais antérieur à `start` |
| Textes | Longueur maximale par champ, jamais de valeur vide |

**Règle de repli** : un bulletin invalide est **rejeté en bloc**. Jamais de mise
à jour partielle, jamais de fusion avec l’ancien : on préfère une version
antérieure saine à un mélange incohérent.

---

## 5. Le chargement, en trois temps

| Temps | Ce qui se passe |
|---|---|
| **Embarqué** | Une version agrégée est livrée avec l’application : elle fonctionne hors ligne, dès la première ouverture |
| **Publié** | L’administration peut publier une version plus récente ; l’application la demande sans cache et la valide |
| **Repli** | Si le réseau manque ou si la version publiée est invalide, **le dernier bulletin sain reste actif** |

Trois règles de tenue :

1. **Une seule copie en mémoire** sert tous les lecteurs : la carte, l’éditeur,
   les alertes, la fiche de la direction.
2. **Aucune écriture dans le cahier** : un bulletin mis à jour change un avis,
   jamais une donnée pédagogique saisie.
3. **Année différente, silence** : si le bulletin ne couvre pas l’année suivie
   par la classe, il ne dit rien — il ne projette pas l’année précédente.

---

## 6. Le rapprochement classe → échéances

Une classe est rapprochée du bulletin par des **étiquettes de niveau** déduites
de son identité, jamais de son seul intitulé libre :

| Étiquette | Origine |
|---|---|
| `1ac`, `2ac`, `3ac` | Niveau explicite de la classe |
| `tc` | Tronc commun (toutes séries) |
| `tc-scientific` | Tronc commun scientifique |
| `1bac`, `2bac` | Niveau explicite |
| `college`, `lycee` | Cycle déclaré, ou déduction cohérente |
| `all-secondary` | Toutes les classes du secondaire, sauf prépa |

Deux règles de justesse :

- **Le niveau explicite gagne** sur le cycle : une classe de 3AC reste au
  collège même si son nom contient un mot ambigu.
- **La prépa n’hérite pas** des échéances du secondaire : elle suit ses propres
  calendriers.

Puis un filtre final : si une échéance est marquée d’une matière, elle
n’apparaît **que** pour cette matière. Les échéances sont triées par date, puis
par titre.

---

## 7. Ce que les moteurs déduisent du bulletin

### 7.1 Le dernier jour de cours

| Règle | Détail |
|---|---|
| Source | Événement `school` de nature `fixed` |
| Discrimination | Un événement tombant **plus de 90 jours après la rentrée** ne peut être que la fin des cours, quel que soit son identifiant |
| Résultat | Une date, ou rien |
| Conséquence | Au-delà de cette date : **aucune séance attendue**, aucun retard, aucune séance manquée, aucune projection de programme |
| Absence de bulletin | Aucune conclusion : le moteur ne fabrique pas une fin d’année |

C’est la règle la plus utile de tout le dispositif : elle empêche l’application
de reprocher à un professeur un « retard » en juillet.

### 7.2 Les examens d’un jour donné

| Règle | Détail |
|---|---|
| Catégorie | `exam` uniquement |
| Nature | `fixed` uniquement : une **fenêtre indicative n’interdit aucun jour précis** |
| Résultat | Les épreuves qui tombent réellement ce jour-là |

Une fenêtre de contrôles continus n’empêche pas de faire cours ; un examen local
fixe, oui. La distinction `fixed` / `window` / `indicative` porte exactement
cette nuance.

### 7.3 Les périodes

Les périodes `assessment` et `result` servent à **informer** (bandeau, conseil
du compagnon) et à **situer** un devoir dans la bonne semaine. Elles ne bloquent
jamais une saisie.

---

## 8. Les bulletins par matière

| Cycle | Fichiers | Particularité |
|---|---|---|
| Collège | 13 matières | Bulletins courts : échéances communes et épreuves locales |
| Lycée | 18 matières | Bulletins plus détaillés : filières, épreuves régionales et nationales |

Ces fichiers sont les **sources de rédaction** : ils sont relus, agrégés et
validés pour produire la version livrée. Ils ne sont **pas** embarqués tels quels
dans l’application — un seul fichier agrégé est livré, ce qui évite 31 requêtes
et une cohérence à garantir entre plusieurs copies.

Chaque bulletin déclare sa référence réglementaire de matière (par exemple une
note sur le contrôle continu en mathématiques), distincte de la décision
d’organisation de l’année scolaire. Cette séparation évite l’erreur classique :
attribuer à une matière une règle qui ne concerne que l’année.

---

## 9. La progression annuelle

### 9.1 Le catalogue

| Niveau | Contenu |
|---|---|
| Documents | Chaque document source : identifiant, fichier, **empreinte SHA-256**, niveau, cycle, matière, auteur, nature (`plan d’enseignant` ou `ministériel`), statut de relecture |
| Plans | Les progressions exploitables : identifiant, cycle, niveau, matière, document source, autorité, année, chapitres, évaluation diagnostique, fenêtres de devoirs, préférence d’appariement |

### 9.2 Le chapitre

| Champ | Rôle |
|---|---|
| Identifiant et ordre | L’ordre doit être **strictement** 1, 2, 3… sans trou |
| Semestre | 1 ou 2 |
| Titre (et titre arabe) | Libellé lisible dans les deux langues |
| Heures allouées | Un nombre positif, ou **explicitement inconnu** — jamais zéro par défaut |
| Alias | Variantes de titre acceptées pour l’appariement |
| Jalon d’évaluation | Type, numéro, libellé et moment attendu |

### 9.3 La validation

Le catalogue est refusé **en bloc** si un plan est incomplet, si deux plans
partagent un identifiant, si un chapitre est désordonné, si une heure est
négative ou nulle, si un document source est absent, ou si une fenêtre de
devoirs est incohérente (fin avant début).

### 9.4 L’appariement d’une classe à un plan

| Règle | Détail |
|---|---|
| Identité structurée d’abord | Le niveau et la filière déclarés priment ; on ne devine **jamais** une filière depuis « tronc commun » |
| Préférence éditoriale | Un plan peut être marqué comme préféré pour l’appariement |
| Année | Un plan d’une autre année n’est pas utilisé comme s’il était courant |
| Repli | Sans plan, l’application fonctionne : la progression officielle est un bonus, jamais une condition |

### 9.5 Ce que le moteur en tire

| Grandeur | Usage |
|---|---|
| Heures allouées | Estimation du temps passé par chapitre, écart avec le temps attendu |
| Jalons | Dates de devoirs proposées, cohérence avec la feuille d’évaluations |
| Diagnostic | Le premier contenu attendu d’un cahier neuf |
| Titres | Appariement avec les chapitres réellement saisis |

Détail des formules : `json.md` §6.4.

---

## 10. Les contenus de leçons

### 10.1 Le manifeste

| Champ | Rôle |
|---|---|
| `version` | Version du manifeste |
| `contenus[]` | Entrées : niveau, matière, titre, **nom de fichier** |

Le manifeste ne stocke **que le nom du fichier** : le dossier est déduit de la
matière (slug). Cela évite qu’un renommage de dossier casse toutes les entrées.

### 10.2 La résolution matière et niveau

| Étape | Règle |
|---|---|
| Normalisation | Casse, accents latins, diacritiques arabes, formes de alif, ya et ta marbouta, ponctuation |
| Alias | Dictionnaire d’alias par matière : français, arabe et sigles (« maths », « رياضيات », « svt », « علوم الحياة والأرض »…) |
| Niveau | Correspondance entre formes arabes et formes canoniques du manifeste |
| Appariement | Égalité, puis préfixe, puis inclusion, dans les deux sens — jamais une correspondance approximative sur une seule lettre |

Une classe dont la matière est écrite en arabe trouve donc le même contenu
qu’une classe dont la matière est écrite en français.

### 10.3 Le chargement

| Règle | Détail |
|---|---|
| Chemin | `/contenus/<matière>/<fichier>` |
| Cache | Requête sans cache : un contenu corrigé doit être visible |
| Échec | Message explicite (« contenu introuvable »), cahier intact |
| Normalisation | **Le même pipeline que l’import manuel** |

Ce dernier point est structurant : un contenu préétabli n’est pas un cas
particulier. Il passe par les mêmes normalisations, les mêmes budgets et le même
rapport. Si un contenu préparé dépasse une borne, il est refusé comme le serait
un fichier importé par le professeur.

### 10.4 La forme d’un contenu de leçon

| Élément | Rôle |
|---|---|
| Bloc de premier niveau | Un chapitre, avec son titre |
| Sections | Les sous-parties du chapitre |
| Items | Les contenus typés : activité, règle, exemple, application… |
| Descriptions | Le texte, avec les mathématiques en notation TeX entre `$…$` |

Deux migrations sont assumées à la lecture : `chapter` devient `title` quand le
titre manque, et un type absent devient un chapitre. Ces tolérances
n’introduisent jamais de contenu inventé.

---

## 11. Les vice-versa intelligents

C’est ici que se joue la cohérence : chaque source **répond** à l’autre, dans les
deux sens. Ces couples sont vérifiés par des règles, pas par convention.

| Paire | Sens 1 | Sens 2 | Garde-fou |
|---|---|---|---|
| **Bulletin ↔ calendrier** | Le bulletin fixe la fin des cours et les examens | Le calendrier fournit les vacances, la rentrée, les jours non travaillés | Un jour férié du calendrier n’est jamais considéré comme un jour d’examen |
| **Bulletin ↔ progression** | Le bulletin borne les périodes de contrôles | La progression place les jalons dans ces périodes | Une fenêtre `window` n’interdit pas de faire cours |
| **Progression ↔ cahier** | Le plan fournit les chapitres et les heures | Le cahier fournit les titres réellement saisis | L’association est invalidée si le titre ou l’index change |
| **Progression ↔ évaluations** | Les jalons proposent des devoirs | La feuille d’évaluations porte les dates réelles | Un devoir posé par le professeur prime sur la proposition |
| **Contenu de leçon ↔ classe** | Le manifeste choisit le bon programme | La classe fournit matière, niveau et cycle | Aucun contenu chargé sans correspondance de niveau **et** de matière |
| **Contenu de leçon ↔ cahier** | Le programme remplit un cahier vide | Le cahier devient la copie vivante du professeur | Le contenu chargé reste modifiable et n’est plus « officiel » ensuite |
| **Cahier ↔ évaluations** | Une évaluation saisie dans le cahier crée un devoir | Un devoir de la feuille apparaît dans la remarque de séance | Les deux temps (donné, corrigé) ne se confondent jamais |
| **Cahier ↔ impression** | Le cahier fournit les séances | L’impression mémorise les signatures | Une correction rend la séance de nouveau imprimable |
| **Bulletin ↔ retard** | La fin des cours arrête l’attente | Le retard se calcule sur les séances réelles | Sans bulletin, aucune conclusion hâtive |
| **Progression ↔ direction** | Le professeur avance sur un plan | La direction compare l’avancement aux heures officielles | Un taux n’est jamais calculé sur un plan incomplet |
| **Contenus ↔ import** | Le contenu préétabli est normalisé | L’import manuel suit le même chemin | Un seul rapport, une seule vérité |
| **Registre ↔ tout affichage** | Chaque date porte sa provenance | L’interface peut expliquer d’où elle vient | Une donnée sans provenance n’est pas présentée comme officielle |

### 11.1 Les sens interdits

| Interdiction | Pourquoi |
|---|---|
| Déduire une filière depuis « tronc commun » | Le même intitulé couvre plusieurs séries |
| Projeter l’année précédente sur l’année suivante | Une date fausse est pire qu’aucune date |
| Transformer une fenêtre indicative en interdiction | Bloquerait des semaines entières |
| Faire d’un contenu chargé une donnée « officielle » | L’enseignant en devient l’auteur responsable |
| Utiliser une correspondance matière approximative | Chargerait un programme de biologie dans un cours de physique |
| Compléter un plan incomplet par des zéros | Fausserait tous les taux |

---

## 12. Alertes et information de l’utilisateur

Les données officielles produisent des **avis**, jamais des blocages silencieux.

### 12.1 Les niveaux d’avis

| Niveau | Effet | Exemple |
|---|---|---|
| **Information** | Affiché, ne demande rien | « Période de contrôles continus du 4 au 9 janvier » |
| **Conseil** | Proposé, refusable | « Devoir maison proposé le 12 mars » |
| **Avertissement** | Affiché au moment de la saisie, demande une confirmation | « Ce jour est un jour férié » |
| **Blocage** | Empêche la validation, avec une raison compréhensible | Date impossible (`31/02`), ou conflit structurel |

### 12.2 Où l’utilisateur est informé

| Lieu | Ce qui apparaît |
|---|---|
| Ligne du cahier | Teinte et filet sur le groupe concerné |
| Cellule de date | Repère d’alerte, sans texte tronqué |
| Fenêtre de date | Avis **en direct**, recalculés à chaque changement |
| Revue avant écriture | Liste des avis, avec la possibilité de revenir modifier |
| Compagnon | Un seul sujet, formulé sans reproche |
| Bandeau de calendrier | Vacances, rentrée, fin de période |
| Fiche de direction | Avancement comparé aux heures officielles |

### 12.3 Les règles de ton

1. **Jamais de reproche** : un retard est un rappel, pas une faute.
2. **Toujours une action** : chaque avis indique quoi faire.
3. **Une seule chose à la fois** : un avis de calendrier remplace une offre, il
   ne s’y ajoute pas.
4. **Rien d’invisible** : une alerte qui empêche une action est toujours
   expliquée à l’endroit de l’action.
5. **Rien d’inventé** : un avis sans source n’est pas émis.

---

## 13. Branchements

| Circuit | Dépend de | Déclenche |
|---|---|---|
| Registre | Documents archivés | Statut de confiance d’une date |
| Bulletin | Registre, année scolaire, matière | Fin des cours, examens, périodes |
| Chargement publié | Direction, réseau, validateur | Mise à jour, ou repli sur l’embarqué |
| Progression | Documents relus, empreintes | Chapitres, heures, jalons |
| Contenus | Manifeste, classe | Programme proposé dans un cahier vide |
| Appariement | Classe, plan | Progression calculée, diagnostic initial |
| Alertes | Bulletin, calendrier, cahier, évaluations | Avis, revue, décision du compagnon |
| Direction | Progression, heures, bulletins | Comparaison et information du professeur |

---

## 14. Invariants

1. **Une donnée transcrite n’est pas une donnée certifiée** : le statut est
   toujours porté avec la donnée.
2. **Une source sans provenance n’est jamais présentée comme officielle.**
3. **Un bulletin invalide est rejeté en bloc**, sans mise à jour partielle.
4. **Le dernier bulletin sain reste actif** en cas d’échec de chargement.
5. **Une année différente peut ne rien dire** : le silence est préférable à une
   projection.
6. **Une fenêtre indicative n’interdit aucun jour précis.**
7. **Le dernier jour de cours arrête toute attente de séances.**
8. **Une classe est rapprochée par son identité structurée**, jamais par un mot
   ambigu de son nom.
9. **Aucun contenu de leçon n’est chargé sans correspondance de niveau et de
   matière.**
10. **Un contenu chargé passe le même pipeline qu’un import manuel.**
11. **Un plan incomplet ne produit aucun taux.**
12. **Une association de chapitre périmée est invalidée.**
13. **Une alerte qui bloque est toujours expliquée**, et toujours actionnable.
14. **Aucune donnée officielle n’est écrite dans le cahier sans décision du
    professeur.**
