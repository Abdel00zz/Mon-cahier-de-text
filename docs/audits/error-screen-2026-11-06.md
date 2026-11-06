# Écran de reprise — ciblé, court, robuste

**Date :** 6 novembre 2026 · **Composants :** `AppErrorBoundary`, `AppErrorScreen`,
`appErrorRecovery`, `error-boundary.css`.

## 1. Problème constaté

L’écran affiché après une erreur de module montrait :

- le même message en français **et** en arabe, soit deux fois plus de texte ;
- une icône d’alerte générique, sans lien avec la cause ;
- deux gros boutons équivalents (« Recharger » et « Retour à l’accueil ») ;
- un message brut `SyntaxError: … does not provide an export named …` visible
  dans les détails techniques, sans diagnostic ni réparation.

## 2. Nouvelle hiérarchie

1. **Figure en haut** : un cahier protégé, dessiné en SVG inline (aucun asset à
   charger), avec une pastille de validation.
2. **Titre ciblé** selon la cause :
   - module inexistant / cache incohérent → « Mise à jour incomplète » ;
   - quota de stockage → « Stockage saturé » ;
   - réseau → « Connexion interrompue » ;
   - autre → « Rien n’est perdu ».
3. **Une phrase**, dans la langue du document uniquement.
4. **Une action forte** : « Réparer et recharger » pour un module, « Recharger »
   sinon.
5. **Une sortie secondaire discrète** : « Retour à l’accueil », en lien texte.
6. **Détails techniques repliés**, réservés au support.

## 3. Réparation intelligente

`classifyAppError` reconnaît les erreurs de module (`does not provide an export
named`, `Failed to fetch dynamically imported module`, `ChunkLoadError`…), de
stockage et de réseau.

Pour une erreur de module, le bouton principal :

1. désenregistre les service workers ;
2. supprime les caches de l’origine ;
3. recharge la page.

Chaque étape est indépendante : un échec n’empêche jamais le rechargement final.
Les cahiers locaux (`localStorage`) ne sont jamais touchés.

## 4. Robustesse

- Tous les jetons CSS ont un **repli** : l’écran reste lisible même si le thème
  n’a pas fini de charger.
- Locale lue sur `document.documentElement.lang`, puis `navigator.language`,
  puis `fr`. Aucune dépendance au dictionnaire de l’application.
- SVG inline, aucune image distante.
- Cibles tactiles de 44 px, focus visible, `role="alert"`, `aria-labelledby` /
  `aria-describedby`.
- Mode sombre, RTL, `prefers-reduced-motion` et petits écrans couverts.
- Détails techniques dans un `<pre>` à hauteur bornée avec défilement.

## 5. Vérifications

- `tests/test-error-boundary.ui.ts` : 6 tests (langue unique, figure, actions,
  diagnostic module/stockage/réseau, arabe/anglais, détails repliés, réparation
  en cours).
- `tests/run-editor-tests.mjs` : **327/327**.
- `npm run lint` ✅
- `npm run build` ✅ 3 800 modules, budgets respectés.
- `npm run quality` : 0 cycle, 0 code mort.
