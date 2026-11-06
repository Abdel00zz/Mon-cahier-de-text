# Système de Design UI/UX — دفتر نصوصي · Mon Cahier de Textes (`style.md`)

Ce document décrit l'intégralité du système de design **UI/UX** de l'application **دفتر نصوصي (Mon Cahier de Textes)** : philosophie visuelle, fondations chromatiques (mode clair papier albâtre & mode sombre), typographie bilingue **RTL / LTR**, physique tactile **iOS**, architecture des écrans et zones imbriquées (`.cahier-scr`, `.cahier-grp`, `.cahier-row`), cartes pastel des classes, tableau éditeur à 3 colonnes, barre de sélection contextuelle, robot compagnon et fenêtre d'impression à deux barres.

---

## 1. Philosophie Visuelle & Principes Directeurs UX

1. **Esthétique « Cahier Papier Albâtre & Tactilité iOS »** :
   - L'application marie la chaleur d'un vrai cahier de textes officiel sur papier albâtre chaud (`#F6F4EE`) avec la précision ergonomique des interfaces natives iOS/iPadOS (listes groupées `.cahier-grp`, barres de navigation translucides `.cahier-nav`, contrôles segmentés `.cahier-seg`, interrupteurs à ressort `.cahier-sw` et feuilles modales).
2. **Bilinguisme Symétrique (Arabe RTL ↔ Français LTR)** :
   - Le passage de l'arabe (`dir="rtl"`, `lang="ar"`) au français (`dir="ltr"`, `lang="fr"`) inverse instantanément l'axe de lecture grâce aux propriétés logiques CSS (`inset-inline`, `margin-inline`, `padding-inline`, `border-s`, `border-e`, `text-start`, `text-end`) et au facteur directionnel `--d: 1` (RTL) / `--d: -1` (LTR).
3. **Zéro Surcharge Cognitive** :
   - **Écran d'accueil (`#classes`) épuré** : uniquement les 3 boutons d'en-tête circulaires (`FR/ع`, `+`, `Robot Compagnon`), le titre `أقسامي الدراسية :`, les cartes pastel des classes et la barre d'onglets inférieure.
   - **Une seule action prioritaire** pour le Robot Compagnon (pas d'empilement de bannières d'alerte).
   - **Réversibilité immédiate** : historique complet `Annuler / Rétablir` (20 états) + toast d'annulation de 5 secondes lors de toute suppression.

---

## 2. Tokens de Couleurs & Surfaces (`src/index.css`)

### 2.1 Surfaces Principales (Clair vs Sombre)

| Token CSS | Rôle UI | Mode Clair (`:root`) | Mode Sombre (`html.dark`) |
| :--- | :--- | :--- | :--- |
| `--ios-bg` / `--bg` | Fond général (papier albâtre chaud / carbone) | `#F6F4EE` | `#141413` / `#191919` |
| `--ios-surface` / `--card` | Surface des cartes et groupes `.cahier-grp` | `#FFFFFF` | `#1E1E1C` / `#202020` |
| `--ios-surface-elevated` / `--sub` | Surface surélevée / sous-carte | `#FAF9F5` / `#F7F6F3` | `#252523` / `#252525` |
| `--ios-surface-grouped` / `--fill` | Fond de contrôle segmenté, champ ou badge | `#EDEBE4` / `rgba(55,53,47,0.07)` | `#2C2C29` / `rgba(255,255,255,0.08)` |
| `--ios-glass` / `--glass` | Verre dépoli des barres collantes (`backdrop-blur`) | `rgba(250, 248, 243, 0.84)` | `rgba(24, 24, 22, 0.84)` |
| `--ios-border` / `--sep` | Filet séparateur subtil (1px) | `rgba(45, 40, 34, 0.08)` | `rgba(255, 255, 255, 0.08)` |
| `--ios-border-strong` | Bordure accentuée (tableau, modale) | `rgba(45, 40, 34, 0.14)` | `rgba(255, 255, 255, 0.15)` |

### 2.2 Encres & Accents Sémantiques

| Token CSS | Rôle Typographique / Sémantique | Mode Clair | Mode Sombre |
| :--- | :--- | :--- | :--- |
| `--ios-ink` / `--tx` | Encre primaire (titres, corps de séance) | `#1C1B19` / `#37352F` | `#F3F2EE` / `rgba(255,255,255,0.88)` |
| `--ios-ink-secondary` / `--tx2` | Encre secondaire (sous-titres, métadonnées) | `#68645E` | `#A09E97` |
| `--ios-ink-tertiary` | Encre tertiaire (placeholders, indices) | `#96918A` | `#6E6C66` |
| `--ios-accent` / `--blue` | Bleu interactif iOS (sélection, liens, switch actif) | `#1B6EC2` / `#2383E2` | `#529CCA` |
| `--ios-accent-warm` | Brun cuir chaud (bouton `+`, bouton Imprimer) | `#6E4D36` | `#D49A73` |
| `--ios-success` | Vert émeraude (synchronisation, chapitre terminé) | `#0F7B6C` | `#34D399` |
| `--ios-warning` | Ambre (séance sans date, hors créneau) | `#D9730D` | `#FBBF24` |
| `--ios-danger` / `--red` | Rouge corail (suppression, conflit d'absence, devoir) | `#DC2626` / `#D44C47` | `#F87171` / `#FF7369` |

### 2.3 Les 7 Thèmes Pastel des Cartes de Classes (`COLOR_THEMES`)

Chaque carte de classe sur l'écran `#classes` utilise un dégradé vertical subtil, une bordure dédiée, un reflet spéculaire supérieur (`inset 0 1px 0 rgba(255,255,255,0.75)`) et une encre harmonisée :

| Identifiant | Nom (AR / FR) | Swatch (`--c`) | Dégradé Clair (`from` → `to`) | Bordure Claire | Encre Titre / Sous-titre |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `rose` | وردي ناعم / Rose Pastel | `#A6265A` | `#F7E1EA` → `#F5DCE6` | `#ECC4D4` | `#75183D` / `#8C2D52` |
| `emerald` | أخضر نعناعي / Menthe Douce | `#156542` | `#E3F3EA` → `#DCF0E5` | `#C2E3D0` | `#0D5636` / `#246B4B` |
| `teal` | سماوي هادئ / Azur Clair | `#165B73` | `#E4F3F7` → `#DDF0F5` | `#C4E2EB` | `#124A5E` / `#2A667A` |
| `violet` | خزامى بنفسجي / Lavande Iris | `#2B2B78` | `#E6E7F8` → `#E0E1F6` | `#C9CBF0` | `#1F1F66` / `#3B3B87` |
| `blue` | أزرق جليدي / Bleu Glacier | `#1B3D73` | `#E6EFF9` → `#DFEAF7` | `#C6D9F0` | `#143261` / `#2D4F85` |
| `sage` | أخضر زيتوني / Vert Sauge | `#2D611B` | `#EAF5E4` → `#E3F1DC` | `#CCE4C0` | `#214F12` / `#386B27` |
| `amber` | خوخي دافئ / Pêche Ambré | `#7A2A1D` | `#F8E7E3` → `#F5DFDA` | `#ECC8C0` | `#6B2115` / `#87382B` |

---

## 3. Typographie & Échelle de Densité

### 3.1 Familles de Polices
- **Arabe (`--font-ar`)** : `'IBM Plex Sans Arabic', 'Readex Pro', -apple-system, BlinkMacSystemFont, system-ui, sans-serif`
- **Français (`--font-fr`)** : `'Plus Jakarta Sans', 'IBM Plex Sans Arabic', -apple-system, BlinkMacSystemFont, system-ui, sans-serif`
- **Monospace & Chiffres (`--font-mono` / `.tabular-nums`)** : `'JetBrains Mono', ui-monospace, monospace` avec `font-variant-numeric: tabular-nums lining-nums` pour garantir l'alignement vertical des dates (`12/09`), compteurs et badges.

### 3.2 Facteur de Densité Dynamique (`--app-text-density`)
La taille racine `html { font-size: calc(16px * var(--app-text-density)); }` met à l'échelle toute l'interface selon le réglage choisi dans **Paramètres > Taille du texte** :
- `sm` (صغير / Petit) : `0.94` (`15.04px`)
- `md` (عادي / Moyen — défaut) : `1.00` (`16px`)
- `lg` (كبير / Grand) : `1.08` (`17.28px`)
- `xl` (كبير جداً / Très grand) : `1.16` (`18.56px`)

---

## 4. Physique Tactile, Courbes d'Animation & Micro-Interactions

| Classe / Courbe | Définition CSS | Comportement UX |
| :--- | :--- | :--- |
| `--ios` | `cubic-bezier(0.32, 0.72, 0, 1)` | Courbe de décélération fluide native iOS pour les ouvertures de feuilles, rotations de chevrons et transitions d'écrans. |
| `--sp` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Courbe à rebond élastique (spring) pour les interrupteurs `.cahier-sw`, les pastilles de couleur `.cahier-sws` et les segments `.cahier-seg`. |
| `.ios-press` | `:active { transform: scale(0.96); }` | Réponse tactile immédiate sur tous les boutons circulaires, pilules d'action et onglets. |
| `.ios-pastel-card` | `:hover { translateY(-1.5px) }` / `:active { scale(0.986) }` | Élévation douce au survol et compression contrôlée au toucher sur les cartes de classes. |
| `.animate-bot-float` | Flottement vertical `±1.5px` sur `3.4s` + clignement `.animate-bot-blink` (`4.6s`) | Donne vie au Robot Compagnon sans distraire la lecture. |
| `prefers-reduced-motion` | Désactive toutes les durées (`0.01ms`) | Respect strict de l'accessibilité motrice et vestibulaire. |

---

## 5. Architecture des Écrans & Zones Imbriquées (`#set`, `#help`, `#create`, `#inbox`)

Inspirée directement de l'architecture iOS / Notion de référence, chaque vue système est construite par emboîtement hiérarchique :

```
section.cahier-scr (Conteneur d'écran avec halo dégradé supérieur ::before)
 ├── header.cahier-nav (.is-scrolled) > div.cahier-bar > b.cahier-bar-title
 ├── div.cahier-pi (Grand emoji d'en-tête 3.4rem avec ombre portée)
 ├── h1.cahier-lt (Grand titre 2.1rem, font-weight 800)
 ├── h2.cahier-gl (Étiquette de section groupée 0.8rem, couleur secondaire)
 └── div.cahier-grp (Carte groupée à bords arrondis 1rem, bordure --sep)
      ├── div/button/label.cahier-row (Ligne imbriquée min-height 3rem, séparateur ::before décalé d'1rem)
      │    ├── span.cahier-ri (Icône carrée 1.95rem teintée via color-mix avec --c)
      │    ├── span (Corps extensible : Titre + <small> sous-titre)
      │    └── Contrôle de fin de ligne :
      │         ├── em (Valeur actuelle + chevron ›)
      │         ├── button.cahier-sw (Interrupteur iOS RTL/LTR aria-checked)
      │         └── div.cahier-stp (Stepper numérique − / valeur / +)
      ├── div.cahier-seg (Contrôle segmenté imbriqué à boutons aria-pressed)
      ├── div.cahier-sws (Sélecteur de pastilles de couleur avec anneau actif)
      └── details.cahier-hq (Accordéon d'aide imbriqué avec badge emoji .cahier-em et rotation du chevron)
```

### Détail des Composants Imbriqués
1. **Halo supérieur d'écran (`.cahier-scr::before`)** :
   - Génère un dégradé diagonal (`115deg`) en mélangeant les variables `--c1` et `--c2` propres à l'écran avec `--bg` via `color-mix(in srgb, var(--c1) 32%, var(--bg))`, fondu vers le bas par `mask-image: linear-gradient(to bottom, black 55%, transparent 100%)`.
2. **Barre de navigation sensible au défilement (`.cahier-nav.is-scrolled`)** :
   - Transparente en haut de page ; dès que le défilement dépasse `36px`, active le verre dépoli (`backdrop-filter: blur(20px)`) et fait apparaître le titre centré `.cahier-bar-title` en fondu vertical.
3. **Icône de ligne teintée (`.cahier-ri`)** :
   - Utilise une seule variable locale `--c` (ex. `--c: #2383e2`) pour calculer automatiquement son fond (`16%` de `--c` sur `--bg`) et sa couleur d'icône (`78%` de `--c` vers `--mix`).
4. **Interrupteur iOS bilingue (`.cahier-sw`)** :
   - Curseur circulaire blanc de `1.2rem` qui se déplace via `transform: translateX(calc(var(--d) * -1.06rem))` lors de `aria-checked="true"`, fonctionnant nativement en RTL comme en LTR.

---

## 6. Anatomie des Écrans Métier

### 6.1 Écran d'Accueil — Mes Classes (`#classes` / `DashboardScreen.tsx`)
- **En-tête minimaliste à 3 boutons circulaires (`42px × 42px`)** :
  1. **Bouton Langue (`FR` / `ع`)** : cercle albâtre/blanc, bordure fine `#E5E0D6`, texte `12.5px` gras.
  2. **Bouton Ajouter une classe (`+`)** : cercle brun cuir `#6D4C34` avec anneau intérieur spéculaire et ombre portée chaude.
  3. **Bouton Robot Compagnon** : cercle blanc `#FFFFFF` abritant le robot SVG animé (`#5B54EB`) et son badge de compteur en haut à gauche (`#6D4C34`, bordure blanche `2px`).
- **Titre principal (`أقسامي الدراسية :`)** : `27px–30px`, graisse `800`, aligné au début du sens de lecture (`text-start`).
- **Liste des cartes de classes (`<ul role="list">`)** :
  - Hauteur minimale `66px` (1 ligne, ex. `السنة الأولى · PCSI 1`) ou `74px` (2 lignes avec sous-titre de niveau, ex. `العلمي 1` / `الجذع المشترك`).
  - Rayon de bordure `21px`, bouton d'action secondaire `⋮` (`MoreVertical`) isolé en fin de carte avec cible tactile de `34px × 34px`.

### 6.2 Écran du Cahier — Tableau Éditeur à 3 Colonnes (`#book` / `NotebookScreen.tsx`)
- **Grille officielle à 3 colonnes (`grid-cols-[14%_70%_16%]` sur mobile, `grid-cols-[6.5rem_1fr_8.5rem]` sur écran large)** :
  1. **Colonne Date (centrée)** :
     - Affiche le jour en gras (`09`) et le mois (`/ 12`) en chiffres tabulaires, ou un badge ambré en pointillés `بلا تاريخ / Sans date`.
     - **Fusion automatique par date** : lorsque plusieurs lignes consécutives partagent la même date normalisée, la première ligne porte la date et le badge de groupe `×N` (cliquable selon la **règle du tout-ou-rien**), tandis que les lignes suivantes affichent `↳`.
  2. **Colonne Contenu (hiérarchie typographique stricte)** :
     - **Bannière d'évaluation** (si présente) : centrée en rouge corail gras (`text-rose-700`).
     - **Titre de Chapitre** : centré en bleu pétrole profond (`#175B66` en mode clair, `#7CD4E0` en mode sombre), gras `15.5px`.
     - **Section / Axe (`أ. ...`)** : aligné au début du sens de lecture (`text-start`), gras `13.5px`.
     - **Éléments numérotés par chapitre** : badge rectangulaire (`درس 1`, `تمارين 1`, `أشغال تطبيقية 1`) suivi du texte descriptif.
     - **Double-clic** sur la cellule : ouvre directement la fenêtre de modification sans altérer la sélection.
  3. **Colonne Remarque (alignée au début de lecture)** :
     - Fusionnée automatiquement sur l'ensemble des lignes d'une même séance (`Note A · Note B`), avec bouton rapide `+ ملاحظة / + Note`.

### 6.3 Barre de Sélection Contextuelle (`§7.5`)
- Apparaît avec une bordure bleue (`border-[var(--ios-accent)]/35`) et `aria-live="polite"` dès qu'au moins une ligne est sélectionnée :
  - Pastille numérique (`1`, `2`…) + libellé exact (`سطر واحد محدد` / `X أسطر محددة`).
  - Actions contextuelles adaptatives : **إضافة بعد (Ajouter après)**, **اليوم (Aujourd'hui)**, **اختيار تاريخ (Choisir une date)**, **إزالة التاريخ (Retirer la date — affiché uniquement si au moins une ligne sélectionnée possède une date)**, **تعديل (Modifier — affiché uniquement si 1 seule ligne est sélectionnée)**, **حذف (Supprimer)** et **إلغاء التحديد (`×`)**.

### 6.4 Le Robot Compagnon (`InboxModal` — `§13`)
- **4 postures visuelles déterministes** pilotant la rondeur de la tête (`headRoundness: 100% → 55%`), le clignotement de l'antenne (`antennaBlinks`) et la pastille d'état :
  - `sereine` (أخضر / Vert émeraude) : `0` anomalie.
  - `mineure` (أزرق / Bleu) : `1–2` signaux ou séance en cours.
  - `moderee` (كهرمائي / Ambre) : `3–5` signaux, antenne clignotante.
  - `critique` (أحمر / Rouge corail) : `6+` signaux, antenne clignotante.

### 6.5 Fenêtre d'Impression à Deux Barres & Feuille Papier (`PrintModal` — `§14`)
1. **Barre haute fixe** : icône imprimante + titre `طباعة أو تصدير PDF / Imprimer ou exporter PDF` + bouton fermer `×`.
2. **Corps déroulant à zones imbriquées** :
   - **Sortie (`.cahier-seg`)** : `الجديد فقط (Nouveautés seulement)` · `كامل الدفتر (Tout le document)` · `حصص مختارة (Séances choisies)`.
   - **Dates de séance** : puces interactives `[09/12 · جديد]` / `[09/12 · مطبوع سابقاً]` + sélecteurs rapides `الكل · لا شيء · الجديد`.
   - **Typographie & Interligne** : deux contrôles segmentés (`صغير / عادي / كبير` et `ضيق / عادي / مريح`) + cases à cocher (`En-tête d'établissement`, `Lignes de séparation`, `Pied de page et signature`).
   - **Fente d'imprimante & Feuille de papier (`#FFFDF8`)** : barre sombre horizontale simulant la fente physique d'où sort la feuille de cahier de textes (animée en translation verticale lors de l'impression).
3. **Barre basse collante** : bouton unique pleine largeur en brun cuir `#6E4D36` affichant le compteur exact (`طباعة · X حصص / Imprimer · X séances`) et désactivé (`disabled`) lorsque `0` séance est sélectionnée.

### 6.6 Barre d'Onglets Inférieure Fixe (`App.tsx`)
- Flottante en bas d'écran (`fixed inset-x-0 bottom-0 z-40`), fond verre dépoli `#FAF8F4/88` (`backdrop-blur-2xl`), 3 onglets centrés :
  1. **الأقسام / Classes** (`Users`)
  2. **الإعدادات / Réglages** (`Settings`)
  3. **المساعدة / Aide** (`HelpCircle`)
- L'onglet actif reçoit une pilule bleu glacier (`from-[#E5F2FE] to-[#D2E7FB]`, texte `#125DB3`, bordure `#BFE0FA` et reflet intérieur blanc).

---

## 7. Correspondance avec l’implémentation (audit)

> Cette annexe a été ajoutée après réception du document : le texte original
> s’arrête à la section 6.6 (barre d’onglets inférieure). Rien n’a été modifié
> dans les sections 1 à 6.

### 7.1 Ce qui est déjà en place

| Élément décrit | État |
|---|---|
| Structure d’écran (barre, grand titre, libellé de groupe, carte groupée, ligne, icône teintée, switch, segmenté, pas de couleur, accordéon) | En place : les écrans Paramètres et Aide suivent exactement cette imbrication |
| Feuilles et fenêtres plein écran, verre dépoli des barres collantes | En place (plein écran < 768 px, poignée masquée, en-tête et pied collants) |
| Barre de sélection contextuelle et ses conditions d’affichage | En place (compteur annoncé, actions contextuelles, tout-ou-rien) |
| Robot compagnon : quatre gravités, antenne, arrondi de tête, sommeil | En place (règles déterministes) |
| Fenêtre d’impression à deux barres, puces de dates, fente d’imprimante | En place |
| Tableau à 3 colonnes, fusion par date, dates centrées, titres de tête centrés | En place |
| Courbes de mouvement et respect de `prefers-reduced-motion` | En place, valeurs légèrement différentes (voir 7.2) |
| Tuiles tactiles de 44 px (48 px au doigt) | En place |

### 7.2 État après application (point par point)

| Point | Document | État dans le code | Statut |
|---|---|---|---|
| Papier clair | `#F6F4EE` | `#F4F2EB` (94 %) | Appliqué, un cran plus soutenu : à 95 % la carte blanche ne se détachait plus assez (1,098 < seuil 1,10) |
| Surface de carte | `#FFFFFF` | `#FFFFFF` | **Conforme** |
| Nuit — fond | `#191919` | `#1A1A1A` (10 %) | **Conforme** (une unité) |
| Nuit — carte | `#202020` | `#262626` (15 %) | Appliqué avec élévation : 13 % ne franchissait pas le seuil de profondeur (1,09 < 1,12) |
| Nuit — surélevée / filet | `#252525` / 8 % | 17 % / 18 % | **Conforme** |
| Brun primaire | `#6E4D36` | `#6b4c35` | **Conforme** (3 unités, invisible) |
| Courbe ressort `--sp` | `(.34, 1.56, .64, 1)` | identique | **Déjà conforme** |
| Courbe iOS `--ios` | `(.32, .72, 0, 1)` | identique désormais | **Appliqué** |
| Densité de texte | `0,94 · 1 · 1,08 · 1,16` | identique | **Appliqué** |
| Écran de lancement, icône, manifestes | suivre la palette | alignés sur le nouveau papier | **Appliqué** |
| Rayon des cartes de classe | 21 px | 22 px | En attente : fichier en cours de modification par vous |
| Rayon des cartes groupées | 16 px | 14 px | En attente : même raison |
| Accent interactif | `#1B6EC2` / `#2383E2` | `#0a5bbd` (contraste AA) puis `hsl(var(--primary))` dans votre travail en cours | Arbitré par vous |
| En-tête d’accueil | 3 boutons (langue, `+`, robot) | 2 boutons (messages, `+`) | En attente : la langue reste dans les réglages |
| En-têtes de section de l’aide | Badge emoji | Icône SVG teintée | Écart de pictogramme assumé |
| Options d’impression | En-tête, lignes, pied | Interligne, couleur, pagination, en-tête | Jeu voisin, à compléter si besoin |

### 7.3 Ce qui reste à trancher

1. **Rayons** (21 px pour les cartes de classe, 16 px pour les cartes groupées) :
   les deux valeurs vivent dans des feuilles que vous modifiez en ce moment ;
   je ne les toucherai qu'une fois votre travail enregistré.
2. **Bouton de langue dans l'en-tête d'accueil** : ajoute une troisième cible de
   42 px à côté du compteur de messages et du `+`. À confirmer.
3. **Accent bleu** : vous avez engagé le passage au brun primaire
   (`hsl(var(--primary))`) dans la barre de navigation ; la charte parle d'un
   bleu `#1B6EC2`. Les deux se défendent : le brun garde une seule couleur
   d'action, le bleu reste le repère « navigation » des plateformes mobiles.
4. **Options d'impression** : ajouter « lignes de séparation » et « pied et
   signature » demanderait deux nouveaux réglages dans la fenêtre d'impression.

Les sections 1 à 6 restent la **cible** ; `mesur.md` reste la **mesure du réel**
et `mecanisme.md` la **logique**. Les quatre points de la section 2.1 et les deux
courbes de la section 4 sont désormais appliqués dans le code.