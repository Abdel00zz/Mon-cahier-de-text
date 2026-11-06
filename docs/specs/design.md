# Design — style UI et philosophie minimaliste futuriste

Ce document décrit **la philosophie visuelle** de l'application : ce qui la rend
« minimaliste futuriste » sans tomber dans la science-fiction froide, comment les
trois piliers du style se combinent, et les règles de goût qui gouvernent chaque
écran. Il est la **couche conceptuelle** au-dessus des documents de mesure.

Il décrit une identité et des principes, sans recopier les valeurs. Pour les
tokens de couleurs, les surfaces et l'anatomie des écrans, voir `style.md` ;
pour la typographie, voir `font.md` ; pour les dimensions réelles, voir
`mesur.md` ; pour le papier imprimé, voir `peint.md`.

Vocabulaire employé :

| Terme | Sens exact dans ce document |
|---|---|
| **Style** | L'identité visuelle récurrente : matière, couleur, mouvement, typographie |
| **Philosophie** | Le « pourquoi » du style : ce que l'interface doit faire ressentir |
| **Futurisme chaleureux** | Le futurisme obtenu par le verre, la grille et le ressort, jamais par le froid du métal |
| **Papier** | La matière de fond : albâtre chaud, jamais blanc pur, jamais noir pur |
| **Verre liquide** | La transparence calibrée des barres et modales (flou + saturation) |
| **Bento** | La mise en page modulaire par cartes distinctes à hiérarchie claire |
| **Ressort** | La physique d'animation élastique, entre 150 et 300 ms |

---

## 1. La philosophie : un futurisme chaleureux

L'application n'oppose pas le futur à la tradition : elle les **fond**. Le cahier
de textes est un objet de papier — un document officiel, chaleureux, connu de
l'enseignant. L'interface, elle, est moderne : verre, grille, mouvement fluide.

Le style qui en résulte n'est ni le « flat design » froid des interfaces
techniques, ni un néo-skeuomorphisme qui imite le cuir et le bois. C'est un
**futurisme doux** :

| Ce que l'application EST | Ce qu'elle n'est PAS |
|---|---|
| Papier albâtre chaud (`#F6F4EE` / `#F4F2EB`) | Un blanc pur aveuglant `#FFFFFF` en grand aplat |
| Verre dépoli translucide sur les barres | Un métal brillant, un chrome de science-fiction |
| Une grille Bento lisible et modulaire | Un tableau de bord surchargé de widgets |
| Des ressorts et des transitions courtes | Des animations longues ou décoratives |
| Des illustrations vectorielles qui « respirent » | Des effets 3D lourds ou du bruit visuel |
| Une palette à 60/30/10 | Une accumulation de couleurs vives concurrentes |

**La règle d'or** : le futurisme vient de la **matière et du mouvement** (verre,
grille, ressort), la chaleur vient de la **couleur et du papier** (albâtre, brun
cuir, accents désaturés). Aucun des deux ne doit l'emporter.

---

## 2. Les trois piliers du style

### 2.1 Le papier albâtre (la chaleur)

Le fond est un **papier** : un neutre subtilement teinté (1 à 5 % de la teinte
primaire), jamais un blanc pur ni un gris froid.

| Règle | Effet |
|---|---|
| Fond neutre teinté | Identité chaleureuse sans surcharge, contraste reposant |
| Jamais de noir pur `#000000` ni de blanc pur `#FFFFFF` en aplat | Évite le contraste violent et la fatigue visuelle |
| Séparation par **bordures fines** plutôt que par empilement de fonds colorés | Des cartes nettes, pas des blocs saturés |
| Réserver le noir/blanc pur aux zones de très haute priorité | Le contraste reste un signal, pas un bruit de fond |

Le papier **imprimé** (`peint.md`) est la continuité de ce papier d'écran : la
feuille qui sort de l'imprimante ressemble au fond de l'application.

### 2.2 Le verre liquide (le futur)

Les barres collantes et les modales utilisent un **verre liquide** : transparence
calibrée (88–95 %), flou d'arrière-plan (16–20 px), saturation légèrement
augmentée, et un liseré spéculaire supérieur qui simule la réfraction.

| Règle | Effet |
|---|---|
| Opacité 88–95 % + `backdrop-blur` + `saturate` | La profondeur se lit sans perdre le contenu derrière |
| Liseré supérieur (`inset 0 1px 0.5px` ou gradient blanc 20–50 %) | La réfraction naturelle du verre, sans perdre le contraste |
| Contraste **AA** garanti sur verre | Le texte reste lisible en clair comme en sombre |
| Repli opaque si « réduire la transparence » | L'accessibilité prime sur l'esthétique |

Le verre n'est jamais décoratif : il sert à **hiérarchiser** (une barre au-dessus
du contenu) et à **situer** (une modale flottant sur la page).

### 2.3 La grille Bento (la structure)

Les écrans sont composés de **cartes interactives distinctes** (Bento Grids), avec
une hiérarchie claire et des espacements mathématiques équilibrés.

| Règle | Effet |
|---|---|
| Cartes modulaires distinctes | Chaque action a son territoire, aucun amalgame |
| Hiérarchie claire, espacements équilibrés | La lecture est guidée, pas subie |
| Règle des rayons imbriqués | Rayon intérieur = rayon extérieur − espacement : une géométrie cohérente |

La grille Bento n'est pas un empilement de tuiles identiques : chaque carte a une
**fonction** et une **taille** justifiée par son contenu.

---

## 3. La discipline chromatique

Le style repose sur une **discipline de couleur**, pas sur une liberté de palette.

### 3.1 La règle 60-30-10

| Part | Rôle | Usage |
|---|---|---|
| **60 %** | Couleur dominante / neutre | Arrière-plan et zones majoritaires |
| **30 %** | Couleur secondaire / structure | Cartes, panneaux, conteneurs |
| **10 %** | Couleur d'accent | Boutons d'action (CTA), indicateurs importants |

Les **icônes restent neutres par défaut** : la couleur est réservée à l'état actif
ou à un statut critique.

### 3.2 L'équilibre des neutres

- **Teinter les neutres** : injecter 1 à 5 % de la teinte primaire dans les gris
  de fond, pour une identité chaleureuse sans surcharge.
- **Séparer par des bordures** fines et discrètes, pas par des fonds colorés.
- **Ne jamais saturer l'arrière-plan** : un fond saturé étouffe le contenu et
  fatigue l'œil.

### 3.3 Le mode sombre n'est pas une inversion

Le mode sombre n'inverse pas mécaniquement le mode clair :

| Règle | Effet |
|---|---|
| Fond gris profond élégant (jamais `#000000`) | Pas d'éblouissement |
| Conteneurs et cartes **légèrement plus clairs** que le fond | La profondeur (élévation en Z) se matérialise |
| Texte gris clair ou teinté (jamais blanc pur) | Lisibilité douce |
| Couleurs vives **légèrement désaturées** | Pas de vibration visuelle sur fond sombre |

### 3.4 La sémantique prime sur la marque

- **Rouge** : actions destructives (supprimer, annuler, erreurs) — même s'il
  n'est pas dans la marque.
- **Vert** : succès, validation, confirmation.
- **Ambre / jaune** : avertissements, attention.

La couleur de marque ne s'étend jamais aux actions dangereuses.

---

## 4. La typographie bilingue

La typographie suit une règle unique : **un composant choisit un rôle, jamais une
famille** (voir `font.md`).

| Principe | Effet |
|---|---|
| Une seule famille bilingue pour l'interface | Arabe et latin dans la même ligne, même graisse optique |
| La pile s'inverse selon la direction du texte | Un cahier arabe affiche un titre latin sans qu'il paraisse étranger |
| Aucun italique synthétique en arabe | Ligatures et attaches intactes |
| Aucun interlettrage sur l'arabe | Les lettres ne se détachent pas |
| L'éditeur compose, le papier imprime | Deux réglages typographiques, jamais mélangés |

La **taille, la graisse et le retrait** rendent la hiérarchie visible. Les
titres de chapitre, les titres des blocs d’évaluation et les dates sont
centrés. Sections, contenus et remarques se calent sur le bord de lecture.
Voir [les alignements du tableau](tabel.md#122-alignements-et-éléments-sans-badge).

---

## 5. Le mouvement : la physique du ressort

Le mouvement est une **matière**, pas une décoration. Toute animation respecte
trois contraintes :

| Contrainte | Valeur |
|---|---|
| Durée | **150 à 300 ms** — enrichir sans ralentir |
| Courbe | Ressort (`spring`, `stiffness` élevé, `damping` maîtrisé) ou décélération iOS |
| Accessibilité | `prefers-reduced-motion` désactive tout |

| Interaction | Comportement |
|---|---|
| Bouton pressé | Micro-compression `scale(0.90–0.97)` + retour haptique doux |
| Navigation par onglets | Pastille coulissante (`layoutId`) reliant les écrans |
| Confirmation | Morphing de coche de succès, ressort |
| Carte | Élévation douce au survol, compression contrôlée au toucher |

Le mouvement ne porte jamais d'information seule : l'état est aussi annoncé par le
texte, le focus et la couleur.

---

## 6. Les états : le design émotionnel

L'interface n'a jamais d'état **passif** : chaque situation a une intention.

### 6.1 Les trois niveaux de l'émotion

| Niveau | Objectif | Levier |
|---|---|---|
| **Viscéral** (impression immédiate) | Rassurer, montrer la qualité | Onboarding fluide, finition des détails, transitions douces |
| **Comportemental** (plaisir d'usage) | Transformer la routine en plaisir | Retours visuels/haptiques au clic, squelettes de chargement |
| **Réflexif** (attachement) | Déclencher la fierté, le retour | Badges animés, compteurs de séries, messages bienveillants |

### 6.2 Les états à vide valorisés

Un écran vide n'est jamais passif :

| État | Traitement |
|---|---|
| Aucune classe / cahier vide | Illustration soignée + message d'orientation + bouton d'action direct |
| Aucune notification | Message rassurant (« Sérénité pédagogique », « Tout est à jour ») |
| Erreur | Formulation humaine, démarche à suivre, jamais de culpabilisation |

### 6.3 Le chargement sans saut de mise en page

- **Squelettes avec shimmer GPU** : un chargement qui occupe la place exacte du
  contenu (CLS = 0), pas un spinner isolé.
- **Latence masquée** : les étapes lentes deviennent des progressions fluides.

---

## 7. Les illustrations vectorielles vivantes

Les illustrations sont des **composants vectoriels** (jamais des images figées) :

| Principe | Effet |
|---|---|
| Palette sémantique (`stroke-primary`, `fill-primary/10`) | Elles s'harmonisent au thème choisi |
| Micro-respiration (battement doux, oscillation de lueur) | Vie discrète, sans surcharge GPU |
| Aucun texte dans l'illustration | Rien à traduire entre arabe et latin |
| Aucune couleur vive concurrente | Elles restent neutres, l'action garde la couleur |

---

## 8. Ce que le style n'est PAS (les erreurs à éviter)

| À éviter | Pourquoi |
|---|---|
| Plusieurs couleurs vives simultanées | Confusion, hiérarchie détruite, échec WCAG |
| Arrière-plans saturés ou gradients vifs | Contenu étouffé, œil fatigué |
| Noir pur / blanc pur en grand aplat | Contraste violent, manque de raffinement |
| Inversion mécanique du mode sombre | Interface agressive, éblouissante |
| Couleur de marque pour tout (y compris le danger) | Le rouge sémantique disparaît |
| État d'élément non communiqué (hover/pressed/disabled) | L'interface ne « répond » pas |
| Écrans passifs sans action | Aucune orientation, aucune progression |
| Blocs de texte descriptifs | Charge mentale, ennui |
| Animations > 300 ms ou purement décoratives | Lenteur perçue, distraction |

---

## 9. La matrice de référence

| Sujet | Document source |
|---|---|
| Tokens de couleurs, surfaces, anatomie des écrans | `style.md` |
| Typographie, rôles, licences | `font.md` |
| Dimensions et contrastes réels | `mesur.md` |
| Papier imprimé, feuille de l'imprimante | `peint.md` |
| Parcours, écrans et règles d'interaction | `workflow.md`, `landing.md`, `onboarding.md` |
| Directives UX/UI de conception | `AGENTS.md` |

---

## 10. Invariants

1. **Le futurisme vient de la matière et du mouvement** ; la chaleur vient de la
   couleur et du papier.
2. **Jamais de blanc pur ni de noir pur en grand aplat.**
3. **60-30-10** : la couleur d'accent reste sous 10 % de la surface.
4. **Les icônes sont neutres par défaut** : la couleur exprime un état, pas une
   décoration.
5. **Le rouge sémantique s'impose** pour toute destruction, indépendamment de la
   marque.
6. **Un composant choisit un rôle typographique, jamais une famille.**
7. **Toute animation tient en 150–300 ms** et respecte `prefers-reduced-motion`.
8. **Aucun écran passif** : chaque état vide, d'erreur ou de chargement a une
   intention et une issue.
9. **La transparence est calibrée (88–95 %) et le contraste AA est garanti.**
10. **Le mode sombre n'est pas une inversion** : il réélève les surfaces et
    désature les couleurs.
11. **L'information ne dépend jamais d'une seule dimension** (couleur, animation) :
    le texte, le focus et la forme la doublent.
12. **L'illustration ne contient pas de texte** et s'adapte au thème par la
    palette sémantique.
