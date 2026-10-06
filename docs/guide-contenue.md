# Guide de rédaction des contenus — `guide-contenue.md`

Ce guide explique **comment écrire un contenu pédagogique** qui ressemble à une
feuille composée par LaTeX : titres, libellés, exercices, numérotation,
sous-questions, formules, listes, mise en forme.

Il couvre les deux endroits où l'on écrit :

| Où | Quoi | Comment y accéder |
| --- | --- | --- |
| **Le cahier de textes** | descriptions de séances, titres de chapitres, blocs, remarques | *Éditeur → Ajouter du contenu* / *Modifier* |
| **Les documents de devoirs** | sujet de devoir surveillé, devoir maison, olympiade, corrigé, fiche | *Évaluations → Contenu* (sur un devoir) ou *Contenu* (sur une activité — sauf le contrôle des cahiers) |

> **Règle d'or : un seul moteur.**
> Le cahier, l'aperçu du document et la feuille imprimée sont mis en page par le
> **même** moteur, avec **la même** syntaxe et **les mêmes** polices. Ce que vous
> relisez dans *Aperçu* est exactement ce qui sera imprimé. Aucune syntaxe
> « spéciale document » à apprendre en plus.

---

## 1. Structure d'un contenu

Le cahier a une hiérarchie, posée par les boutons de l'éditeur, pas par la
ponctuation : **chapitre → section → sous-section → sous-sous-section → contenu**.
La marge gauche de chaque ligne vous dit à quel niveau vous êtes.

| Élément | Rôle | Numérotation |
| --- | --- | --- |
| **Chapitre** | grande partie du programme (« Nombres rationnels ») | manuelle, décidée par vous |
| **Section** (`A.`) | partie du chapitre | automatique, en **lettres** |
| **Sous-section** (`1.`) | découpage de la section | automatique, en **chiffres** |
| **Sous-sous-section** (`i.`) | découpage fin | automatique, en **romains** |
| **Contenu** | l'activité, l'exercice, la définition… | automatique par **type**, ou le numéro que vous saisissez |
| **Évaluation** | devoir, contrôle, correction, examen, DM, DS, CC | numérotée par son **titre** |
| **Ligne libre** | note de service, mot pour la classe, mention hors plan | jamais numérotée |

Trois règles à retenir :

1. **Le numéro saisi à la main gagne** sur la numérotation automatique — et il
   fait avancer le compteur des contenus suivants. C'est ce qui permet de
   reprendre la numérotation d'un manuel.
2. **Les structures et les évaluations ne consomment pas de numéro de contenu** :
   seuls les contenus pédagogiques (définitions, exercices, activités…) sont
   comptés, **par type**, et le compteur repart à zéro à chaque chapitre.
3. **La ligne libre ne suit pas le plan** : elle est posée là où vous la créez,
   sans numéro, hors des chapitres.

### Libellés de type

Chaque contenu porte une **pastille** courte, choisie dans la liste de l'éditeur :
`DÉF`, `THM`, `PROP`, `LEM`, `COR`, `REM`, `DÉM`, `EX`, `EXO`, `ACT`, `APP`,
`INTRO`, `OBS`, `MÉTH`, `PROC`, `COMP`, `CLASS`, `STRUCT`… La liste complète dépend
de la matière. Ce sont des étiquettes **sans point final** et non ambiguës : elles se
lisent d'un coup d'œil dans une colonne étroite, et à l'impression.

Les **évaluations** (devoir, contrôle court, contrôle global, oral, devoir maison)
portent leur numéro **dans leur titre** : elles ne consomment donc aucun numéro
de contenu.

---

## 2. Mise en forme (identique partout)

### Marqueurs du carnet

| Ce que vous écrivez | Ce qui s'affiche |
| --- | --- |
| `**gras**` | **gras** |
| `*italique*` | *italique* |
| `++souligné++` | souligné |
| `==surligné==` | surligné |
| `[color:red]texte[/color]` | texte coloré (`red`, `blue`, `green`, `amber`, `purple`) |

> Le `*` **seul** est réservé à l'italique : pour une puce tapée à la main,
> utilisez `-` ou `+` (voir § 3).

> **Feuille de devoir** : les marqueurs `#` `##` `###` et `[[2pts]]` n'ont
> d'effet visuel que dans la fenêtre de **document** — titre, barres d'exercice
> et barème. Ils sont décrits au § 5, *Mise en page d'une feuille*.

### Balises HTML acceptées

Les balises ci-dessous sont **traduites** vers la mise en forme du carnet : vous
pouvez donc coller un document écrit en HTML sans le réécrire.

| Balise | Effet |
| --- | --- |
| `<b>`, `<strong>` | gras |
| `<i>`, `<em>` | italique |
| `<u>` | souligné |
| `<mark>` | surlignage |
| `<br>`, `<br/>` | retour à la ligne |
| `<p>…</p>` | paragraphe (respiration entre deux blocs) |
| `<ul>`, `<ol>`, `<li>` | liste ; chaque `<li>` devient un item |
| `<div>` | conteneur transparent |

Entités reconnues : `&nbsp;` `&amp;` `&lt;` `&gt;` `&quot;` `&times;` `&middot;` `&hellip;`.
Les attributs sont acceptés et ignorés (`<b class="x">gras</b>` fonctionne).

> **Sécurité — à savoir :** le moteur produit des **nœuds**, jamais du HTML
> interprété. Une balise **inconnue** (`<script>`, `<img>`, `<iframe>`…) reste
> donc **affichée telle quelle, en texte** : elle ne s'exécute jamais. Le
> `<span style="…">` n'est pas non plus interprété — c'est une volonté, pas un oubli.

### LaTeX de document (hors formule)

Utile si vous collez un document rédigé à la main en LaTeX :

| Commande | Effet |
| --- | --- |
| `\textbf{…}`, `\textit{…}`, `\emph{…}` | gras, italique, italique |
| `\underline{…}` | souligné |
| `\\`, `\newline` | retour à la ligne |
| `\par`, `\medskip`, `\bigskip` | respiration entre deux paragraphes |
| `\noindent`, `\centering` | ignorés (sans objet ici) |
| `\%`, `\&`, `\_`, `\#`, `\{`, `\}` | le caractère lui-même |

---

## 3. Listes, exercices et sous-questions

Trois écritures équivalentes — choisissez celle qui vous est naturelle.

### a) Puces et numéros tapés à la main

```text
- Premier point
- Deuxième point

1. Première question
2. Deuxième question
```

Les chiffres **arabo-indiens** (`١.`) et persans sont reconnus : ils forment une
vraie liste, correctement alignée.

### b) Listes LaTeX

```latex
\begin{enumerate}
\item Première question
\item Deuxième question
\end{enumerate}
```

```latex
\begin{itemize}
\item Une puce
\item Une autre
\end{itemize}
```

```latex
\begin{description}
\item[Définition] Le texte de la définition.
\item[Exemple] Le texte de l'exemple.
\end{description}
```

Aucune ligne vide n'est exigée : un `\item` se termine au `\item` suivant, à
`\end{…}` ou à une ligne vide. Un item peut donc s'étaler sur plusieurs lignes —
une formule centrée, un calcul développé — **sans sortir de sa colonne**.

### c) Imbrication et sous-numéros

Imbriquez pour obtenir les sous-niveaux ; les marqueurs descendent
automatiquement : **puis `a.` puis `i.`**.

```latex
\begin{enumerate}
\item Résoudre l'équation
  \begin{enumerate}
  \item cas $x \ge 0$
  \item cas $x < 0$
  \end{enumerate}
\item Vérifier les solutions
\end{enumerate}
```

Rend :

```text
1. Résoudre l'équation
    a. cas x ≥ 0
    b. cas x < 0
2. Vérifier les solutions
```

À un troisième niveau, les marqueurs deviennent `i.`, `ii.`, puis le cycle
recommence. L'imbrication fonctionne aussi avec des puces tapées à la main : une
ligne qui suit une puce lui appartient.

### Modèle d'exercice complet

```text
**Exercice 1** — (4 points)

Soit $f(x)=\frac{2x+1}{x-3}$.

1. Déterminer l'ensemble de définition $D_f$.
2. Étudier les variations de $f$ sur $D_f$.

   a. Calculer $f'(x)$.
   b. Dresser le tableau de signes de $f'(x)$.

3. Tracer la courbe représentative $\mathcal{C}_f$.
```

---

## 4. Mathématiques

| Écriture | Rendu |
| --- | --- |
| `$x^2+1$` | formule **en ligne**, au fil du texte |
| `$$\frac{a}{b}$$` ou `\[ … \]` | formule **centrée sur sa propre ligne** |
| `$a_{n+1}$`, `$x^{2n}$` | indices et exposants |
| `$\frac{a}{b}$`, `$\dfrac{a}{b}$`, `$\sqrt{x}$`, `$\sqrt[3]{x}$` | fractions et racines |
| `$\begin{cases} … \end{cases}$` | systèmes |
| `$\begin{aligned} … \end{aligned}$` | calculs alignés |
| `$\begin{pmatrix} … \end{pmatrix}$` | matrices |
| `$\overrightarrow{AB}$` | vecteur (aussi via `\vect{AB}`) |
| `$\leq$`, `$\geq$`, `$\neq$`, `$\times$`, `$\pm$`, `$\infty$` | symboles |
| `\textbf`, `\textit`, `\text{…}`, `\underline` **dans** une formule | mise en forme locale |
| `\textcolor{red}{x}`, `\boxed{x}`, `\cancel{x}` | couleur, encadré, barré de calcul |
| `\ldots`, `\quad`, `\hspace{1cm}` | respiration et points de suite |
| `\overbrace{x+y}^{\text{somme}}` | accolades explicatives |

**Macros de confort** (traduites automatiquement avant le rendu) :

| Écriture | Rendu |
| --- | --- |
| `\R` `\N` `\Z` `\Q` `\C` | ℝ ℕ ℤ ℚ ℂ (ensembles usuels) |
| `\e`, `\dif` | e, d (droits) |
| `\abs{x}` | |x| |
| `\norme{u}` | ‖u‖ |
| `\vect{AB}` | AB avec la flèche |
| `\sout{x}` | x barré (calcul à supprimer) |
| `\itsize{x}`, `\itesize{x}` | x en italique |
| `\itshape` | italique (natif) |
| `\ang{45}` | 45° |
| `\unit{5}{cm}` | 5 cm |

Les commandes de **document** écrites par erreur dans une formule
(`\par`, `\noindent`, `\smallskip`, `\medskip`, `\bigskip`, `\vspace{…}`) sont
simplement absorbées : la formule reste correcte.

**Longueur :** une formule centrée trop large est **coupée par le moteur** aux
endroits que TeX autorise, jamais par une barre de défilement. Vous pouvez donc
écrire une formule longue : elle reste lisible dans une colonne de téléphone.

**Rien à installer :** le moteur mathématique est embarqué dans l'application. Une
formule reste nette **hors connexion**, y compris dans l'APK.

### Ce qui ne s'exécute pas **dans** une formule

`\item`, `\begin{enumerate}`, `\par`, `\vspace`, `\noindent` n'ont pas de sens
dans une formule : utilisez-les **autour** d'elle (ils sont alors traités par la
mise en page du carnet). `\itshape` devient `\mathit`, `\sout` devient `\cancel`.

---

## 5. Écrire un document de devoir

### Où et comment

*Évaluations* → sur un devoir : bouton **Contenu** · sur une activité
(olympiade, devoir à surveiller, devoir maison…) : bouton **Contenu** également.
Seul le **contrôle des cahiers** n'a pas de bouton *Contenu* : voir § 5, *Feuille
de contrôle des cahiers*.

La feuille s'ouvre sur deux onglets :

| Onglet | Usage |
| --- | --- |
| **Source** | vous écrivez (police à chasse fixe, compteur de caractères) |
| **Aperçu** | vous relisez la page **composée**, exactement comme à l'impression |

* **Enregistrer** range le document avec le devoir (et le synchronise avec votre
  compte). Un devoir peut être officiel (planning ministériel) ou saisi à la main.
* **Annuler** quitte sans rien changer : la version enregistrée reste intacte.
* Effacer toute la source puis enregistrer **supprime** le document.
* La borne est de **20 000 caractères** par document ; au-delà, l'enregistrement
  est bloqué et le compteur passe au rouge. Un sujet de devoir en occupe
  généralement moins de 3 000.
* L'aide **Aide · syntaxe**, dans la feuille, rappelle les marqueurs essentiels et
  la liste exacte des balises acceptées.

### Mise en page d'une feuille : titre, exercices, barème

Un document de devoir se compose comme une **feuille de sujet** : un titre, des
exercices en barres colorées, un barème au bord de la ligne.

| Ce que vous écrivez | Ce qui s'affiche |
| --- | --- |
| `# Devoir surveillé 3` | titre du document, **centré** et en gras |
| `## Exercice 1` | **barre d'exercice**, teintée selon son **numéro** |
| `### Partie A` | sous-titre, sans barre |
| `[[2pts]]` — ou `\bareme{2pts}` | **barème**, aligné au bord de la ligne |

* **Quatre teintes qui se relaient** : bleu, vert, ambre, violet. C'est le
  **numéro** de l'exercice qui choisit la couleur, jamais son rang de passage :
  « Exercice 3 » est ambre dans l'énoncé **et** dans son corrigé, et un exercice
  inséré au milieu ne recolore pas les suivants. Au-delà de 4, le cycle reprend
  (5 → bleu). Les numéros écrits en chiffres arabo-indiens (`٣`) comptent comme
  les autres ; un titre sans numéro prend la première teinte.
* **Le barème suit le texte** de la question, dans la source : `… [[4pts]]`.
  Il se pose sur **sa propre ligne**, aligné au bord de lecture — à gauche en
  français, à droite en arabe — et plusieurs barèmes dans un même énoncé
  s'empilent en colonne. Le marqueur n'apparaît jamais tel quel dans l'aperçu.
* **Une ligne par titre**, sans ligne vide avant : le moteur gère déjà
  l'espacement (une ligne vide ajouterait un blanc inutile au-dessus de la barre).
* Ces marqueurs **composent une feuille de devoir** : ils n'ont d'effet visuel que
  dans la fenêtre de document (*Évaluations → Contenu*). Écrits ailleurs — dans
  une description de séance — ils restent du texte ordinaire, et le carnet garde
  sa sobriété.
* **Typographie** : le titre prend la police d'affichage de l'application (à
  empattements en français, Maghribi en arabe), le corps la police de lecture, et
  la colonne de lecture est bornée à ~44 rem — la feuille se lit comme une page.
* Les couleurs des barres s'impriment telles quelles (couleurs exactes) ; le
  contraste blanc sur fond est vérifié AA sur les quatre teintes.

### Modèle : devoir surveillé

```text
# Devoir surveillé n°2
Semestre 1 — Durée : 2 h

**Nom :** …………………………  **Classe :** ………………

**Consignes.** La rédaction et la propreté sont notées sur 1 point. La calculatrice
n'est pas autorisée.

## Exercice 1

Soit $f$ la fonction définie sur $\mathbb{R}$ par $f(x)=x^2-4x+3$.

1. Calculer $f(0)$, $f(1)$ et $f(3)$. [[2pts]]
2. Résoudre $f(x)=0$. [[2pts]]
   a. Factoriser $f(x)$.
   b. Conclure. [[1pt]]

## Exercice 2

\begin{enumerate}
\item Démontrer que $1+\frac{1}{2}+\frac{1}{4}=\frac{7}{4}$.
\item En déduire $\frac{7}{4}-\frac{3}{4}$. [[2pts]]
\end{enumerate}

**Barème :** Ex. 1 : 5 pts · Ex. 2 : 4 pts
```

### Modèle : devoir maison / olympiade

```text
# Devoir maison n°3
à rendre le ………………

## Problème

On considère un carré $ABCD$ de côté $a$.

1. Exprimer la longueur de la diagonale $AC$ en fonction de $a$. [[3pts]]
2. Montrer que l'aire du triangle $ABC$ vaut $\dfrac{a^2}{2}$. [[3pts]]

### Indication

Utiliser le théorème de Pythagore dans le triangle $ABC$, rectangle en $B$.
```

### Modèle : corrigé

```text
# Corrigé — Devoir surveillé n°2

## Exercice 1

1. $f(0)=3$, $f(1)=0$, $f(3)=0$. [[1pt]]

2. On remarque que $f(x)=(x-1)(x-3)$ :

   $$f(x)=x^2-3x-x+3=x^2-4x+3$$

   Donc $f(x)=0$ pour $x=1$ ou $x=3$. [[1pt]]
```

### Modèle : feuille à trois exercices (barres et barème)

L'exemple ci-dessous donne la feuille telle qu'elle s'affiche : trois exercices,
trois barres de couleurs différentes, un barème par question.

```text
# Devoir surveillé 03
2ème bac — Sciences expérimentales

## Exercice 1

Une urne contient 10 boules indiscernables au toucher.

1. Calculer la probabilité d'obtenir deux boules de même couleur. [[4pts]]
2. Soit $X$ la variable aléatoire égale au nombre de couleurs tirées.
   a. Déterminer les valeurs prises par $X$. [[1pt]]
   b. Calculer $E(X)$ et $V(X)$. [[4pts]]

## Exercice 2

L'espace est rapporté à un repère orthonormé direct $\left(O,\vec{i},\vec{j},\vec{k}\right)$.

1. Déterminer une équation cartésienne du plan $(OCD)$. [[2pts]]
2. En déduire que $O$ est le point de contact de $(S)$ et du plan. [[1pt]]

## Exercice 3

Une urne contient 10 boules numérotées de 1 à 4.

1. Montrer que $p(A)=\dfrac{1}{3}$. [[2pts]]
2. Soit $X$ le nombre de fois où $A$ est réalisé. Déterminer la loi de $X$. [[4pts]]
```

### Feuille de contrôle des cahiers

Sur une activité de type **Contrôle des cahiers des élèves**, le bouton
**Élèves** permet de consigner les noms des élèves dont le cahier a été vérifié :
saisissez un nom puis *Entrée*, ou collez toute une liste (« Amine R., Salma B. »).
La liste reste dans votre cahier, suit votre compte, et ne compte dans **aucune**
note.

Ce type d'activité **n'accepte aucun document** : il n'y a pas de sujet à
joindre, et le bouton *Contenu* n'est donc pas proposé. Sa trace pédagogique est
la **date** du contrôle, reportée automatiquement dans la **cellule « remarque »
de la séance du même jour** — sur l'écran comme à l'impression, sous la forme
« Contrôle des cahiers : Amine R., Salma B. » (jusqu'à trois noms, puis « +N »).

À retenir :

* vous n'avez rien à recopier : saisir le contrôle suffit, la séance du jour
  porte la trace ;
* l'annotation **n'ajoute aucune ligne** au cahier et n'entre dans aucun calcul
  de moyenne ;
* un contrôle étalé sur plusieurs jours annote **chacune** des séances couvertes
  (la date de fin se saisit dans la même fiche) ;
* votre propre remarque reste intacte : l'annotation s'affiche **sous** elle, et
  non à sa place. Modifier la remarque de la séance ne l'efface donc pas, et
  supprimer ou redater le contrôle la retire.

---

## 6. Bonnes pratiques

1. **Une idée par contenu.** Un exercice = un contenu ; le corriger ou l'annoter
   se fait ensuite ligne par ligne.
2. **Datez ce qui a été fait en classe**, pas ce qui est prévu : la date alimente
   la progression et les alertes.
3. **Numérotez à la main dès que le manuel impose son découpage** — sinon laissez
   la numérotation automatique travailler.
4. **Préférez deux lignes nettes à une ligne surchargée** : les listes imbriquées
   se rangent mieux que les énumérations « 1) a) i) » écrites dans un seul
   paragraphe.
5. **Écrivez les formules entre `$…$`** même pour un simple exposant : c'est ce
   qui garantit une composition mathématique correcte à l'impression.
6. **Relisez l'onglet Aperçu avant d'imprimer** un devoir : c'est le rendu exact,
   y compris les retours à la ligne de vos blocs.
7. **Le même document peut être collé dans une séance** : la syntaxe est
   identique. C'est une façon pratique de transformer un sujet de DS en trace
   de classe, une fois corrigé — les barres d'exercice et le barème y perdent
   seulement leurs couleurs, réservées à la feuille de devoir.
8. **Gardez les numéros d'exercice stables** (`## Exercice 2`) : c'est eux qui
   décident de la couleur de la barre. Renuméroter, c'est recolorer.

---

## 7. Ce que le moteur ne fait pas

* Pas de tableaux couverts par une syntaxe dédiée (utilisez des listes, ou une
  formule `\begin{array}` pour un tableau mathématique).
* Pas de HTML exécuté, ni de style en ligne : les balises inconnues restent du
  texte.
* Pas d'images dans un document : joignez l'illustration au contenu du cahier.
* Pas de notes de bas de page automatiques : écrivez-les entre parenthèses ou
  dans la remarque de séance.
* Pas de saut de page forcé dans un document, ni de colonnes : une feuille se
  compose d'un seul flux (le barème se pose par `[[…]]`).
* Pas de barème calculé : le moteur **affiche** les points que vous écrivez, il
  ne les additionne pas et n'en déduit aucune note.

---

## 8. Références croisées

| Sujet | Document |
| --- | --- |
| Importer un programme au format JSON | [`GUIDE_CREATION_CONTENUS_JSON_FR.md`](GUIDE_CREATION_CONTENUS_JSON_FR.md) |
| Architecture, dossiers, conventions | [`architecture/architecture.md`](architecture/architecture.md) |
| Prendre en main l'application | [`guides/`](guides/) |
