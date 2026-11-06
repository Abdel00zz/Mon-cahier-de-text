# Workflow qualité — garde-fous et réparation

Le workflow transforme la dette en **cliquet** : chaque fichier trop long est
gelé dans une baseline, et toute nouvelle violation échoue immédiatement. Les
cycles d'imports, eux, sont désormais à **zéro** : le graphe statique est
propre, et toute réintroduction échoue.

## 1. Architecture

```text
scripts/quality/
  file-size.mjs      → 400 lignes, baseline + cliquet
  cycles.mjs         → graphe d'imports TS, détection Tarjan
  dead-code.mjs      → Knip JSON, filtré sur src/
  i18n-unused.mjs    → clés définies vs littéraux réellement utilisés
  css-dead.mjs       → classes candidates, doublons, !important
  run.mjs            → orchestration, artefacts, GitHub Step Summary

quality/
  file-size-baseline.json
  cycles-baseline.json
  dead-code-baseline.json

artifacts/quality/   (ignoré par Git, publié par la CI)
  report.md
  report.json
  file-size.json
  cycles.json
  dead-code.json
  i18n-unused.json
  css.json
```

La CI exécute `npm run quality` après le type-check et publie
`artifacts/quality` en artefact GitHub (14 jours) ainsi que le résumé dans
`$GITHUB_STEP_SUMMARY`.

## 2. Commandes

```bash
npm run quality          # gate complète (échoue sur nouvelle dette)
npm run quality:update   # abaisse les plafonds et supprime les entrées corrigées
npm run quality:size     # uniquement la taille
npm run quality:cycles   # uniquement les cycles
npm run quality:dead     # uniquement le code mort (Knip)
npm run quality:i18n     # candidats de traductions inutilisées (advisory)
npm run quality:css      # hygiène CSS (advisory)
```

Les analyses i18n/CSS sont **advisory** : elles produisent des candidats à
relecture, car une clé ou une classe peut être composée dynamiquement. La
taille, les cycles et le code mort sont **bloquants**.

## 3. Cliquet de taille

`quality/file-size-baseline.json` contient les fichiers historiques au-delà de
400 lignes avec leur hauteur actuelle.

- un fichier **non listé** qui dépasse 400 lignes → échec ;
- un fichier listé qui **grandit** → échec ;
- un fichier listé qui **rétrécit** → avertissement, puis `quality:update`
  abaisse son plafond ;
- un fichier repassé sous 400 → `quality:update` supprime son entrée.

Le plafond est donc strictement décroissant. Un fichier ne peut jamais
remonter.

## 4. Boucle de réparation

1. `npm run quality` : lire `artifacts/quality/report.md`.
2. Choisir le fichier le plus haut de la liste (ou un cycle).
3. Extraire un module cohérent, pas une découpe arbitraire :
   - données / rendu / parseur ;
   - hook de chargement / hook de sauvegarde / hook de présentation ;
   - composant de ligne / composant de groupe / barre d'actions.
4. `npm run lint` puis les tests ciblés (`test:editor`, `test:pilotage`, etc.).
5. `npm run quality:update` : le plafond du fichier baisse, l'entrée disparaît
   s'il est sous 400.
6. Commit séparé : `refactor(<zone>): découper <fichier> sous 400 lignes`.

## 5. Ce que le workflow utilise

- **API du compilateur TypeScript** pour parser chaque fichier et résoudre les
  imports (y compris les spécificateurs `.js` des modules ESM).
- **Tarjan** pour les composantes fortement connexes du graphe d'imports.
- **Knip** en mode JSON pour les fichiers/exports/types/dépendances inutilisés.
- **PostCSS** pour les feuilles de style, les variables, les doublons et les
  URLs.
- **Baselines JSON** versionnées et **artefacts** GitHub pour l'historique.
- **GitHub Step Summary** pour un rapport lisible directement dans l'onglet
  Actions.

## 6. État initial (6 novembre 2026)

| Indicateur | Valeur |
| --- | ---: |
| Fichiers scannés (`src`, `api`, `server`) | 761 |
| Fichiers > 400 lignes | 14 |
| Cycles d'imports | 0 |
| Code mort dans `src/` | 0 |
| Clés i18n | 1 047 |
| Clés i18n candidates | 43 |
| Classes CSS candidates | 172 |
| `!important` | 569 |

Après le premier lot de refactorisation :

- `src/i18n/messages.ts` : 2 952 → 27 lignes (barrel) + 123 fichiers de
  traductions par domaine et par langue, tous sous 400 lignes ;
- `src/types.ts` : 572 → 5 lignes (barrel) + 5 modules ;
- `src/components/typography/textFormat.ts` : 909 → 2 lignes (barrel) + 6 modules ;
- 216 clés i18n mortes supprimées (648 lignes de données) ;
- **3 → 0 cycle** d'imports : `ClassIdentity` sorti de `classAbbreviation`,
  `CompanionMessage` extrait, arêtes dynamiques exclues du graphe statique ;
- socle CSS découpé : `theme-tokens` 764 → 276 + `theme-palette` 137 +
  `theme-base` 352 ; `onboarding.css` 154 → 111 ; `class-tones.css` 419 → 399 ;
- palette claire/sombre affinée et testée WCAG (12/12), textes optiquement
  composés, focus et filets raffermis (voir
  [`css-core-hd-2026-11-06.md`](../audits/css-core-hd-2026-11-06.md)) ;
- le bloc CSS `registration-*` dupliqué de `onboarding.css` supprimé ;
- fragment i18n : **64,1 → 53,8 Ko gzip** ; JS total **970,4 → 960,4 Ko gzip**.

## 7. Règles de revue

- Ne jamais supprimer une clé i18n ou une classe CSS sans avoir vérifié les
  usages dynamiques et les tests.
- Un cycle ne se corrige pas par un `as any` : extraire le type ou la fonction
  partagée.
- Une baseline ne s'élargit jamais pour faire passer une PR ; on corrige ou on
  documente explicitement l'exception.
- Les artefacts de qualité ne sont pas commités : ils sont régénérés.
