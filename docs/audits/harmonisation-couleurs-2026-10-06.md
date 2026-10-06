# Harmonisation chromatique — 6 octobre 2026

La palette a été assombrie et unifiée pour que l'interface se sente native sur
Android : surfaces plus profondes, étagement de profondeur lisible, contrastes
vérifiés, et plus aucune couleur étrangère au thème dans l'application.

## Ce qui pilotait le changement

Règles de Material Design appliquées (documentation officielle consultée le
06/10/2026) :

- **Gris sombres, jamais du noir** : la surface de référence d'un thème sombre
  est `#121212`, pas `#000000` ; le noir n'exprime ni profondeur ni élévation.
- **L'élévation s'exprime par une surface plus CLAIRE** : chaque niveau remonte
  d'environ 5 % de luminosité (`1dp 5 %`, `4dp 9 %`, `8dp 12 %`…).
- **Désaturation des accents en mode sombre** : les couleurs saturées vibrent
  sur un fond sombre et échouent au 4,5:1 ; on emploie les tons clairs (200-50).
- **Encre** : texte fort ≈ 87 %, texte moyen ≈ 60 %, désactivé ≈ 38 % ; en clair,
  l'ambre foncé porte une encre **blanche**, tandis qu'en sombre l'ambre
  s'éclaircit et porte une encre **sombre**.
- **Peu de couleur sur les grandes surfaces** : l'accent reste réservé aux
  actions et aux repères, la couleur de marque à un ou deux éléments.

## Nouvelle échelle

| Rôle | Clair | Sombre |
| --- | --- | --- |
| Fond de page | `#F2F0E8` (45 27 % 93 %) | `#201F1D` (40 6 % 12 %) |
| Carte (surface élevée) | `#FCFBF8` (42 36 % 98 %) | `#2E2C29` (38 6 % 17 %) |
| Menu / muet | 89–90 % | 19–20 % |
| Filet | 80 % (1,34:1 sur le fond) | 26 % (1,68:1) |
| Encre principale | 11 % (chaud) | 92 % |
| Encre secondaire | 34 % (8:1 sur carte) | 67 % |
| Accent (terre cuite) | `#B35230` | `#DE8266` (éclairci, désaturé) |
| Alerte / erreur | 38 % (cramoisi) | 70 % (rouge doux) |

## Contrastes mesurés (WCAG 2.1, luminance relative)

| Paire | Clair | Sombre |
| --- | --- | --- |
| Encre principale / carte | 16,11:1 | 11,80:1 |
| Encre secondaire / carte | 6,58:1 | 6,26:1 |
| Encre d'accent / accent | 8,31:1 | 7,99:1 |
| Destructif / aplat destructif | 7,44:1 | 6,70:1 |
| Pastille / aplat de pastille | 8,53:1 | 8,39:1 |
| Accent / carte (repère non textuel) | 4,84:1 | 4,81:1 |

Toutes les paires passent AA ; les valeurs sont verrouillées par
`tests/test-palette-contrast.ts`, qui lit les jetons réels de
`src/styles/index.css` et recalcule les rapports.

## Défauts corrigés

1. **Cartes invisibles en clair** : le fond (`#FAF9F5`) et la carte (`#FDFCF9`)
   ne différaient que de 3,6 % (ratio 1,036). L'étagement est maintenant de
   5 points de luminosité : ratio **1,103** en clair et **1,180** en sombre.
2. **Filet illisible en clair** : 1,23:1 → **1,34:1**, et surtout un filet plus
   franc (80 % au lieu de 87 %) ; en sombre, 1,68:1.
3. **Accent natif Android hors charte** : les notifications natives utilisaient
   `#547D31` (olive) alors que l'icône déclarée est `#B35230`. Les deux valent
   désormais `#B35230` ; un test compare les deux sources.
4. **Texte blanc sur aplat clair** : quatre couples échouaient (`bg-red-500` +
   blanc, infobulle `bg-foreground text-white` en sombre, `text-white` des cartes
   d'onboarding en sombre, pastille de retard `bg-warning` + blanc). Ils passent
   tous par les jetons, qui basculent avec le thème.
5. **Gris froids dans un produit chaud** : les cartes de classe écrivaient leur
   encre en `#343a40`/`#5f666d` (froids) et le tableau du cahier en `#202124` ;
   ils prennent maintenant l'encre chaude de la palette.
6. **Ornements étrangers au thème supprimés** : canvas « aurora »
   magenta/violet/bleu, bannière éditoriale `#11121d` à liseré violet, jeu de
   jetons `--ds-*` en doublon froid, bloc Fly.io indigo et `@keyframes flash-new`
   : aucun n'était utilisé, tous portaient des couleurs hors palette.
7. **Numéro de classe** : chiffre à l'encre (noir chaud en clair, ivoire en
   sombre), contour couleur carte sur les quatre côtés, teinte par ton et
   définition CSS concurrente supprimées (`tests/test-class-number-ink.ui.ts`).
   Dans la **liste**, le chiffre est pleinement opaque ; sur la **carte**, le grand
   filigrane reste un repère de fond : il passe de 8 % à **50 %** (38 % en nuit)
   avec un **filet plein de 2 px** à la couleur de la carte et
   `paint-order: stroke fill` (le filet passe derrière le chiffre) — des chiffres
   francs, sans écraser le titre (`tests/test-palette-contrast.ts`).
8. **Écran de lancement** : le fond natif était resté `#faf9f5` dans
   `capacitor.config.ts`, `styles.xml` et l'icône adaptative, alors que le thème
   clair descend à `#f2f0e8` ; un `values-night/styles.xml` à `#201f1d` évite
   l'éclair blanc au démarrage sur un appareil en thème sombre, et le repli de
   `readThemeBackground()` (barres système) suit la palette.

## Décisions assumées

- **Le document imprimé garde sa propre encre** (`--print-ink: #20262b`) : c'est
  du papier, pas l'interface, et l'encre froide y est plus dense à l'impression.
- **Les titres de chapitre de l'éditeur restent bleu-vert désaturé** : c'est un
  repère de contenu documenté, pas une couleur d'interface.
- **Les palettes de tons de classe** (`--keep-*`, pastilles d'action) sont
  conservées : ce sont des accents, accordés à la charte, et leurs variantes
  sombres restent lisibles sur les nouvelles surfaces.

## Emploi du temps et cartes de classe (passe UI)

La grille horaire quitte le tableau à filets continus pour des **tuiles
séparées** : `border-spacing` de 4 à 8 px, coins arrondis, en-têtes de jours et
d'heures en pastilles `bg-muted/70`, colonne des jours en carte `bg-card`, et
créneau libre en **pointillés** avec une pastille discrète au lieu d'un tiret.
Surtout, les six couleurs **codées en dur** du composant (`#c4bcaf`, `#eeeae3`,
`#f7f4ee`, `#2e2a25`, `#8b7355`, `#181614`…) disparaissent au profit des jetons :
l'emploi du temps suit enfin le thème, en clair comme en sombre.

Les cartes de classe reçoivent le même traitement : bouton d'options **circulaire
en verre teinté** (discret au repos, franc au survol), ombres désormais chaudes
(`rgb(32 30 26 / …)`) au lieu des gris froids, étagement conservé. L'emplacement
et le style du **numéro de classe** sont volontairement inchangés : grand chiffre
en bas à droite, encre du thème et filet couleur carte.

## Vérifications

`tests/test-palette-contrast.ts` (10 tests : paires WCAG, repères non textuels,
étagement de profondeur, encres d'aplat, encre et contour des numéros de classe,
parité de l'écran de lancement avec la palette, accord entre l'accent natif et la
charte) et `tests/test-class-number-ink.ui.ts` (5 tests) rejoignent la suite.
`npm run lint`, `npm run check:architecture`, `npm run check:unused`,
`npm run check:i18n`, `npm test` et `npm run build` passent.
