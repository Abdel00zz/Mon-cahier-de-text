# Fenêtres mobiles — cartes flottantes et mouvement ressort

## Intention

Sous 768 px, une fenêtre ordinaire n’est plus un écran plein : c’est une **carte posée en bas**, à 10 px des bords, qui suit son contenu et s’arrête avant la zone sûre. Les fenêtres à navigation interne (Paramètres, Aide) gardent presque toute la hauteur, mais conservent leurs marges et leurs coins.

## Dimensions

| Élément | Règle |
| --- | --- |
| Largeur | `calc(100% - 20px)`, jamais bord à bord |
| Hauteur | `auto`, limitée par `--modal-visible-height` |
| Hauteur maximale | `100dvh − safe-top − safe-bottom` |
| Rayon | `clamp(1.5rem, 7vw, 2rem)` |
| Bords | 10 px, plus `env(safe-area-inset-*)` |
| En-tête / pied | collants, fond opaque |
| Feuilles (`sheet`) | largeur `min(100% − 20px, 34rem)`, coins supérieurs 1.65rem |

Les variables `--modal-visible-height`, `--modal-visible-top` et `--modal-keyboard-inset` viennent du viewport service : la carte reste au-dessus du clavier Android/iOS.

## Mouvement

- Entrée : `modal-mobile-card-in`, 320 ms, montée de 30 px avec léger dépassement puis stabilisation.
- Sortie : `modal-mobile-card-out`, 180 ms.
- Feuilles : `react-modal-sheet` en `detent="content"`, glissement et vélocité, `tween` 320 ms `cubic-bezier(.16,1,.3,1)`.
- Voile : fondu 200 ms.
- `prefers-reduced-motion: reduce` supprime toutes les animations et transitions.
- `prefers-reduced-transparency: reduce` rend les surfaces opaques.

## Accessibilité

- `role="dialog"` et focus Radix conservés.
- Cibles tactiles 44 px minimum.
- Le bouton fermer reste dans le coin, à 10 px du bord de la carte.
- Le corps défile (`overflow-y: auto`, `overscroll-behavior: contain`) sans déplacer l’en-tête.

## Vérification

- `tests/test-mobile-layout.ts` : carte flottante, largeur, rayon.
- `tests/test-modal-motion.ts` : socle, verre, réduction de mouvement.
- Suite UI : 327 tests.

## Effet liquid

Le module [liquid-modal.css](../../src/components/ui/liquid-modal.css) ajoute :

- un liseré conique irisé qui tourne lentement (`--liquid-angle`) ;
- un reflet radial qui respire derrière le contenu ;
- un fond translucide + `backdrop-filter` uniquement sur mobile ;
- repli opaque sans `backdrop-filter` ;
- désactivation complète en `prefers-reduced-transparency` et `prefers-reduced-motion`.
