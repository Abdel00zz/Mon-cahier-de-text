# Relevé des mesures UX/UI — Mon cahier de textes

**Version du relevé :** 5 novembre 2026
**Périmètre :** espace enseignant, pages principales, navigation, onboarding, modales métier et principaux écrans d’administration.
**Source des mesures :** règles CSS, classes Tailwind et propriétés React réellement présentes dans `src/`.

> Les valeurs ci-dessous sont les dimensions déclarées dans le code, et non une capture de dimensions calculées dans un navigateur donné. Les valeurs dépendant de la largeur disponible, de la police, de la langue ou de la safe area sont indiquées comme formules. Pour une mesure physique d’un appareil précis, il faut compléter ce relevé par une capture de l’application sur cet appareil.

## 1. Repères de lecture

### Unités et seuils

- `1 rem = 16 px` pour les conversions présentées ici.
- **Téléphone :** règles jusqu’à `639 px`, puis règles générales « mobile » jusqu’à `767 px`.
- **Tablette :** `768–1023 px`; les modales Aide et Paramètres avec navigation intégrée deviennent immersives.
- **Bureau :** à partir de `1024 px`; la navigation latérale et les panneaux de paramètres sont privilégiés.
- Certains composants détectent aussi un pointeur tactile jusqu’à `1180 px` pour conserver des cibles et champs adaptés au tactile.
- La hauteur utile des fenêtres utilise le viewport visuel (`--app-viewport-height`) et son décalage. Cela tient compte des barres système et du clavier logiciel.

### Fichiers de référence

- Tokens et couleurs : [`src/styles/theme-tokens.css`](src/styles/theme-tokens.css)
- Polices et rôles typographiques : [`src/styles/typography.css`](src/styles/typography.css), [`src/styles/fonts.css`](src/styles/fonts.css)
- Socle de modales : [`src/components/ui/modal-bottom-sheet.tsx`](src/components/ui/modal-bottom-sheet.tsx), [`src/components/ui/modal-motion.css`](src/components/ui/modal-motion.css), [`src/styles/modal-premium-tokens.css`](src/styles/modal-premium-tokens.css)
- Navigation : [`src/components/navigation/navigation.css`](src/components/navigation/navigation.css)

## 2. Socle visuel commun

### Palette de base

| Rôle | Mode clair | Mode sombre | Usage |
|---|---|---|---|
| Fond d’application | `hsl(40 18% 94%)` | `hsl(40 6% 12%)`, environ `#1F1D1A` | Canvas principal, doux et neutre |
| Carte / surface | `hsl(40 32% 99%)` | `hsl(38 6% 17%)` | Fond unifié des cartes et panneaux |
| Encre principale | `hsl(25 35.29% 13.33%)`, environ `#2e2016` | `hsl(42 18% 92%)` | Titres et texte principal |
| Action principale | `hsl(25.56 33.75% 31.37%)`, `#6b4c35` | `hsl(15 58% 62%)` | CTA, focus, sélection |
| Texte secondaire | `hsl(27.57 20.22% 35.88%)`, environ `#6e5a49` | `hsl(42 8% 67%)` | Aides, descriptions et métadonnées |
| Bordure | `hsl(35 14% 84%)` | `hsl(38 7% 26%)` | Filets fins de séparation |
| Erreur / suppression | `hsl(4.62 56.52% 45.10%)`, `#b43c32` | `hsl(352 55% 70%)` | Destructif, erreur |
| Succès / attention | Vert `hsl(130 28% 26%)`; ambre `hsl(38 92% 45%)` | Versions éclaircies et désaturées | Statuts sémantiques |

Les paramètres et l’aide ont une identité de surface complémentaire : pierre `#faf9f5`, filet `#deded4`, accent vert profond `#285b50`; en sombre, pierre `#252825`, filet `#444a43`, accent `#9bcabb`. Les libellés de rubriques peuvent porter des nuances de catégorie, mais les panneaux restent neutres.

Les modales liquides utilisent une surface carte translucide à **92 %**, un flou de **20 px** et une saturation de **140 %**. Les barres collantes de navigation mobile utilisent `--ui-glass-bg` (carte à **84 %**), `blur(20px) saturate(150%)` et un filet discret. En cas de préférence « réduire la transparence », les panneaux deviennent opaques et le flou est supprimé.

### Rayons et élévation

| Élément | Rayon déclaré |
|---|---:|
| Petit contrôle | 8 px |
| Contrôle standard | 10 px |
| Carte / panneau | 14–18 px |
| Grande carte | 24 px |
| Grande coque de modale | 28 px |
| Pilule / bouton rond | 9999 px |

Les cartes sont séparées principalement par une bordure de 1 px et une ombre très courte (`--ui-card-shadow`). Les ombres de modales montent selon trois niveaux : basse `0 6px 18px`, moyenne `0 16px 38px`, haute `0 28px 64px` (valeurs tokenisées avec leurs décalages et atténuations).

### Typographie commune

| Rôle | Famille active | Valeurs usuelles relevées |
|---|---|---|
| Interface latine | Readex Pro | Titres de modale 15 px, navigation de rubrique 13 px, libellés de formulaire 14 px |
| Interface arabe | Readex Pro | Police arabe dédiée dans les alias; tailles souvent ajustées séparément |
| Contenu du cahier latin | Computer Modern Sans Serif Medium | Corps 14 px par défaut, avec hiérarchie de titres propre au tableau |
| Titres du cahier latin | Computer Modern Sans Serif Demi Condensed | Chapitres et niveaux structurels |
| Intitulés académiques / voix marginale latins | Computer Modern Sans Serif Oblique | Sous-sections, évaluations, remarques et notes |
| Arabe du cahier | Readex Pro | Substitution droite; pas d’italique synthétique |
| Données et numéros techniques | JetBrains Mono ou chiffres tabulaires | Pourcentages, compteurs, dates et repères numériques selon le composant |

La famille de police ne change pas seulement avec la langue de l’interface : les contenus latins ou arabes dans l’éditeur suivent leur propre direction de texte.

### Cibles tactiles

- Le socle des modales impose généralement **44 × 44 px minimum** aux boutons, champs et choix. Depuis le correctif Material 3, les tokens `--touch-min` / `--touch-gap` valent **44 px au pointeur fin et 48 px au doigt** (`pointer: coarse`).
- Les champs de saisie tactiles passent à **16 px** pour éviter le zoom automatique d’iOS.
- La préférence `prefers-reduced-motion` retire les animations et transitions non essentielles; `prefers-reduced-transparency` retire les flous.

## 3. Navigation et structure des pages

### Navigation mobile

- Trois destinations : **Classes · Paramètres · Aide** (`الأقسام · الإعدادات · المساعدة` en arabe).
- Chaque item a une hauteur minimale de **60 px**; la barre ajoute **5 px** en haut et **5 px** en bas, plus la safe area inférieure.
- Hauteur minimale hors safe area : **70 px**.
- Libellé : **11 px**, graisse 500, interligne 1.2; icône active légèrement agrandie (`scale(1.12)`) et remontée de 1 px.
- Fond `#fafafa` à 96 % et bordure supérieure fine; accent actif `#0a5bbd` (contraste AA sur le fond teinté), fond actif `rgb(10 91 189 / .08)`. En sombre, accent `#78adf2`.
- Une navigation équivalente est insérée dans les modales Aide/Paramètres en vue mobile/tablette afin de rester au-dessus du voile.

### Navigation bureau / tablette

- Rail latéral : **76 px**; étendu : **236 px** (sur tablette, plafonné par `35vw`).
- Boutons de navigation : au moins **44 px** de haut, et **46 px** sur tablette.
- La barre du bas est masquée à partir de `768 px`, sauf lorsqu’elle est rendue à l’intérieur d’une modale compacte.

## 4. Pages principales et zones mesurées

### 4.1 Classes — tableau de bord

| Zone / élément | Dimensions et typographie | Couleur / état |
|---|---|---|
| Canvas | Hauteur minimale `100dvh`; fond du thème, sans texture de fond | Neutre clair/sombre |
| Titre de page | `clamp(26px, 6.8vw, 34px)`; bureau **40 px**. En RTL : environ **22–27 px** au mobile, **32 px** au bureau | Encre principale |
| En-tête | Alignement de page, actions au bord; espacement vertical 2–4 px (un peu plus sur bureau) | Pas de centrage imposé |
| Bouton « + » | Pastille visible **38 px** (40 px au bureau); zone de pression étendue à **44 px** | Fond primaire |
| Titre de groupe jour/catégorie | **13 px** (bureau **14 px**) | Texte secondaire, graisse 600 |
| Grille de classes | Une colonne sur téléphone; 2 colonnes dès `768 px`; 3 colonnes dès `1100 px` si le mode « triple » est choisi; espacement **12 px** | Fond de page |
| Carte de classe | Largeur disponible, hauteur minimale **76,8 px**; rayon environ **22 px**, bordure 1 px | Palette de la classe injectée (`bg`, `bg2`, bordure, titre, secondaire); dégradé très discret |
| Nom de classe | **16,8 px**, graisse 600, interligne 1.5 | Couleur de titre de la palette de classe |
| Niveau / sous-titre | **12,8 px**, interligne 1.35 | Couleur secondaire de la palette |
| Actions `⋮` | Cible tactile **44 × 44 px** | Icône neutre; état ouvert sur fond translucide |
| État « maintenant » | Pastille environ **11 px**, rayon 6 px; elle n’apparaît que pour une séance en cours | Encre et fond rose pâle dédiés au statut |

La carte applique une palette liée à la classe, et non un même fond littéralement identique pour toutes les cartes. Dans le code de rendu actuel, le contenu visible principal est le nom, le niveau, le menu d’actions et, si la classe est en cours, l’indicateur « maintenant ». La grille est une colonne sur téléphone pour préserver la lecture.

**Mouvement :** transition de carte jusqu’à 300 ms avec courbe spring, changement du rayon jusqu’à 320 ms; bouton « + » se comprime à `scale(.88)` lors de la pression. Les animations sont neutralisées si l’utilisateur demande une réduction du mouvement.

### 4.2 Cahier — éditeur de séances

| Zone / niveau | Valeur de référence dans le CSS | Rôle |
|---|---:|---|
| Titre de classe en en-tête | 16 px téléphone, 18 px tablette, 20 px grand écran | Titre principal de la page |
| Chapitre | 22 px dans l’échelle de base; suit ensuite `--editor-scale` | Niveau structurel supérieur |
| Bloc de tête | 19 px | Bloc / évaluation |
| Section | 18 px | Section |
| Sous-section | 17 px | Sous-section |
| Sous-sous-section | 16 px | Sous-sous-section |
| Titre d’item | 15 px | Définition, propriété, exercice |
| Description / corps | 14 px | Texte pédagogique |
| Remarque | 13 px | Note marginale |
| Cellule principale de tableau | 12,5 px | Contenu tabulaire |
| Date | 13 px | Cellule de date, centrée |
| Colonne latérale / page | 11,5 px | Métadonnées |
| Badge | 11 px | Repère compact |

Les valeurs du tableau sont les références initiales; les règles finales les recalculent proportionnellement à `--editor-scale`. À titre de lecture, avec le réglage utilisateur à 100 %, cette échelle vaut environ **14 px sur un téléphone tactile étroit** et **16 px sur un grand écran**. Les tailles effectivement obtenues sont alors :

| Zone / niveau | Téléphone (échelle 14 px) | Bureau large (échelle 16 px) |
|---|---:|---:|
| Chapitre | 20,3 px | 23,2 px |
| Bloc de tête | 17,5 px | 20 px |
| Section | 16,2 px | 18,6 px |
| Sous-section | 15,1 px | 17,3 px |
| Sous-sous-section | 14,3 px | 16,3 px |
| Titre d’item | 13,4 px | 15,4 px |
| Description | 12,6 px | 14,4 px |
| Remarque | 11,8 px | 13,4 px |
| Cellule principale | 11,3 px | 13 px |
| Colonne latérale | 10,5 px | 12 px |
| Date | 12,3 px | 14,1 px |
| Page | 10,5 px | 12 px |
| Badge | 10,1 px | 11,5 px |

Ce sont des résultats calculés à partir des ratios CSS, arrondis au dixième; la largeur d’écran et le réglage de taille du texte peuvent les faire varier. La grille de colonnes est partagée entre en-tête, lignes et cellules fusionnées : date `minmax(4.75rem, 18%)`, texte flexible, côté `minmax(3.5rem, 20%)`; téléphone `minmax(3.5rem, 14%) / 1fr / minmax(3.5rem, 16%)`; bureau `minmax(8.5rem, 13%) / 1fr / minmax(9.5rem, 16%)`.

Les espacements de contenu sont pilotés par l’échelle et les niveaux de retrait : 4/8/14 px par défaut, plus amples à partir de 640 px et en paysage tactile. Dates et contenus importants sont centrés selon leurs rôles de cellules; les paragraphes conservent un alignement naturel.

**Couleurs :** contenu sur surface claire/sombre neutre; chapitres en teal (`#2b6d73`, `#91cec8` en sombre); titre d’évaluation rose profond (`#9f1239`, éclairci en sombre); badges et documents restent discrets, sans multiplier les aplats.

**Mouvement :** les interactions document utilisent transitions de 150 ms et pression `scale(.97)`; la barre de sélection se place au-dessus de la barre mobile et respecte les safe areas. La hiérarchie du contenu ne dépend pas d’une animation.

Références : [`src/styles/editor-surface.css`](src/styles/editor-surface.css), [`src/features/editor/editorTypography.css`](src/features/editor/editorTypography.css), [`src/features/editor/Header.tsx`](src/features/editor/Header.tsx).

### 4.3 Évaluations de classe

| Zone / élément | Mesure |
|---|---|
| Modale de classe | `maxWidth="4xl"` (preset jusqu’à **72 rem / 1152 px** au bureau), hauteur mobile configurée à 96 % de la hauteur visible |
| En-tête de l’espace | **16 px** et interligne 1.5; mobile **15 px**, interligne 1.35; contexte de classe **12 px** |
| Tableau d’évaluations | Surface à bordure fine; rayon 6 px; en-tête **10 px** uppercase, graisse 800 |
| Ligne de tableau | Hauteur minimale **36 px**; séparateur 1 px; date centrée; identifiant et actions alignés par colonnes partagées |
| Commandes de ligne | Icône visuelle **28 × 28 px**; cibles interactives portées à **44 px** quand nécessaire sur tactile |
| Champs dans les modales | Hauteur minimale **44 px**, rayon **10 px**; texte **16 px** sur téléphone |
| Mise en page compacte | Sous `1024 px`, chaque entrée devient deux lignes; l’entête de colonnes disparaît plutôt que de comprimer les champs |

**Couleurs :** tableau sur surface carte légèrement transparente, lignes séparées par un filet; en-tête sur fond secondaire. Le rouge signale une suppression ou un document requis manquant, le vert un document présent; le ton d’activité reste neutre.

**Mouvement :** survol/focus de ligne en 160 ms; commandes de ligne en 150 ms avec pression `scale(.92)`. Le socle d’ouverture/fermeture de modale reste celui de la section 5.

Références : [`src/features/evaluations/ClassEvaluationsSheet.tsx`](src/features/evaluations/ClassEvaluationsSheet.tsx), [`src/features/evaluations/evaluationsBoard.css`](src/features/evaluations/evaluationsBoard.css), [`src/features/evaluations/evaluationsResponsive.css`](src/features/evaluations/evaluationsResponsive.css).

### 4.4 Paramètres — accueil et catégories

Les **six rubriques** sont : Emploi du temps, Absences, Profil, Apparence, Notifications et Compte. L’aide est un lien séparé, pas une septième rubrique.

| Zone / élément | Téléphone / tablette | Bureau |
|---|---|---|
| Accueil des rubriques | Grille de cartes, généralement 2 colonnes; cartes d’au moins **136 px** sur compact | Navigation latérale **224 px** et contenu défilant |
| Carte de rubrique | Icône **44 × 44 px**; titre latin **13,6 px**, hint **11,5 px**; texte arabe environ **15,7 / 12,5 px** | Deux ou trois colonnes selon la largeur disponible |
| Onglets de catégorie en vue page | Cible **44 px** de haut; libellé latin **13 px**, arabe **14 px**; bande horizontale défilante | Même navigation, indicator animé |
| Titre de section | **15 px** téléphone, **16 px** plus large | Encre principale, graisse 600 |
| Aide de section | **12 px** téléphone, **13 px** plus large | Texte secondaire |
| Libellé de ligne | **14 px**; aide **12–13 px** | Alignement naturel, ligne minimale **48 px** |
| Champ / choix | Hauteur minimale **44 px**, rayon **12 px**, texte **14 px**; saisie **16 px** sur mobile | Fond de formulaire neutre |
| Boutons d’action / choix | Hauteur minimale **44 px**, texte **14 px** | Fond neutre; choix actif encre + fond légèrement teinté |
| Enregistrement de profil | Deux boutons côte à côte dans le pied, chacun **44 px** minimum | Pied fixe seulement si le profil a changé |

Les sections sont des cartes bordées de rayon 16 px sur téléphone; padding **14 × 15 px**. Au bureau, l’inset du contenu de la modale Paramètres est **24 px**; au téléphone il descend à **14 px**. La coque de Paramètres est limitée à **58 rem** de large; sur grand écran, hauteur maximale **760 px** ou `86dvh`. La règle locale compacte prévoit `82dvh`, mais sur téléphone elle est remplacée par le plein écran du socle commun; sur tablette, la présence de la navigation intégrée déclenche aussi la présentation immersive.

**Couleurs :** coque et cartes pierre neutre; sélection de catégorie en vert émaillé `#285b50` (clair) ou `#9bcabb` (sombre). L’icône reste neutre tant qu’elle n’indique pas un état. Les actions de destruction suivent le rouge sémantique.

**Mouvement :** changement de section 180 ms avec translation verticale de 4 px et fondu; onglet actif déplacé avec spring Framer Motion (`stiffness 420`, `damping 34`); bande d’onglets défile pour révéler l’onglet sélectionné sans déplacer la page. « Réduire les animations » supprime ces effets.

Références : [`src/features/settings/ConfigModal.tsx`](src/features/settings/ConfigModal.tsx), [`src/features/settings/settingsModal.css`](src/features/settings/settingsModal.css), [`src/styles/settings-hub.css`](src/styles/settings-hub.css), [`src/features/settings/components/SettingsPrimitives.tsx`](src/features/settings/components/SettingsPrimitives.tsx).

### 4.5 Aide

| Zone / élément | Téléphone (taille CSS locale) | Autres valeurs |
|---|---:|---:|
| Titre | 19 px; **18 px** jusqu’à 380 px de largeur | 22 px latin, 24 px arabe |
| Sous-titre | 11,5 px | 12 px |
| Recherche | Hauteur minimale **44 px**, texte **13 px**, icône **18 px** | Bouton d’effacement **44 px** |
| Question repliée | **14 px**, cible de ligne **48 px** | Arabe **15 px** |
| Résumé / réponse | **13 px**, interligne 1.65–1.75 | Arabe **14 px** |
| Titre de sous-rubrique | **13,5 px** | Arabe **14,5 px** |
| Crédit | **10 px** | Centré en bas du contenu |
| Panneau de contenu | Liste verticale défilable; une question ouverte à la fois | Recherche et en-tête ne défilent pas avec les réponses |

Couleurs dédiées : encre `#292e2a`, secondaire `#606862`, surface `#fdfcf9`, survol `#f0f3ed`, accent vert émaillé; adaptation sombre en encre `#e5e9e3`, secondaire `#b4bcb5`, surface `#2b302c`.

**Mouvement :** réponse ouverte en 200 ms (fondu + translation de 3 px); signe `+` tourné de 45° en 220 ms; pression de question `scale(.995)` en 150 ms. L’ancre ciblée par la recherche défile doucement, sauf réduction de mouvement.

**Attention de mesure :** `guide.css` contient encore des règles compactes de fenêtre (94vw et hauteur de 76dvh, coins 28 px). Toutefois, Aide est rendue avec `mobilePresentation="dialog"` et le socle partagé impose une présentation plein écran jusqu’à 767 px avec des propriétés `!important`. Ce relevé retient donc la règle partagée comme comportement effectif à vérifier dans le navigateur, et signale les règles compactes comme divergence de CSS.

Références : [`src/features/guide/GuideModal.tsx`](src/features/guide/GuideModal.tsx), [`src/features/guide/guide.css`](src/features/guide/guide.css).

### 4.6 Connexion et onboarding

**Connexion :** largeur maximale du contenu **560 px**, formulaire **400 px**; titre **30 px** (29 px téléphone); description **14 px** (13 px téléphone); champs et CTA **52 px** de haut, champ **16 px**; boutons Google **52 px**; liens au moins **44 px**. En-tête limité à 1000 px; logo **34 px**.

**Onboarding :** en-tête collant avec flou de 18 px; sélecteurs de langue et thème **44 × 44 px**; titre `clamp(26px, 4vw, 36px)`; étapes **11 px**, pastille de progression **24 px**; carte de cycle au moins **86 px**; illustrations jusqu’à **144 px**. Le flux comprend quatre étapes (cycles, matières, classes, horaires). Les choix actifs utilisent une teinte neutre et un contour, sans couleurs saturées concurrentes.

**Mouvement :** transitions de vue 280 ms et révélation 220 ms; choix pressé à `scale(.98)`; sélection de langue/thème en spring (`500 / 32`); validation d’étape en 200 ms. Les transitions sont retirées avec `prefers-reduced-motion`.

Références : [`src/features/auth/auth-layout.css`](src/features/auth/auth-layout.css), [`src/features/auth/authMotion.css`](src/features/auth/authMotion.css), [`src/styles/onboarding.css`](src/styles/onboarding.css), [`src/features/dashboard/onboarding/OnboardingShell.tsx`](src/features/dashboard/onboarding/OnboardingShell.tsx).

## 5. Socle dimensionnel et animation des modales

### Tailles structurelles communes

| Zone | Bureau | Compact |
|---|---|---|
| Fenêtre de dialogue classique | Largeur `calc(100vw - 32px)` avant limite propre au composant; hauteur au contenu; hauteur max viewport moins **32 px**; rayon **22 px** | Sous 768 px, présentation immersive par défaut : largeur et hauteur du viewport visible, coins carrés, sans ombre |
| En-tête standard | Hauteur minimale **64 px**, padding **16 × 22 px** | Hauteur minimale **56 px**, padding **12 × 16 px**; fermeture réservée à droite/gauche |
| En-tête en paysage très bas | — | Sous 500 px de hauteur : min-height **52 px**, padding vertical **8 px** |
| Titre commun de fenêtre | **15 px**, graisse 600, interligne 1.4 | Même taille sauf surcharge métier |
| Description de fenêtre | **13 px**, interligne 1.5 | Même règle; contraste secondaire |
| Corps | Padding **16 × 22 px**, défile indépendamment | Padding **14 × 16 px**; champs tactiles en **16 px** |
| Pied | Padding vertical **12 px**, horizontal **22 px**, espacement **10 px** | Horizontal **16 px**, gap **8 px**, safe area inférieure |
| Bouton de fermeture | **44 × 44 px**, rond; icône **16 px** | Même cible; remonte au-dessus de la safe area |
| Poignée de sheet | Zone **24 px**; barre **38 × 4,5 px** | Masquée dans la vraie présentation plein écran |

Le socle de feuille accepte une hauteur maximale paramétrée (par défaut **94 %** du viewport visible), un défilement interne, une navigation inférieure et une gestion de focus/couches. Le maximum est compris entre 50 % et 96 %. Les alertes courtes portant `data-modal-alert` restent des dialogues et ne deviennent pas plein écran.

### Largeurs des presets `maxWidth`

Les presets correspondent aux classes `sm:max-w-*` appliquées à partir du breakpoint de 640 px. Les limites indiquées sont celles des classes Tailwind; un composant peut les remplacer par sa propre classe.

| Prop | Limite de largeur |
|---|---:|
| `xs` | 24 rem / 384 px |
| `sm` | 28 rem / 448 px |
| `md` | 36 rem / 576 px |
| `lg` | 42 rem / 672 px |
| `xl` | 48 rem / 768 px |
| `2xl` | 56 rem / 896 px |
| `3xl` | 64 rem / 1024 px |
| `4xl` | 72 rem / 1152 px |
| `5xl` | 80 rem / 1280 px |
| `full` | 96vw |

### Motion du socle

- Voile : entrée **200 ms**, sortie **180 ms**; flou/saturation décoratifs sans animer le filtre.
- Dialogue : entrée **260 ms**, translation verticale **14 px**, échelle `.985 → 1`; sortie **180 ms**, translation **8 px**, échelle `.99`.
- Présentation immersive : montée de **18 px**, entrée **260 ms**; en-tête et pied collants avec verre dépoli.
- Feuille tactile : transition de **260 ms**, courbe `[.22, 1, .36, 1]`; seuil de fermeture par glissement **0,38**, seuil de vitesse **650 px/s**.
- Bouton de fermeture : rotation 90° au survol, pression `scale(.94)`.
- Haptique d’ouverture/fermeture géré par le composant partagé; la pile de modales gère focus et z-index.

### Fenêtres courtes de confirmation

`ConfirmDialog` utilise une largeur `calc(100vw - 32px)`, limitée à **448 px** (`max-w-md`), hauteur ajustée au texte et rayon **24 px**. Le titre mesure **17 px** (19 px au breakpoint sm); description **13 px** (13,5 px sm). Icône **20 px** dans une zone **32 px**. Le bouton destructive suit la couleur d’erreur; une suppression importante peut exiger la saisie de la phrase de confirmation. Ces alertes restent compactes sur téléphone.

Référence : [`src/components/ui/confirm-dialog.tsx`](src/components/ui/confirm-dialog.tsx).

## 6. Inventaire des modales métier

Les largeurs ci-dessous sont les contraintes de bureau déclarées. Sous 768 px, le socle plein écran prévaut pour les fenêtres métier et les choix locaux de hauteur maximale. Les alert dialogs restent compacts; certains sheets gardent leur hauteur ajustée sur tablette tactile.

| Modale / usage | Largeur au bureau | Zones, niveaux de texte et choix |
|---|---:|---|
| Actions de classe (`⋮`) | Jusqu’à **448 px** | Titre **15 px**; grille **2 colonnes**; tuiles 80–128 px; icônes **36 px**; hauteur demandée de 72 % sur tablette compacte, remplacée par le plein écran sous 768 px; actions Évaluations, Modifier, Supprimer |
| Création / modification de classe | **448–632 px** à partir de 720 px (`clamp(28rem, 54vw, 39.5rem)`) | Parcours en étapes; titre via style claude-sheet **16 px**; sous-titre **12,5 px**; CTA en pied; suppression en rouge |
| Attribution de date / remarque | Jusqu’à **576 px** (`sm:max-w-xl`) | Titre **16 px**, puis **17 px**; compteur **11 px**; CTA 40–44 px déclaré, jamais inférieur à la cible commune **44 px**; fond de formulaire semi-opaque |
| Ajouter / modifier un contenu de cahier | Sélection jusqu’à **896 px**; formulaire jusqu’à **576 px** | Titre **16/17 px**; point d’insertion **13,5 px** et contexte **12,5 px**; catégories en grille 2 colonnes; bouton « insérer » hauteur **44 px** minimum |
| Gérer les leçons / numérotation | Jusqu’à **768 px** (`sm:max-w-3xl`) | Titre **16/18 px**, icône **40 px**; sous-sections **12/14 px**; champs déclarés **40 px**, mais le socle tactile fixe **44 px minimum**; pied avec Enregistrer |
| Import / export de cahier | Jusqu’à **672 px** (`sm:max-w-2xl`) | Segmented 2 choix; titre **16/18 px**; description **12 px**; périmètres « tout / sélection » en grille à partir de sm; CTA de transfert |
| Impression | Jusqu’à **768 px** (`sm:max-w-3xl`) | Titre **16/18 px**; sélecteur de mode 2 ou 3 colonnes; descriptions **12–14 px**; aperçu d’impression à largeur **220 px**, papier **196 px**; compteur **10–13 px** |
| Analyse / progression | Jusqu’à **768 px** (`xl` preset) | Progression en pourcentage avec police mono **12/14 px**; titres de tuile **12 px**; avertissements ambre **12 px**, date mono **10 px**; liste d’alertes limitée à `min(30dvh, 224 px)` |
| Date d’événement d’évaluation | Jusqu’à **448 px** (`sm`) | Date et période; titre selon la feuille partagée; aperçu **12/13 px**, ISO **11 px**; deux actions de pied, chacune **44 px** |
| Espace des évaluations de classe | Jusqu’à **1152 px** (`4xl`) | Voir la section 4.3; contexte classe en description; hauteur de sheet demandée à 96 % en compact, plein écran sous 768 px |
| Document d’évaluation | Jusqu’à **1024 px** (`3xl` preset) | Prévisualisation/document sur surface dédiée; champs **44 px**, texte de saisie **16 px** sur mobile |
| Revue / suivi d’élèves | Jusqu’à **896 px** si suivi (`2xl`), sinon **672 px** (`lg`) | Contenu enfant sur le socle des évaluations; contrôles conservant leurs libellés et cibles |
| Import des données de plateforme | Jusqu’à **672 px** (`sm:max-w-2xl`) | Flux d’import, aperçu et résultats; couleurs d’état sémantiques |
| Installation PWA | Jusqu’à **448 px** sur grand écran; plein écran sous **768 px** (`mobilePresentation="dialog"`) | Titre avec icône **40 × 40 px**; onglets iOS/Android; étapes **12 px**, numéros **24 × 24 px**; CTA en pied au moins **44 px** |
| Conversation enseignant | Jusqu’à **672 px** (`lg`) | Fil de messages et actions de réponse; texte hérité de l’interface et de la locale |
| Modales de confirmation imbriquées | Jusqu’à **448 px** | Règles compactes de la section 5; focus ramené à la modale parente ou à son déclencheur |

Références principales : [`src/features/editor/EditorModals.tsx`](src/features/editor/EditorModals.tsx), [`src/features/editor/modals/AssignDateModal.tsx`](src/features/editor/modals/AssignDateModal.tsx), [`src/features/editor/modals/ContentModal.tsx`](src/features/editor/modals/ContentModal.tsx), [`src/features/editor/modals/DataTransferModal.tsx`](src/features/editor/modals/DataTransferModal.tsx), [`src/features/editor/modals/ManageLessonsModal.tsx`](src/features/editor/modals/ManageLessonsModal.tsx), [`src/features/editor/modals/PrintModal.tsx`](src/features/editor/modals/PrintModal.tsx), [`src/features/dashboard/modals/CreateClassModal.tsx`](src/features/dashboard/modals/CreateClassModal.tsx), [`src/features/evaluations/components/EventDateModal.tsx`](src/features/evaluations/components/EventDateModal.tsx), [`src/features/assistant/PwaInstallModal.tsx`](src/features/assistant/PwaInstallModal.tsx).

## 7. Couleurs et mouvements par composant

| Composant | Couleurs de surface et de texte | Motion / retour |
|---|---|---|
| Carte de classe | Palette propre à la classe; encre de titre et secondaire dérivées de cette palette; statut « maintenant » rose doux | Spring jusqu’à 300 ms; léger changement de rayon; interaction haptique de sélection |
| Carte de rubrique Paramètres | Carte neutre, bordure fine; teinte de rubrique sur l’icône et le marqueur, pas sur tout le panneau | Élévation légère au survol; sélection d’onglet en spring |
| Carte action de modale | Surface carte et bordure neutre; icône sur pastille légère; l’action destructive reste rouge | Pression compacte; feuille tactile glissable |
| Champs | Fond `background` ou `background/90`, bordure `border`; focus primaire translucide | Transition de couleur, aucun mouvement de layout |
| Aide accordéon | Surface crème/pierre, filet fin; vert émaillé pour focus et état ouvert | 180–220 ms, contenu dévoilé seulement après ouverture |
| Évaluation | Fond de carte faiblement teinté; badges de succès vert et d’alerte rouge/ambre | Ligne 160 ms, action 150 ms, pression `scale(.92)` |
| Bottom navigation | Gris clair translucide; texte secondaire; bleu uniquement pour l’état actif | Icône active `scale(1.12)`; pression `scale(.92)` |
| CTA | Primaire et texte contrasté; destructive rouge | Pression courte; retour succès avec coche lorsque le composant le prévoit |
| Voile de modale | Scrim lié à l’encre, flou 12 px (8 px sur petit écran) | Fondu 200/180 ms; la réduction de transparence retire le flou |

## 8. Portée, méthode et règles de lecture

Ce relevé couvre les principaux écrans enseignants, les six catégories Paramètres, les modales métier qui y sont reliées, les dialogues d’évaluation, les overlays de navigation et les panneaux de gestion de l’administration. Les états vides, les erreurs, les confirmations, les sous-vues d’un même modal et les principales variations téléphone/tablette/bureau sont décrits séparément lorsqu’ils changent le contenu ou la hiérarchie.

- Les dimensions sont celles des déclarations CSS/React trouvées dans le dépôt, pas des pixels relevés sur un appareil. Une classe utilitaire peut être surchargée par une feuille CSS plus spécifique ou par le breakpoint partagé.
- La taille d’un composant enfant n’est pas nécessairement la taille de sa fenêtre. Les limites de hauteur internes (liste, aperçu, calendrier) sont signalées comme telles.
- Les noms de couleurs comme `primary`, `card`, `muted`, `border` et `destructive` sont des tokens; leur valeur effective vient du thème actif.
- « Téléphone » désigne ici les règles jusqu’à 639 px; « compact » inclut aussi le traitement tactile/tablette du composant Modal. Pour les règles globales, le point de bascule plein écran est 767 px, et Paramètres/Aide ont un traitement immersif dédié sur tablette jusqu’à 1023 px lorsqu’elles portent la navigation intégrée.
- Les fiches ci-dessous privilégient la hiérarchie et le rendu visible. Les conditions de données, la validation, les confirmations et la conservation des saisies sont incluses quand elles modifient l’expérience; elles ne remplacent pas la lecture du code source.

## 9. Paramètres — détail des six rubriques

### 9.1 Coque et accueil des rubriques

`ConfigModal` propose six rubriques — Emploi du temps, Absences, Profil, Apparence, Notifications et Compte — plus un raccourci Aide. Sur téléphone/tablette, l’accueil est une grille de cartes à deux colonnes; la dernière carte peut prendre toute la largeur. Sous 640 px, la grille réduit son padding à environ 12 px et garde des cartes adaptées au toucher. Jusqu’à 1023 px, les cartes ont un minimum d’environ 136 px (`8.5rem`), une icône de 44 px, un titre de 13,6 px (arabe ~15,7 px) et un sous-titre de 11,5 px (arabe ~12,5 px). À partir de 1024 px, la navigation passe dans un rail latéral de 224 px et seul le panneau de droite défile.

Chaque sous-page reprend un titre dans l’en-tête du modal, un bouton de retour au niveau de la grille, puis un contenu vertical défilant. Le titre n’est pas répété visuellement dans le panneau. Le pied « Réinitialiser le brouillon / Enregistrer le profil » apparaît uniquement quand les champs de Profil ont changé; l’abandon déclenche une confirmation destructive. Les autres rubriques appliquent leurs changements directement. L’aide et la barre mobile restent dans le périmètre de focus du modal.

Les panneaux `SettingsSection` ont un rayon de 16 px (`rounded-2xl`), un contour léger, fond `card`, padding 16 px au téléphone, 20 px dès `sm`, 24 px dès `md`. Leur titre est 15–16 px, avec une icône primaire de 20 px; l’aide est 12–13 px. Les lignes ont au moins 48 px, un libellé de 14 px et une aide de 12–13 px. Les commandes communes font au moins 44 px de haut. Une ligne étroite empile son libellé au-dessus du contrôle au lieu de compresser le texte.

### 9.2 Emploi du temps

- **Ordre visuel :** choix de période (« matin / après-midi / journée »), indication d’une classe suggérée ou état d’encouragement, puis grille hebdomadaire. En l’absence de classes, la grille peut proposer de créer une classe depuis un créneau.
- **Grille :** nom du jour sur une colonne sticky de 84 px; ligne d’en-tête des heures de 40 px; cellules d’au moins 46 px, avec zone de sélection transparente d’au moins 44 px. Les séances contiguës se fusionnent en une seule cellule et portent leur durée; le point de pause déjeuner est marqué par un séparateur.
- **Largeurs :** grille minimale 260 px pour les vues matin/après-midi et 640 px pour la journée complète; à moins de 480 px, ces minima passent à 416 px et 704 px. Le tableau défile horizontalement dans un cadre arrondi de 16 px plutôt que d’écraser les libellés.
- **Carte de créneau :** fond neutre avec teinte de palette de la classe, bordure fine, nom centré (13 px, arabe 14 px) et métadonnées matière/heure en 11 px; la couleur reste une aide à la lecture, non un fond fortement saturé.
- **Interaction :** le choix de période utilise trois onglets à cibles de 44 px. Une modification déclenche un toast bref. Une classe suggérée absente de la grille est nommée avant la consigne de placement.

Références : [`ScheduleTab.tsx`](src/features/settings/components/ScheduleTab.tsx), [`schedule.css`](src/features/settings/components/schedule.css).

### 9.3 Absences administratives

La rubrique commence par les périodes déjà saisies, en liste compacte sur fond `muted/50`, puis le formulaire d’ajout. Chaque élément montre les dates de début/fin au format local, le motif éventuel en texte secondaire et une suppression de 44 × 44 px. L’état vide n’ajoute pas de carte décorative : le formulaire d’ajout, immédiatement disponible, est l’action principale.

Le formulaire place début et fin en deux colonnes à partir de 640 px, en une colonne sur téléphone; le motif optionnel prend une ligne entière. Les dates ont une hauteur CSS de 50 px, le libellé et le champ sont espacés de 10 px, et le bouton Ajouter a au moins 48 px. Une fin antérieure au début déclenche un statut d’erreur accessible et désactive la validation. Une fin absente est ramenée à la date de début lors de l’enregistrement.

Références : [`AbsencesTab.tsx`](src/features/settings/components/AbsencesTab.tsx), [`absencesTab.css`](src/features/settings/components/absencesTab.css).

### 9.4 Profil professionnel et établissement

Le contenu est séparé en deux sections :

1. **Profil :** nom de l’enseignant et téléphone (grille une colonne puis deux à `sm`); sélection de matières sous forme de pastilles à coche. Six matières sont visibles par défaut, avec un contrôle « voir plus / voir moins » qui révèle la liste complète.
2. **Établissement :** choix combiné des cycles (Collège, Lycée, Prépa), nom de l’établissement, académie et province/direction. Les cycles sont en une colonne sur téléphone puis trois colonnes à `sm`; académie et province passent en deux colonnes à `sm`. La province reste désactivée tant qu’aucune académie n’est choisie.

Les champs suivent les primitives de Paramètres (44 px minimum, rayon 12 px, bordure `border`, fond `background/90`). Les choix sélectionnés utilisent un fond très légèrement teinté par l’encre et une coche primaire, et non une carte colorée pleine surface. Ces changements restent dans un brouillon tant que l’utilisateur n’a pas activé Enregistrer; réinitialisation et abandon sont des actions distinctes.

Référence : [`ProfileTab.tsx`](src/features/settings/components/ProfileTab.tsx).

### 9.5 Apparence

Trois groupes à choix exclusif, avec une hiérarchie titre → commande → aperçu :

- **Thème :** Clair, Sombre, Système; grille de deux colonnes (le troisième choix se replie dans sa cellule). Action de restauration des valeurs par défaut dans l’en-tête de section.
- **Taille du texte :** quatre niveaux `sm / md / lg / xl`, illustrés par un exemple bilingue latin/arabe à 15,0 / 16,8 / 18,9 / 20,8 px (`0.94 / 1.05 / 1.18 / 1.3rem`). Grille de deux colonnes, avec nom de taille secondaire sous l’échantillon.
- **Langue :** Français et العربية, chacune dans une cible d’au moins 44 px.

Les icônes restent fines et neutres au repos; le choix actif est annoncé par `aria-pressed`, bordure/fond, sans animation de layout. Les changements de thème, taille et langue sont appliqués en direct.

Référence : [`AppearanceTab.tsx`](src/features/settings/components/AppearanceTab.tsx).

### 9.6 Notifications et rappels

Trois sections structurent la page :

1. **Cet appareil :** état d’autorisation et de livraison, activation/désactivation, test, accès aux réglages natifs et demandes d’autorisations de batterie/alarme selon la plateforme. Une erreur ou une désactivation à terminer est annoncée dans un bloc de statut.
2. **Rappels :** activation globale, vibration, rappel avant la fin (1/2/5/10 minutes), rappel en l’absence de date (1/5/10/15/30 minutes), mode calme pendant les vacances. Les sélecteurs dépendants sont désactivés lorsque leur parent l’est.
3. **Seuils d’alerte :** retard (1/2/3 séances) et inactivité (3/5/10 jours).

Chaque interrupteur est une ligne avec icône de 18 px, nom, libellé textuel Activé/Désactivé et switch; l’état ne repose donc pas sur la couleur seule. Les sélecteurs sont alignés à droite avec une largeur minimale de 104 px et les rangées gardent des cibles tactiles. Le bloc repliable « À savoir » explique quatre catégories (retard, fin de séance, absence de date, message administratif), puis les limites des notifications natives iOS/Android et du badge d’icône. L’activation d’une vibration donne un retour haptique système lorsque disponible.

Références : [`NotificationsTab.tsx`](src/features/settings/components/NotificationsTab.tsx), [`NotificationControls.tsx`](src/features/settings/components/NotificationControls.tsx), [`PushActivationCard.tsx`](src/features/settings/components/PushActivationCard.tsx), [`settings-hub.css`](src/styles/settings-hub.css).

### 9.7 Compte, sauvegardes et archives

Le panneau Compte assemble, dans cet ordre, la session du compte (identité et déconnexion), la synchronisation (état, dernière synchronisation et action « synchroniser maintenant »), la sauvegarde (exporter / importer), un lien vers l’administration, puis les archives annuelles. Un spinner est réservé à la synchronisation en cours; les états synchronisé, en attente, hors ligne et erreur ont une pastille sémantique ou un texte de dernière synchronisation.

**Import de sauvegarde :** la fenêtre dédiée (largeur max locale 672 px) reçoit un fichier JSON, vérifie sa taille, en montre un résumé avant toute restauration et exige une case de confirmation pour une opération irréversible. Pendant la lecture, les erreurs de taille, de format, de lecture et de restauration ont des messages séparés; le CTA destructif et la fermeture sont bloqués pendant l’import.

Une archive est une ligne avec année scolaire, nombre de classes, taille et date de création, suivie de deux cibles d’icône de 44 px : télécharger et supprimer. L’état vide montre une icône d’archive de 28 px et un titre calme, tandis que le bouton de création reste dans l’en-tête de section. La suppression passe par `ConfirmDialog`; le téléchargement et la création produisent un toast de succès ou d’erreur explicite.

Références : [`AccountDataTab.tsx`](src/features/settings/components/AccountDataTab.tsx), [`AccountTab.tsx`](src/features/settings/components/AccountTab.tsx), [`ArchivesSection.tsx`](src/features/settings/components/ArchivesSection.tsx), [`ImportPlatformModal.tsx`](src/features/settings/ImportPlatformModal.tsx).

## 10. Classes — parcours de création et édition détaillé

### 10.1 Création guidée

La fenêtre utilise la présentation sheet sur compact et une largeur bureau de `clamp(448px, 54vw, 632px)` à partir de 720 px. Le corps est le seul panneau défilant; le pied d’action reste collé à la base. Le titre est aligné au début, icône de 44 px, police Readex Pro 700 et taille fluide d’environ 19–23 px; le sous-titre d’édition est 12,5 px. L’en-tête reçoit un voile pastel discret correspondant à la couleur de classe choisie.

Le nombre d’étapes est dynamique :

1. **Cycle** si plusieurs cycles sont plausibles; les cycles usuels du profil apparaissent en premier. Si le choix est caché, le lien « autre cycle » permet de l’ouvrir à la demande.
2. **Niveau :** choix des niveaux officiels (Collège) ou des groupes de niveau (Lycée/Prépa). Le mode niveau personnalisé remplace cette liste par un champ.
3. **Filière / branche** uniquement lorsque le groupe de niveau se décline en plusieurs filières.
4. **Détails :** carte-récapitulatif de la classe, groupe, matière si nécessaire et sélecteur de couleur.

Le stepper affiche un circuit horizontal de nœuds numérotés; étapes précédentes accessibles, étape active annoncée comme telle, étapes terminées cochées. Chaque carte de choix a une cible tactile d’au moins 54 px, un fond de surface neutre et un indicateur de sélection. Le groupe de classe utilise un stepper − / nombre / +; saisie numérique limitée à deux caractères et message d’erreur en ligne. Le champ de matière n’est pas répété si le profil ne propose qu’une seule matière.

La palette classe comporte six choix : Rose, Violet, Bleu, Vert, Sable et Orange. Elle apparaît sous forme de swatches ronds d’environ 32 px dans des zones de choix d’au moins 44 px; la sélection est indiquée par un anneau et une coche. L’accent du récapitulatif prend la nuance associée. En sombre, ces teintes deviennent des surfaces profondes et des textes pastel lisibles.

Le pied présente Retour lorsque le parcours le permet, puis Continuer / Créer; en mode édition, Enregistrer et éventuellement Supprimer. Le bouton Supprimer demande une seconde activation dans le pied, puis une confirmation destructive avec la phrase de classe. Un état de sauvegarde désactive les commandes et bloque la fermeture. Les erreurs sont affichées sans vider les saisies.

### 10.2 Modification et liste des élèves

L’édition possède deux onglets : **Identité** et **Élèves**. Identité contient cycle, niveau (officiel ou personnalisé), groupe, matière conditionnelle, erreurs et couleur. Les champs/selecteurs ont 52 px pour cycle/niveau/matière, 44 px pour les commandes usuelles, et un rayon de 14 px pour les grands champs.

Élèves contient une aide courte, un compteur vivant, deux modes **Liste / Édition**, une barre de progression calculée sur une référence visuelle de 60 élèves, une zone texte de cinq lignes et un aperçu numéroté. Une liste historique suggérée peut être importée si le champ est vide. Le parseur normalise les noms et annonce une limite dépassée; la sauvegarde n’est activée que si la liste a réellement changé. Fermer avec un brouillon d’élèves ouvre un dialogue de confirmation pour écarter ou conserver l’édition.

### 10.3 Style du grand fichier CSS

Le fichier de style (1 152 lignes au relevé) comprend plusieurs générations de sélecteurs; l’interprétation du rendu doit donc suivre les règles les plus tardives et les surcharges du socle modal. Les tokens locaux principaux sont `--hero-bg`, `--hero-border`, `--hero-ink`, `--hero-secondary`, `--cm-surface`, `--cm-border` et `--cm-accent`. La surface est claire, neutre, bordée; les six teintes de classe colorent surtout le bandeau, la pastille et le récapitulatif. Le mode sombre garde une surface de carte et assombrit chaque accent.

Le header utilise un dégradé vertical pastel vers transparent; le bouton de fermeture garde 44 px; le corps défile; les actions restent sticky. Le stepper, les boutons et les swatches utilisent des transitions de 150–350 ms et une entrée de contenu de 320 ms avec un déplacement de 10 px. `prefers-reduced-motion` coupe ces transformations et animations. Sous 480 px, le padding horizontal tombe à 16 px et les choix gardent une hauteur minimale de 54 px.

Références : [`CreateClassModal.tsx`](src/features/dashboard/modals/CreateClassModal.tsx), [`createClassModal.css`](src/features/dashboard/modals/createClassModal.css), [`ClassCreationProgress.tsx`](src/features/dashboard/modals/ClassCreationProgress.tsx), [`ClassRosterFields.tsx`](src/features/dashboard/modals/ClassRosterFields.tsx).

### 10.4 Menu d’actions de classe

Le bouton `⋮` (cible 44 px) ouvre une feuille compacte avec titre « Actions de la classe » et une grille de tuiles à deux colonnes : Évaluations, Modifier et Supprimer (uniquement si l’action est permise). Les surfaces sont neutres; les icônes sont dans des pastilles colorées discrètes; Supprimer utilise le ton rose/destructif. Sur tablette tactile, la feuille peut rester limitée à 72 % du viewport. Sur téléphone, la règle globale plein écran sous 768 px prévaut sur cette hauteur demandée. L’action « emploi du temps » n’est pas présente dans ce menu.

Références : [`ClassActionsMenu.tsx`](src/features/dashboard/ClassActionsMenu.tsx), [`classActionsSheet.css`](src/features/dashboard/classActionsSheet.css).

## 11. Cahier — fiches détaillées des modales d’édition

### 11.1 Date de séance et remarque (`AssignDateModal`)

Cette grande fenêtre (867 lignes TSX, 250 lignes de thème dédié) sert à deux intentions, Date et Remarque. Le bandeau contient un titre, le nombre de séances sélectionnées lorsqu’il y en a plusieurs, un badge de date cliquable et une fermeture accessible de 44 px. En intention Remarque, un sous-titre « Notes & activités » clarifie le contexte. L’en-tête et le pied sont translucides sur grand écran; l’intérieur reste une feuille neutre. Les champs libres suivent la direction de leur texte, y compris si l’interface est dans l’autre langue.

- **Remarque :** rangée « activités pédagogiques », aperçu de documents associés, bouton effacer, puis puces d’activité (devoir maison, contrôle des cahiers, remédiation, soutien, rattrapage selon la sélection) et éditeur de texte. Les puces font au moins 42 px (cible portée à 44 px par le socle), rayon 12 px; sélection vert doux (`#e6f5ee`, texte `#1a7a52`), neutre beige-gris au repos. Zone de texte de 125 px minimum, rayon 14 px, texte 15 px, interligne 1.65. Les avertissements calendrier sont en ambre et expliquent le conflit sans bloquer la saisie.
- **Date :** choix segmenté Associer / Dissocier, raccourcis Aujourd’hui, Demain, +1 semaine, +2 semaines et fin du mois, date native/calendrier, puis CTA primaire ou destructif selon l’action. Les dates sont affichées en chiffres tabulaires; après confirmation, le bouton montre un état enregistré avec coche tracée.
- **Parcours :** validation contextuelle selon emploi du temps, vacances, jours fériés, absence et conflits d’évaluation; les avertissements sont listés sous le formulaire. Le résultat peut être une seule modification ou une mise à jour groupée des dates.

Les puces ont 220 ms de transition de surface, les boutons spring `500/28`, pression autour de `.94–.97`; la coche de succès se dessine en 280 ms. Les transitions du thème remarque sont supprimées en réduction de mouvement. Couleurs sombres révisées : puce neutre `#242421`, vert en transparence, textarea `#141412`.

Références : [`AssignDateModal.tsx`](src/features/editor/modals/AssignDateModal.tsx), [`AssignDateModal.premium.css`](src/features/editor/modals/AssignDateModal.premium.css), [`paperFormModal.css`](src/features/editor/modals/paperFormModal.css).

### 11.2 Ajout / modification de contenu (`ContentModal`)

Deux étapes se partagent la même fenêtre. **Sélection** présente un bandeau de point d’insertion, puis des cartes de catégories en grille de deux colonnes : structures (chapitre, section, sous-section, sous-sous-section, item), rédaction libre, évaluations/devoirs, puis corrections. Les catégories non compatibles avec la position courante sont désactivées et expliquées. La carte fait au moins 152 px, icône 56 px, rayon 20 px; les teintes d’icône identifient la famille, mais les cartes restent sur une surface claire neutre.

**Formulaire** utilise un retour 44 × 44 px et un titre 16–17 px, affiche les champs du type choisi (titre, texte, dates, durée, etc.), puis Enregistrer/Insérer dans un pied sticky. Les éditions partagées affichent le nombre d’éléments impactés et l’action Réinitialiser n’est activée qu’en cas de changement. Le contexte cible est une ligne avec icône d’épingle 36 px et texte 12,5–13,5 px.

Les surfaces papier utilisent un mélange ivoire très légèrement teinté primaire, bordure sable, liseré supérieur et ombre modérée; en sombre, fond ardoise et liserés réduits. Les champs ont un rayon 12 px. Le contenu de document ou de math garde sa direction détectée et son formatage dédié.

Références : [`ContentModal.tsx`](src/features/editor/modals/ContentModal.tsx), [`ContentFields.tsx`](src/features/editor/modals/ContentFields.tsx), [`ContextualDescriptionEditor.tsx`](src/features/editor/modals/ContextualDescriptionEditor.tsx), [`contextualDescriptionEditor.css`](src/features/editor/modals/contextualDescriptionEditor.css), [`paperFormModal.css`](src/features/editor/modals/paperFormModal.css).

### 11.3 Attribution, numérotation et transfert

| Fenêtre | Structure et contenu détaillés | Mesures / états |
|---|---|---|
| **Gérer les leçons** | En-tête icône calques 40 px; section Numérotation avec interrupteur, trois sélecteurs (structure, style des badges, portée); accordéon de visibilité des descriptions; liste ordonnable des éléments de premier niveau avec icône, titre, type, nombre d’enfants, actions. | Jusqu’à 768 px; blocs en cartes bordées, champs visuels 40 px mais cibles augmentées par le socle tactile; pied Enregistrer inactif si rien n’a changé. Suppression d’un contenu passe par confirmation. |
| **Importer / exporter le cahier** | Segmented Importer / Exporter; Export : tout le cahier ou chapitres sélectionnés, liste cochable, sélection globale et estimation de taille. Import : fichier JSON ou texte collé, résumé du fichier, mode Remplacer / Ajouter, confirmation séparée si remplacement. | Largeur locale 672 px; chargement bloquant pendant import. Erreurs de lecture, validation et restauration sont distinctes; taille et nombre d’éléments sont annoncés. |
| **Imprimer** | Trois modes si l’historique est disponible (tout / nouveautés / dates choisies), sinon deux; dates sélectionnées, taille texte S/M/L, interligne compact/normal/aéré, visibilité des descriptions, couleur du contenu, numéros de page, en-tête première page/toutes/pages/aucun. | Fenêtre 768 px max; aperçu « imprimante » de 220 px, papier de 196 px; liste de dates limitée à 192 px; bouton Imprimer décrit le nombre de séances. Pendant l’impression, formulaire désactivé et animation de reçu. |

Références : [`ManageLessonsModal.tsx`](src/features/editor/modals/ManageLessonsModal.tsx), [`DataTransferModal.tsx`](src/features/editor/modals/DataTransferModal.tsx), [`PrintModal.tsx`](src/features/editor/modals/PrintModal.tsx), [`PrintModal.css`](src/features/editor/modals/PrintModal.css).

### 11.4 Analyse pédagogique, date à vérifier et aide à l’emploi du temps

- **Analyse / progression :** une coque, trois vues (aperçu, programme officiel, liaison chapitres-programme). L’aperçu présente un taux d’avancement en police mono, deux cartes d’accès aux vues et, le cas échéant, les alertes de calendrier. La liste d’alertes défile dans `min(30dvh, 224px)`, titres/dates et messages étant regroupés par élément. Aucune correspondance de programme donne un état neutre concis. Les vues profondes partagent une barre retour avec Paramètres.
- **Relecture de date :** icône alerte ambre de 40 px, titre 16–20 px, date localisée dans la description, liste dédupliquée des avertissements et texte d’orientation; pied Modifier / Confirmer. Confirmer est désactivé si la date n’est pas valide ou si un blocage est présent. Les boutons font 44 px minimum.
- **Nudge emploi du temps :** titre avec icône calendrier 40 px, phrase contextualisée au nom de la classe, CTA pleine largeur « Ajouter à l’emploi du temps », action secondaire « J’ai compris ». Modal volontairement non dismissable par scrim/Escape/glissement : l’enseignant choisit une des deux actions. L’invite n’est pas bloquante pour l’usage; le choix ignorer est mémorisé par classe et session.

Références : [`AnalysisModal.tsx`](src/features/editor/modals/AnalysisModal.tsx), [`DateReviewModal.tsx`](src/features/editor/modals/DateReviewModal.tsx), [`TimetableNudgeModal.tsx`](src/features/editor/modals/TimetableNudgeModal.tsx).

## 12. Évaluations de classe — fenêtres, formulaires et suivis

### 12.1 Espace « Contrôle continu et activités »

La feuille occupe jusqu’à 1 152 px sur grand écran et demande 96 % du viewport en présentation compacte; sous 768 px, le socle partagé force le plein écran. Elle autorise le swipe de fermeture et le geste depuis le corps. L’en-tête garde le titre et le contexte classe (matière seulement si utile); le corps est une seule zone de défilement. Les catégories d’évaluations et activités sont groupées selon la politique, avec panneaux accordéon. L’état vide privilégie une action de création plutôt qu’un tableau vide.

Chaque ligne garde des colonnes de date, nature, numéro, état et actions. Les entrées venant du cahier et les évaluations manuelles sont reliées; les conflits de date sont examinés avant écriture. Les documents attendus/présents et les états de remise utilisent des indications textuelles et des tons sémantiques. Sous 1024 px, les champs sont disposés sur deux lignes et l’en-tête de colonnes disparaît.

Références : [`ClassEvaluationsSheet.tsx`](src/features/evaluations/ClassEvaluationsSheet.tsx), [`DevoirsView.tsx`](src/features/evaluations/DevoirsView.tsx), [`evaluationReference.css`](src/features/evaluations/evaluationReference.css), [`evaluationsBoard.css`](src/features/evaluations/evaluationsBoard.css), [`evaluationsResponsive.css`](src/features/evaluations/evaluationsResponsive.css).

### 12.2 Modales métier montées par la feuille

| Fenêtre | Contenu et hiérarchie |
|---|---|
| **Ajouter / modifier un devoir manuel** | Fenêtre 576 px max; titre 15–16 px et contexte classe 11–12 px. Type de devoir, semestre, numéro, date, durée facultative; le formulaire choisit le prochain numéro dans le semestre, empêche les doublons et adapte les types au cycle de classe. Les erreurs apparaissent près du formulaire. |
| **Date d’activité / de devoir** | Feuille calendrier `EventDateModal`, jusqu’à 448 px; aperçu de date en texte 12–13 px + valeur ISO 11 px; éventuel choix date unique/plage; raccourcis dates rapides, sélecteur année/mois, grille hebdomadaire et pied Effacer/Appliquer. Le pied est fixe, la grille reste accessible au clavier et en RTL. |
| **Absents** | Dialog de suivi sans état par élève; liste d’élèves filtrable/ajoutable, recherche, gestion depuis la classe, copie de la liste de rapport, vider et enregistrer. |
| **Revue des élèves / cahiers** | Avec suivi actif, largeur `2xl` (896 px); recherche/filtre et liste d’élèves; choix de condition par élève (acquis / en cours / à accompagner, ou état du cahier), compteur, restauration d’éléments supprimés, copie du rapport et actions annexes repliables. |
| **Évaluation orale / colle** | Même feuille élève; état individuel et, si la politique le permet, note sur 20. Le titre indique Oral, Colle ou suivi commun; les notes et états existants des élèves conservés sont préservés lors d’une modification partielle. |
| **Remise de devoir maison** | Liste des élèves, états rendu/non rendu, compteur résumé, barre de progression et action « tous rendus »; la remise est liée au devoir maison précis et à son contexte de classe. |
| **Document d’évaluation** | Fenêtre jusqu’à 1 024 px, onglets Aperçu / Source plutôt que deux colonnes. Source en monospace 13 px avec compteur et aide de syntaxe; aperçu sur une feuille bornée à 896 px. Le pied propose impression et sauvegarde. Un conflit d’édition ouvre une confirmation de conservation du brouillon. |
| **Confirmations** | Suppression de devoir, activité ou correction; le titre cite l’élément concerné et les suppressions significatives exigent une phrase de confirmation. Une correction de devoir maison peut être supprimée seule, sans supprimer le devoir. |

Les dialogues de suivi sont composés par un même cadre `StudentReviewDialog`; titre en serif 16–17 px, contexte en sans-serif 12,5–13 px. Pour un suivi élève, le corps de liste est une pile flex avec scroll interne; les actions de pied restent visibles. Les couleurs de statut sont explicites : vert pour acquis/rendu, ambre pour en cours/à accompagner, bleu pour certains suivis, rouge pour absent/suppression; en mode sombre, les versions sont assombries et le texte est éclairci.

Fichiers principaux : [`DevoirsModals.tsx`](src/features/evaluations/components/DevoirsModals.tsx), [`ManualAssessmentEditor.tsx`](src/features/evaluations/components/ManualAssessmentEditor.tsx), [`EventDateModal.tsx`](src/features/evaluations/components/EventDateModal.tsx), [`StudentReviewDialog.tsx`](src/features/evaluations/components/StudentReviewDialog.tsx), [`StudentNamesEditor.tsx`](src/features/evaluations/components/StudentNamesEditor.tsx), [`NotebookConditionList.tsx`](src/features/evaluations/components/NotebookConditionList.tsx), [`notebookTracking.css`](src/features/evaluations/components/notebookTracking.css).

### 12.3 Palette de commandes et aperçu de document

La palette de commandes est un overlay distinct de la coque Modal, largeur maximale 576 px, positionnée à 64 px du haut (96 px dès `sm`). Champ de recherche dans l’en-tête avec icône 36 px, résultats scrollables jusqu’à 440 px, chaque résultat présentant icône 34 px, titre 14 px, sous-titre 12 px et éventuel badge mono 10 px. Pied d’aide clavier (↑/↓/Entrée); surface `popover/95`, blur `backdrop-blur-xl`, bordure fine. Aucun résultat affiche un message et une consigne de recherche.

Les aperçus professeur et direction utilisent la même composition de document. La page est centrée et limitée à 896 px, dans un cadre `card` bordé; le contenu garde sa direction arabe/latine détectée. L’aperçu professeur propose Imprimer/Fermer dans le pied; celui de la direction est lecture seule, défile jusqu’à 60vh et affiche un état vide si aucune source n’existe.

Références : [`CommandPalette.tsx`](src/components/ui/CommandPalette.tsx), [`DocumentPreview.tsx`](src/components/documents/DocumentPreview.tsx), [`AdminDocumentPreview.tsx`](src/admin/components/AdminDocumentPreview.tsx).

## 13. Administration — pages de gestion et dialogues

Les écrans ci-dessous ne font pas partie du parcours quotidien enseignant, mais partagent les mêmes tokens et le même socle de modales.

### 13.1 Détail enseignant

La page longue organise le profil d’un enseignant en panneaux/onglets de synthèse, classes, élèves et évaluations. La zone « Classes attribuées » affiche le titre, une action Ajouter, des cartes par classe avec matière et séances/semaine, puis des actions de configuration, liste d’élèves, import/export et aperçu. L’état vide présente une icône de livre, le texte « Aucune classe attribuée » et le CTA d’ajout.

Le détail peut ouvrir :

- **Message à l’enseignant** : modal jusqu’à 672 px, objet limité à 80 caractères, message limité à 1 200 caractères et sept lignes de textarea; envoi bloqué si vide ou en cours.
- **Création / édition de classe** : réutilise le parcours enseignant et ses validations.
- **Blocage / déblocage de compte**, **suppression de compte**, **suppression de classe** : ConfirmDialog compact. Les suppressions indiquent clairement que les données cloud seront effacées.
- **Impression** : réutilise PrintModal, sans historique de séances imprimées exposé à la direction.
- **Liste de classe** : zone de texte séparée par `؛`, compteur sur 200 élèves, aperçu défilant borné à 176 px, état de version et bouton Transmettre; le bouton est désactivé pendant l’envoi.
- **Import JSON d’un cahier** : cible de classe verrouillée, modes Remplacer/Ajouter, textarea monospace de 8 lignes, limite de taille annoncée, résumé après validation et confirmation destructive avant remplacement.
- **Aperçu de document** : même moteur que chez le professeur, lecture seule.

Références : [`TeacherDetail.tsx`](src/admin/components/TeacherDetail.tsx), [`ClassRosterModal.tsx`](src/admin/components/ClassRosterModal.tsx), [`ClassJsonImportModal.tsx`](src/admin/components/ClassJsonImportModal.tsx), [`AdminDocumentPreview.tsx`](src/admin/components/AdminDocumentPreview.tsx).

### 13.2 Réglages globaux de la direction

- **Gestion de l’horloge d’emploi du temps** : page `min-h-dvh`, largeur maximale 80 rem, padding 16 px puis 32 px. En-tête présente compte/personnalisation, objectif et effet sur l’ensemble de la journée. Deux panneaux passent côte à côte à `lg` : réglage du décalage/début et aperçu complet des créneaux. Le récapitulatif affiche décalage, début, fin et pause déjeuner; les créneaux sont en grille avec heures monospace. Le décalage doit rester entre 06:00 et 10:00 par pas de 5 minutes. Publication protégée par confirmation et version.
- **Politique d’évaluation** : page de même largeur; sélecteur politique générale/personnalisée par compte, quatre compteurs de synthèse, puis sections « Devoirs et évaluations » et « Activités pédagogiques ». Chaque carte décrit une nature et expose Transmission, Contrôle continu, Liste d’élèves, Retours, Notes /20, Absents, Correction et visibilité du document selon la disponibilité. Une prévisualisation indique les actions qui apparaîtront à l’enseignant. Le pied de publication montre les changements non publiés, version/date, Annuler, réinitialisation et Publier; confirmation avant écriture.

Les cartes administratives utilisent `card`, bordure `border`, rayon 16 px (`rounded-2xl`), ombre courte; titres 24–32 px, aide 14 px, libellés de contrôle 12–14 px. Les états erreurs et succès sont des bandeaux destructif/succès. Les actions principales gardent 44 px. Le sélecteur d’horloge et celui de politique ont un `ConfirmDialog` propre à chaque publication.

Références : [`TimetableClockManager.tsx`](src/admin/components/TimetableClockManager.tsx), [`EvaluationPolicyManager.tsx`](src/admin/components/EvaluationPolicyManager.tsx), [`evaluationPolicy.css`](src/admin/components/evaluationPolicy.css).

### 13.3 Liste des étudiants envoyée à une classe

La modale admin de liste de classe utilise une largeur `xl` (jusqu’à 768 px), titre avec icône Élèves 20 px et nom de classe isolé bidi. Le corps donne d’abord le but du partage, puis une zone d’édition multi-lignes, l’explication des séparateurs (`؛` et `;`), le nombre d’élèves, la version publiée et l’aperçu en deux colonnes dès `sm`. Le message d’erreur demeure visible près de l’action. La publication montre Transmettre au professeur et bloque la fermeture pendant l’opération.

Référence : [`ClassRosterModal.tsx`](src/admin/components/ClassRosterModal.tsx).

## 14. Messages, installation PWA et écrans d’état

### Message de la direction à confirmer

Le modal « Message de la direction » est volontairement non dismissable par fermeture standard et bloque son voile pendant l’envoi. Largeur maximale locale 576 px. Titre avec icône de sécurité 40 px, carte de contenu sur primaire à faible opacité, titre 16–18 px et texte 14 px. Le pied peut proposer Répondre puis Accuser réception; en cas d’échec, un message d’erreur est affiché et la confirmation reste à effectuer.

Référence : [`AdminMessageModal.tsx`](src/features/messages/AdminMessageModal.tsx).

### Conversation enseignant

Largeur jusqu’à 672 px. Le formulaire comprend d’abord le choix de classe (ou conversation générale), le champ de message 4 lignes / 1 200 caractères, le compteur, puis Envoyer. L’en-tête indique la réponse citée en cas de réponse directe; l’historique de messages est sous le formulaire. États distincts : non connecté, hors ligne, chargement, erreur, succès, limitation de débit et classe non synchronisée. Les erreurs sont conservées dans le contexte du formulaire et les demandes réseau peuvent être annulées à la fermeture.

Références : [`TeacherConversation.tsx`](src/features/messages/TeacherConversation.tsx), [`conversation.css`](src/features/messages/conversation.css).

### Installation PWA

Fenêtre `sm` (448 px max) avec une icône applicative 40 × 40 px, titre et sous-titre. Deux onglets iOS / Android affichent une liste d’étapes numérotées, pastilles 24 px, cartes bordées à padding 12 px. Le pied empile les actions sur petit écran : « J’ai installé l’application » et Fermer. La plateforme sélectionnée initialise l’onglet correspondant et le suit si la plateforme change.

Référence : [`PwaInstallModal.tsx`](src/features/assistant/PwaInstallModal.tsx).

### États de chargement, confirmation et erreurs

- Les fenêtres courtes de confirmation restent des alert dialogs compacts jusqu’à 448 px max, même en mode mobile. La suppression sensible peut demander la saisie exacte du nom de la classe ou du document.
- Le squelette `EditorModals` reproduit le futur cadre (en-tête, deux zones de corps, pied), avec dimensions réservées et rôle status afin d’éviter un saut de layout lors du chargement paresseux.
- Import/export, édition documentaire, synchronisation et publication utilisent des états occupé, erreur et succès distincts; la plupart bloquent leur CTA pendant l’écriture et conservent les valeurs saisies en cas d’échec.
- La fermeture d’une modale imbriquée restitue le focus au déclencheur du parent; Escape est traité par le dialogue actif, sauf lorsque `blockDismiss` est activé.

Références : [`EditorModals.tsx`](src/features/editor/EditorModals.tsx), [`confirm-dialog.tsx`](src/components/ui/confirm-dialog.tsx), [`modal-bottom-sheet.tsx`](src/components/ui/modal-bottom-sheet.tsx), [`modal-motion.css`](src/components/ui/modal-motion.css).

## 15. Index des gros fichiers examinés

Le nombre de lignes est un ordre de grandeur du dépôt au moment de ce relevé; il indique où une règle locale peut s’ajouter au socle commun, pas une mesure de l’interface.

| Fichier | Lignes env. | Périmètre UX couvert ici |
|---|---:|---|
| [`createClassModal.css`](src/features/dashboard/modals/createClassModal.css) | 1 152 | Thèmes de couleurs, header, wizard, choix, groupe, swatches, édition, roster, responsive et motion. |
| [`TeacherDetail.tsx`](src/admin/components/TeacherDetail.tsx) | 1 395 | Détail enseignant, onglets, classes et actions admin imbriquées. |
| [`CreateClassModal.tsx`](src/features/dashboard/modals/CreateClassModal.tsx) | 789 | Parcours cycle/niveau/filière/détails, édition identité/élèves, validation et suppressions. |
| [`AssignDateModal.tsx`](src/features/editor/modals/AssignDateModal.tsx) | 867 | Date, remarque, activités, rappels de devoirs, documents, warnings et enregistrement. |
| [`DevoirsView.tsx`](src/features/evaluations/DevoirsView.tsx) | 712 | Feuille d’évaluation, groupes accordéon, lignes, dates, documents, actions et conflits. |
| [`ContentModal.tsx`](src/features/editor/modals/ContentModal.tsx) | 550 | Sélection de type, insertion contextualisée et formulaires d’édition. |
| [`notebookTracking.css`](src/features/evaluations/components/notebookTracking.css) | 907 | Recherche, liste, progression, statuts par élève, pieds sticky et adaptation sombre. |
| [`evaluationReference.css`](src/features/evaluations/evaluationReference.css) | 907 | Coque d’évaluation, lignes, tableau, actions et variations compactes. |
| [`EventDateModal.tsx`](src/features/evaluations/components/EventDateModal.tsx) | 460 | Date unique/plage, raccourcis, mois, calendrier, aperçu et actions. |
| [`DevoirsModals.tsx`](src/features/evaluations/components/DevoirsModals.tsx) | 419 | Montage et contenu des modales de devoirs, élèves, documents et suppressions. |
| [`PrintModal.tsx`](src/features/editor/modals/PrintModal.tsx) | 427 | Modes, dates, rendu papier, préférences et état d’impression. |
| [`ManageLessonsModal.tsx`](src/features/editor/modals/ManageLessonsModal.tsx) | 394 | Numérotation, visibilité, contenus ordonnés et suppression. |
| [`EvaluationPolicyManager.tsx`](src/admin/components/EvaluationPolicyManager.tsx) | 436 | Politique d’évaluation, aperçus, publication et confirmation. |
| [`DataTransferModal.tsx`](src/features/editor/modals/DataTransferModal.tsx) | 392 | Sélection/export, import JSON, modes d’écriture et confirmation. |
| [`modal-motion.css`](src/components/ui/modal-motion.css) | 299 | Tokens de surface, breakpoints, plein écran, glass, scroll et animation. |

Les modules plus courts listés dans les références des sections précédentes complètent l’inventaire par responsabilité. Les feuilles partagées (`modal-motion.css`, tokens de thème, typographie et navigation) sont la référence prioritaire lorsqu’un composant local paraît déclarer une valeur différente.

## 16. Synthèse responsive et hiérarchie transversale

| Contexte | Présentation retenue | Points à contrôler |
|---|---|---|
| Téléphone ≤ 639 px | Fenêtres métier en écran plein, sauf alert dialogs; en-tête/pied collants, safe areas, scroll du corps. Paramètres et Aide conservent la bottom navigation intégrée. | Clavier virtuel et hauteur visible; libellés arabes longs; tableaux qui défilent plutôt que se comprimer; pied et dernière ligne de formulaire non masqués. |
| Tablette 640–767 px | Fenêtres encore plein écran pour le socle général; padding et typographie gagnent de l’espace à `sm`. | Confirmer les exceptions ayant un width local ou une hauteur interne limitée. |
| Tablette 768–1023 px | Les sheets peuvent être centrées/hautes; Paramètres et Aide avec navigation intégrée passent en layout immersif. | Contrôler le seuil tactile jusqu’à 1180 px, la largeur max sheet de 46 rem et le comportement de la barre mobile dans l’overlay. |
| Bureau ≥ 1024 px | Dialogues dimensionnés par preset, fond translucide possible, navigation Paramètres en rail. | Le contenu peut être plus étroit que la coque; vérifier le max-width propre aux formulaires et les tableaux en pleine largeur. |

L’ordre visuel recommandé dans chaque vue reste : **titre/contextualisation → contenu et choix → validation/action**. Le primaire est réservé à l’action d’avancement, le rouge aux suppressions/ruptures, l’ambre aux avertissements, le vert aux validations. Les surfaces de cartes restent neutres avec filets fins; les couleurs de catégorie vivent surtout dans l’icône, le badge ou le statut.

## 17. Comparaison Material 3 — décisions et corrections

Cette annexe confronte le relevé aux recommandations Material 3 (Android / Gmail, Drive, Calendar, Classroom). Elle distingue ce qui a été **appliqué**, ce qui reste **une évolution à décider**, et ce qui **contredit la direction visuelle demandée** pour l’application.

### 17.1 Décisions

| Sujet | Décision | Raison |
|---|---|---|
| Cibles tactiles | **Appliqué** : `--touch-min` = 44 px au pointeur fin, 48 px au doigt | 44 px reste le plancher absolu ; 48 px suit M3 sur téléphone sans alourdir la souris. |
| Contraste de l’onglet actif | **Appliqué** : `#0a5bbd` (≈ 6,2:1 sur `#fafafa`) au lieu de `#0071e3` (≈ 4,0:1) | Texte de 11 px : le seuil AA de 4,5:1 s’applique. |
| Texte ambre | **Appliqué** : les textes utilisent `text-warning-strong` (`hsl(36 88% 27%)`, ≈ 6,5:1) | `--warning` reste réservé aux icônes, points et fonds. |
| Lignes d’évaluation 36 px | **Appliqué** : 48 px minimum au doigt | La lisibilité de la grille ne change pas ; seule la cible grandit. |
| Boutons de suppression 36 px | **Appliqué** : `--touch-min` | Même règle que la barre d’évaluation. |
| Poignée de feuille 24 px | **Non appliqué** | Zone décorative ; la fermeture dispose déjà d’un bouton de 48 px et du geste. |
| FAB « + » en bas à droite | **Refusé** | Le « + » et l’assistant sont placés au-dessus du titre par demande explicite. |
| Barre basse à 80 dp | **Refusé** | La barre compacte de 60–72 px est un choix de la charte. |
| Titres de modale à 24 sp | **Non appliqué** | Casserait la densité des formulaires ; les titres restent à tokeniser. |
| Breakpoints 600 / 840 / 1200 | **Refusé** | Les seuils 640 / 768 / 1024 / 1180 sont utilisés dans tout le dépôt ; les remplacer remodèlerait le responsive sans gain utilisateur. |
| Retour système Android | **Déjà couvert** | `handleNativeBack` ferme la fenêtre ouverte (Escape) puis réduit l’application ; le retour navigateur reste le comportement standard de la PWA. |
| Flou sur Android d’entrée de gamme | **Partiel** | `prefers-reduced-transparency` rend les surfaces opaques ; un budget de flou par appareil reste à mesurer. |
| Rayons et échelle typographique | **À décider** | Les deux demandent une passe transversale (voir 17.3). |

### 17.2 Tokens en vigueur après correction

```css
:root {
  --touch-min: 44px;          /* pointeur fin */
  --touch-gap: 8px;
  --mobile-tab-accent: #0a5bbd;
  --mobile-tab-accent-wash: rgb(10 91 189 / .08);
  --warning-strong: 36 88% 27%; /* texte ambre accessible */
}
@media (pointer: coarse) {
  :root { --touch-min: 48px; }
}
```

Les composants qui suivent le doigt lisent `var(--touch-min)` : bouton de fermeture des modales, pieds d’action, tous les boutons, champs et choix du socle de modale, menu `⋮` des cartes, liens du rail Paramètres, lignes et tiroirs d’évaluation, suppression d’élève, bouton de recherche d’élève, rangée compacte de la barre mobile en paysage.

### 17.3 Ce qui reste ouvert

- **Échelle typographique** : 25 tailles distinctes, écarts de 1 px entre niveaux de l’éditeur. Une échelle de 8 paliers (`11 / 12 / 14 / 16 / 18 / 22 / 28 / 34`) demande de reprendre `editorTypography.css` et les tailles en dur des modales.
- **Rayons** : converger vers `8 / 12 / 16 / 24 / 28 / pilule`. Aujourd’hui 6, 10, 14 et 18 coexistent encore.
- **Titres de modale** : un seul token `--modal-title-size` remplacerait les valeurs 15, 16, 16/17, 16/18, 17/19.
- **Arabe** : le titre de page RTL (1,35–1,7 rem) est plus petit que le titre latin (1,625–2,125 rem). À vérifier sur appareil, la lisibilité arabe demandant plutôt +1 à +2 px.
- **Flou** : mesurer le coût de `backdrop-filter` sur un Android d’entrée de gamme et prévoir un budget par appareil.

### 17.4 Vérification

Les contrastes indiqués sont calculés à partir des valeurs HSL du thème (WCAG 2.1, luminance relative). Mesures faites sur les feuilles réelles servies par l’application : `--touch-min` rend `44px` au pointeur fin et `--touch-gap` `8px` ; l’onglet actif calcule `rgb(10, 91, 189)` sur `#fafafa` → **6,20:1**, sur son fond teinté `rgb(231, 237, 245)` → **5,50:1** ; en sombre `#78adf2` sur le fond → **7,70:1** et sur le lavis → **6,06:1**.

Deux règles mortes ont été corrigées au passage : la ligne d’évaluation redescendait à 44 px au doigt à cause d’un bloc `(max-width: 768px)` postérieur, et la rangée compacte de la barre mobile en paysage gardait 44 px en dur. Un ancien 44 px en dur subsiste dans les optimisations mobiles de `notebookTracking.css` ; elles ne suivent pas encore le token.

Reste à confirmer avec axe ou Accessibility Scanner sur un appareil réel, ainsi que le rendu des cibles à 48 px avec la taille de police Android poussée à 130–200 %.
