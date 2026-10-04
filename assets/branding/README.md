# Système visuel Cahier — Optical

Les pictogrammes fonctionnels utilisent les tracés Ionicons 8.0.13 (MIT), normalisés sur une grille de 24 × 24 avec un trait de 1,65 px. Les variantes pédagogiques et les signes typographiques sont dessinés dans la même grille. Attribution : `IONICONS-LICENSE`. Ils restent monochromes et héritent de la couleur sémantique de leur contexte.

Les huit illustrations et le symbole de marque sont des créations SVG propres au projet. Leur matière commune repose sur des faces opaques, une tranche translucide, un reflet supérieur et deux ombres statiques. Chaque instance dispose de ses propres identifiants SVG. Les animations d'entrée durent 280 ms et respectent `prefers-reduced-motion`.

Les surfaces d'icônes des cartes d'action ont un reflet au survol et une légère compression au clic. Les petits pictogrammes ne portent aucun flou.

- Aperçu interactif : lancer Vite puis ouvrir `/scripts/visual-review/index.html` (page de développement exclue des entrées de production).
- Marque web et Android : `node scripts/assets/render-app-icon.mjs <chemin-vers-sharp>`.
- Les PNG natifs reprennent exactement le dessin SVG, y compris sur les versions Android anciennes. La variante de notification et la variante monochrome restent vectorielles.

Références de conception : [Apple — Liquid Glass](https://developer.apple.com/documentation/TechnologyOverviews/liquid-glass), [Ionicons](https://github.com/ionic-team/ionicons).
