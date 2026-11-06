# Cœur CSS — netteté, couleurs et typographie

**Date :** 6 novembre 2026 · **Périmètre :** socle `src/styles/theme-*`,
`reset.css`, `typography.css`, `class-tones.css`, couleurs natives Android.

## 1. Objectif

Rendre le socle plus **net** (traits, bordures, focus), plus **doux** (neutres
chauds, sombre non inversé) et plus **haut de gamme** (textes optiquement
composés), sans toucher aux composants métier ni ajouter de dépendance.

Le socle était déjà bon : `antialiased`, `optimizeLegibility`, `text-wrap`,
échelle fluide, rayons et ombres tokenisés. La passe corrige les points qui
donnaient une impression de « presque fini » : blanc pur, gris neutres froids,
filets trop faibles, focus peu visible, texte secondaire un peu clair, et
absence de réglages optiques explicites.

## 2. Couleurs

| Jeton | Avant | Après | Raison |
| --- | --- | --- | --- |
| `--card` (clair) | `#ffffff` | `#fefefd` | plus de blanc pur sur une grande surface |
| `--popover` (clair) | `#ffffff` | `#fefefe` | même règle, sans perdre la lisibilité |
| `--border` (clair) | `hsl(35 14% 84%)` | `hsl(35 16% 82%)` | filet plus défini, contraste conservé |
| `--muted-foreground` | `hsl(27.57 20.22% 35.88%)` | `hsl(27.57 22% 34%)` | encre secondaire plus ferme |
| `--secondary` / `--muted` / `--accent` | gris neutres | légèrement teintés | neutres chauds cohérents, pas de gris mort |
| `--dock-shadow` | noir neutre | brun très sombre | ombre teintée, plus naturelle |
| `--background` (sombre) | `#191919` | `#1a1817` | nuit carbone légèrement chaude |
| `--card` (sombre) | `#262626` | `#282624` | élévation chaude, cohérente avec le papier clair |
| `--border` (sombre) | `hsl(0 0% 18%)` | `hsl(30 6% 19%)` | filet chaud, toujours ≥ 1,25:1 |
| `--dock-shadow` (sombre) | `rgba(0,0,0,.66)` | `rgba(8,6,4,.62)` | plus de noir pur |

Les contrastes WCAG sont revérifiés : les 12 tests de palette passent, clair et
sombre, y compris carte/fond, accent, alertes, bordures et tons de classe.

## 3. Traits et profondeur

- `--ui-card-shadow` : deux couches (contact 1 px + halo diffus) au lieu d’une
  ombre unique ; la carte se détache sans « flotter ».
- `--ui-hairline`, `--ui-hairline-soft`, `--ui-hairline-strong` : trois densités
  de filet pour distinguer séparateur décoratif, bord de carte et contour actif.
- `--ui-focus-ring` : anneau net de 2 px + halo de 4 px, au lieu d’un halo diffus
  de 3 px. Le focus clavier devient lisible sur les fonds clairs comme sombres.
- `--ui-glass-bg` / `--ui-glass-filter` : conservés, avec repli opaque via
  `prefers-reduced-transparency`.

## 4. Typographie

- `font-synthesis: none` : plus de faux gras/italique si une graisse manque.
- `font-optical-sizing: auto` et `font-kerning: normal` sur `html`.
- `font-variant-ligatures: common-ligatures contextual` + `kern/liga/calt`
  explicites : les ligatures latines restent nettes, les attaches arabes aussi.
- `mark`/`mkmk` activés pour l’arabe : les signes diacritiques ne se détachent
  plus aux petites tailles.
- `font-variant-numeric: tabular-nums lining-nums` sur les tableaux et les
  valeurs numériques : dates, notes et totaux s’alignent verticalement.
- `text-wrap: pretty` généralisé aux paragraphes, listes, définitions et
  citations (les titres gardent `balance`).
- `--app-ink` / `--app-ink-muted` ne sont plus des hex indépendants : ils
  dérivent de `--foreground` / `--muted-foreground`.

## 5. Nettoyage structurel

`theme-tokens.css` faisait 764 lignes et mélangeait trois responsabilités :

| Fichier | Lignes | Rôle |
| --- | ---: | --- |
| `theme-tokens.css` | 276 | tokens, échelle fluide, mouvement, utilitaires |
| `theme-palette.css` | 137 | palettes claire/sombre, surfaces, focus |
| `theme-base.css` | 352 | base éléments, arabes, scrollbars, accessibilité |

Les trois restent sous 400 lignes et sont importés dans cet ordre par
`styles/index.css`. `tests/readIndexCss.ts` a été mis à jour pour continuer à
lire le socle complet.

Nettoyages associés :

- `.keep-surface` supprimé (aucun consommateur) ;
- tokens `--app-surface*`, `--app-line`, `--app-accent*` supprimés (inutilisés) ;
- couleurs natives Android synchronisées : `values-night/styles.xml` et
  `themeColor.ts` passent à `#1a1817`, la nouvelle nuit CSS.

## 6. Accessibilité et préférences

- `prefers-contrast: more` : filets et encre secondaire raffermis, focus plus
  sombre, sans changer la teinte de marque.
- `prefers-reduced-transparency: reduce` : le verre redevient une surface
  opaque.
- `prefers-reduced-motion` : le scroll fluide est neutralisé (les animations de
  composants avaient déjà leurs garde-fous).
- `forced-colors` déjà couvert par `reset.css`.

## 7. Vérifications

- `tests/test-palette-contrast.ts` : **12/12**.
- `tests/run-editor-tests.mjs` (dont contrats CSS, typographie, cartes,
  paramètres, impression) : **324/324**.
- `npm run build` : ✅ 3 788 modules, budgets respectés.
- `npm run quality` : ✅ (le fichier `theme-tokens.css` quitte la baseline).

## 8. Limites

- Pas de capture d’écran de régression dans cette passe : les changements sont
  volontairement subtils et tokenisés. Une revue visuelle sur appareil réel reste
  recommandée pour valider la perception du papier chaud et des filets.
- Le rendu final dépend de la calibration de l’écran ; les valeurs sont
  exprimées en HSL pour rester ajustables sans casser les contrastes.
- Les composants qui codent encore une couleur en dur restent à migrer vers les
  jetons ; `npm run quality:css` en liste les candidats.
