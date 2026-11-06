# L’impression — techniques, intelligences et règles

Ce document décrit **comment l’application transforme un cahier en papier** :
ce qui est composé, comment la page est construite, quelles décisions
intelligentes sont prises avant d’imprimer, quelles issues sont reconnues, et
quelles règles protègent le professeur d’une impression fausse ou en double.

Il décrit des circuits et des règles, sans citer de fichier. Pour les formes de
données, voir `json.md` ; pour la synchronisation et l’impression côté direction,
voir `cloude.md` ; pour le comportement du compagnon, voir `bot.md`.

Vocabulaire employé :

| Terme | Sens exact dans ce document |
|---|---|
| **Feuille** | La composition imprimable (mesurable) placée hors du flux visuel |
| **Séance** | Une date du cahier, avec tous les contenus qui la portent |
| **Signature** | Une empreinte du contenu d’une séance, utilisée pour savoir si elle est nouvelle |
| **Nouveauté** | Séance dont la signature diffère de la dernière impression confirmée |
| **Issue** | Le résultat rapporté par la plateforme : terminée, annulée, échouée, à confirmer |
| **Aperçu** | Le même document affiché à l’écran, jamais une seconde composition |

---

## 1. Deux familles de papier

| Famille | Format | Contenu | Usage |
|---|---|---|---|
| **Cahier de textes** | A4 | Le tableau du cahier : date, contenu, remarque, avec en-tête administratif | Impression régulière, dépôt au bureau, inspection |
| **Documents pédagogiques** | A5 | Une feuille autonome : titre, classe, corps du devoir ou de l’activité | Distribution aux élèves ou relecture de la direction |

Une seule règle gouverne les deux : **ce que l’on voit est ce qui sort**. L’aperçu
et le papier partagent la même composition — pas de rendu « écran » puis de rendu
« imprimante » qui divergeraient au premier changement.

---

## 2. Ce qui est composé

La feuille reprend le cahier **tel qu’il est lu**, avec le même moteur de lignes
et la même numérotation que l’écran :

- les chapitres, sections et sous-sections utiles au contexte ;
- les contenus avec leur numéro affiché (gelé au moment du tirage) ;
- la remarque de séance, **une seule fois par date**, y compris les activités
  pédagogiques (contrôle de cahiers, remédiation, oral) qui s’y rattachent ;
- les lignes d’absence justifiée, datées, avec leur motif ;
- les séparateurs du plan.

Ce qui n’est **jamais** imprimé : identifiants techniques, champs internes de
session, séparateurs vidés par un filtrage, contenus masqués à l’écran, brouillons.

### 2.1 L’en-tête administratif

| Ligne | Contenu |
|---|---|
| 1 | Royaume du Maroc · Ministère de l’Éducation nationale (ou l’équivalent arabe) |
| 2 | Académie |
| 3 | Province / direction |
| 4 | Titre : « Cahier de textes » / « دفتر النصوص » |
| 5 | Établissement |
| 6 | Enseignant |
| 7 | Classe |
| 8 | Matière |
| 9 | Année scolaire |
| 10 | Période imprimée (plage de dates réellement tirée) |

Trois modes, choisis dans la fenêtre d’impression et mémorisés :

| Mode | Effet |
|---|---|
| `first` | En-tête complet sur la première page seulement (défaut) |
| `all` | En-tête répété en tête de **chaque** page, dans la ligne d’en-tête du tableau |
| `none` | Aucun en-tête administratif |

Règle de langue : l’en-tête suit **la direction d’écriture du contenu imprimé**,
pas la langue de l’interface. Un cahier rédigé en arabe reçoit un en-tête arabe,
même si l’application est en français — et inversement. Les valeurs manquantes
s’écrivent « غير محدد / Non renseigné », jamais un blanc.

### 2.2 Les colonnes

| Colonne | Contenu |
|---|---|
| **Date** | Une ou plusieurs dates (une séance double peut en porter deux) |
| **Contenu** | Chapitre, section, contenus numérotés, descriptions |
| **Remarque** | Remarque de séance, activités rattachées, absents, motif d’absence |

Les absences occupent une ligne dédiée : les dates concernées, le libellé
« شهادة الغياب / certificat d’absence » et le motif. Le report des absents est
automatique, sans dupliquer une note déjà saisie par l’enseignant.

---

## 3. La géométrie de la page

| Élément | Règle |
|---|---|
| Format | A4, marge 10 mm en haut et sur les côtés, 12 mm en bas |
| Largeur de composition | Celle du papier, mesurable **avant** d’ouvrir la fenêtre système |
| Numéros de page | En pied de page centré, « Page n / total » (ou l’équivalent arabe), 8 pt, gris bleuté |
| Pagination | Les lignes de séance ne se coupent pas ; un chapitre ne s’ouvre pas orphelin en bas de page |
| Indentation | Trois niveaux (4 / 8 / 12 mm) pour lire la hiérarchie sans gras |
| Filets | Traits fins (0,55 à 0,8 pt) : la structure se voit à l’impression noir et blanc |
| Couleur | Désactivée par défaut ; activée, elle colore le contenu sans changer la structure |

### 3.1 Trois tailles de texte, trois aérations

| Palier | Corps | Cellule | Description | Chapitre |
|---|---|---|---|---|
| Petit | 9 pt | 8,5 pt | 8 pt | 11 pt |
| Moyen (défaut) | 10 pt | 9,5 pt | 9 pt | 12 pt |
| Grand | 11 pt | 10,5 pt | 10 pt | 13 pt |

| Aération | Interligne | Rembourrage de cellule | Écart entre items |
|---|---|---|---|
| Compacte | 1,25 | 1,5 pt · 4 pt | 1,5 pt |
| Normale (défaut) | 1,4 | 3 pt · 4 pt | 3 pt |
| Aérée | 1,6 | 5 pt · 5 pt | 5 pt |

Les valeurs sont **des points typographiques**, pas des pixels : la feuille est
mise à l’échelle du papier, le texte suit. Un palier choisi est mémorisé par
classe et reproposé à l’ouverture suivante.

---

## 4. Les intelligences d’impression

### 4.1 Choisir *quoi* imprimer

| Mode | Ce qu’il imprime | Quand il est proposé |
|---|---|---|
| **Nouveautés** | Les séances dont la signature a changé depuis la dernière impression confirmée | Par défaut dès qu’un historique existe et qu’il reste des nouveautés ; mode recommandé |
| **Document complet** | Tout le cahier | Par défaut quand il n’y a aucun historique |
| **Séances choisies** | Les dates cochées une par une | Toujours disponible |

Le mode « nouveautés » ne peut pas exister sans historique : sans lui, le moteur
ne prétend **jamais** savoir ce qui a déjà été tiré. Si les nouveautés tombent à
zéro, le mode bascule honnêtement sur « complet ».

### 4.2 La signature d’une séance

Une séance n’est pas « nouvelle » parce que sa date est récente : elle est
nouvelle parce que **son contenu a changé**. La signature agrège :

1. les champs texte du contenu (triés, sans champ technique) ;
2. le contexte de ses ancêtres (chapitre, section), pour qu’un déplacement
   compte comme un changement ;
3. les annotations de séance (activités rattachées) ;
4. les absences du jour.

Deux empreintes entrelacées sont calculées sur cette chaîne : une modification
locale du texte change la signature, une simple réouverture ne la change pas.

Conséquence pratique : corriger une faute dans une séance déjà imprimée la rend
**de nouveau imprimable** — c’est exactement le comportement attendu.

### 4.3 Le filtrage qui garde le contexte

Imprimer trois séances d’un chapitre ne doit pas produire trois lignes orphelines.

- Un parent n’est conservé que s’il contient au moins une séance retenue.
- Un parent conservé **perd sa propre date** : sinon une séance non choisie
  réapparaîtrait sur le papier.
- Les branches vides disparaissent entièrement.

### 4.4 Le gel de la numérotation

Le numéro affiché à l’écran est calculé sur le cahier **entier**. Filtrer puis
renuméroter produirait un papier différent de l’écran (« Définition 4 » devenant
« Définition 1 »). Le tirage commence donc par **figer** les numéros, puis filtre.
Le cahier lui-même n’est pas modifié.

### 4.5 La préparation de la feuille

Avant d’ouvrir la fenêtre système, six vérifications, avec un délai de garde de
12 secondes :

| # | Vérification | Pourquoi |
|---|---|---|
| 1 | La feuille est présente et mesurable (largeur > 0) | Une feuille détachée imprimerait du vide |
| 2 | Les polices sont chargées (latines et arabes, graisses et italique) | Éviter un texte substitué ou tronqué |
| 3 | Aucune formule en erreur (`katex-error`) | Une formule cassée ne doit jamais partir au papier |
| 4 | Aucune syntaxe mathématique non composée dans le texte | Le TeX brut ne doit jamais s’imprimer |
| 5 | Les images sont décodées | Pas de cadre vide |
| 6 | La feuille est toujours attachée à la page | Une déconnexion annule le tirage |

Puis deux ajustements facultatifs :

- **Formules trop larges** : une formule d’affichage plus large que la colonne est
  réduite (rapport en `em`, donc proportionnel au papier) ; le texte autour garde
  sa taille.
- **Séance plus haute qu’une page** : la ligne est marquée « à fragmenter » en
  comparant sa hauteur à la hauteur utile d’une page moins l’en-tête. Une séance
  ordinaire reste d’un seul bloc ; une séance exceptionnelle est coupée plutôt
  que perdue.

### 4.6 La photographie du document

Le document est **figé** au moment du tirage : une copie de la sélection, des
annotations et des absences retenues est composée, la fenêtre d’impression est
refermée, puis l’impression démarre. Une saisie faite pendant que la fenêtre
système est ouverte — ou pendant qu’une imprimante réseau termine le travail —
**ne modifie pas** la feuille en cours.

---

## 5. Le circuit d’impression

| # | Étape | Détail |
|---|---|---|
| 1 | Choix | Mode, dates, préférences de mise en page |
| 2 | Mémorisation | Les préférences sont enregistrées immédiatement, même si le tirage est annulé |
| 3 | Gel | Composition figée du document à imprimer |
| 4 | Préparation | Les six vérifications ci-dessus |
| 5 | Impression | Appel de la plateforme (natif Android, natif iOS, ou impression du navigateur) |
| 6 | Issue | `completed` · `cancelled` · `failed` · `confirmation-required` |
| 7 | Historique | Signature enregistrée **seulement** si le tirage est confirmé |

Traitement des issues :

| Issue | Effet |
|---|---|
| `completed` | Les signatures des séances tirées sont enregistrées ; elles ne seront plus proposées comme nouveautés |
| `cancelled` | Aucun enregistrement : la fenêtre a été fermée sans imprimer |
| `failed` | Message explicite (« impression indisponible »), document libéré, aucun enregistrement |
| `confirmation-required` | Le système ne peut pas prouver le résultat (imprimante réseau en file, navigateur muet) : une confirmation est **demandée au professeur**, puis l’historique est écrit s’il confirme |

Règle structurante : **ouvrir un aperçu n’est pas imprimer**. Les versions
antérieures comptaient un simple lancement ; cette erreur a été corrigée en
séparant nettement l’ouverture, l’issue réelle et l’enregistrement.

---

## 6. La technique selon la plateforme

### 6.1 Android (application installée)

| Élément | Choix |
|---|---|
| Mécanisme | Cadre d’impression du système, avec l’adaptateur de document créé **à partir de la vue web** |
| Formats | ISO A4 (cahier) et ISO A5 (documents) |
| Marges | Aucune marge imposée : la composition gère ses propres marges |
| Attente | Le document reste vivant jusqu’à l’état final, avec une échéance de 180 secondes |
| Surveillance | Interrogation de l’état du travail toutes les 750 ms |
| File d’attente | Un seul travail à la fois : un second appel est refusé (`PRINT_BUSY`) |
| Fin anticipée | Si l’adaptateur a terminé et que le travail n’a jamais quitté l’état « créé » après 1,5 s, l’issue est « annulée » — une fenêtre fermée n’est pas une impression |
| Jamais de succès déduit | Imprimante injoignable ou travail bloqué ⇒ « à confirmer », pas « imprimé » |
| Destruction de l’écran | Le travail en cours est clos en « à confirmer » |
| Échec matériel | Service d’impression absent ou erreur ⇒ `failed` |

### 6.2 iOS et autres coques natives

Un plugin d’impression de vue web est utilisé, avec correspondance des champs
`printed`, `isCancelled`, `isFailed` vers les quatre issues. Un plugin non
initialisé produit un échec explicite, jamais un silence.

### 6.3 Navigateur (web)

`window.print()` est appelé si disponible ; l’issue est toujours
« à confirmer », car le navigateur ne rapporte pas le résultat. Un
`window.print()` silencieusement inopérant dans une vue web est traité comme un
échec, pas comme un succès.

---

## 7. La mémoire d’impression

| Donnée | Rôle |
|---|---|
| Dernière impression | Date et heure du dernier tirage confirmé |
| Dates imprimées | Liste triée des dates déjà tirées |
| Signatures confirmées | Empreinte de chaque séance au moment du tirage |
| Préférences | Taille, aération, numéros de page, couleur, mode d’en-tête |

Trois règles :

1. **Un document par classe** : deux classes ne partagent jamais leur historique.
2. **L’ouverture ne compte pas** : les lancements de la première version sont
   ignorés comme preuve d’impression, mais leurs préférences de mise en page sont
   conservées.
3. **Stockage plein n’empêche pas d’imprimer** : l’impression fonctionne, seul
   l’historique est perdu, et un message le signale.

La mémoire d’impression reste **locale** : elle ne part pas au cloud, mais elle
est incluse dans la sauvegarde complète et dans les archives d’année.

---

## 8. Règles de sûreté

1. **Une seule composition** pour l’aperçu et le papier.
2. **Aucune formule non composée** ne part au papier : ni erreur de rendu, ni TeX
   brut.
3. **Aucun succès déduit** : sans preuve du système, l’issue est « à confirmer ».
4. **Aucun enregistrement sans tirage** : l’historique n’avance que sur une
   impression confirmée.
5. **Un travail à la fois** : deux impressions simultanées sont refusées.
6. **Document figé** : une édition pendant le tirage n’affecte pas la feuille.
7. **Le contexte est conservé, les dates parasites supprimées**.
8. **La numérotation du papier est celle de l’écran**.
9. **La langue du papier est celle du contenu**, pas celle de l’interface.
10. **L’échec est visible** : message explicite, document libéré, rien
    d’enregistré.

---

## 9. Branchements

| Circuit | Dépend de | Déclenche |
|---|---|---|
| Fenêtre d’impression | Signatures, dates imprimées, préférences | Recommandation du mode, sélection par défaut |
| Composition | Lignes du cahier, numérotation, remarques de séance, absences | Feuille mesurable |
| Préparation | Polices, formules, images, dimensions | Autorisation ou refus du tirage |
| Plateforme | Adaptateur natif ou navigateur | Issue réelle |
| Historique | Issue confirmée | Nouvelles signatures, prochaine recommandation |
| Sauvegarde et archives | Mémoire d’impression | Restauration fidèle sur un autre appareil |
| Direction | Même composition A4 | Relecture et impression du cahier d’un professeur |
