# Aperçus de l’application

Cette page de développement affiche les vrais composants `ClassCard`, `MainTable`
et `ScheduleTab`, avec des données de démonstration bilingues. Aucune donnée de
compte n’est utilisée. Elle ne fait pas partie des entrées du build de production.

1. Lancer `npm run dev` et ouvrir `/scripts/showcase-preview/index.html`.
2. Capturer chaque combinaison `?lang=fr|ar&screen=classes|editor|schedule`.
   Utiliser un viewport de 1280 × 880 pour le PC, 560 × 850 et `&portrait` pour le
   mobile. Attendre le chargement des polices et la visibilité des `mjx-container`.
3. Enregistrer les PNG dans `tmp/showcase-captures`, sous les noms
   `{landscape|portrait}-{fr|ar}-{classes|editor|schedule}.png`.
4. Exécuter `python scripts/build-showcase-gifs.py --capture-scale 1` (Pillow).
   Les exports du navigateur intégré de cette session ont une surface visible à
   80 % : ils utilisent `--capture-scale 0.8` pour retirer la marge d’export.

Le générateur retire le fond neutre contigu sans effacer les surfaces blanches de
l’interface. Les GIF transparents conservent chaque scène 2,8 secondes et
utilisent une palette commune. Le cadrage ordinateur est resserré à 1024 × 672 ;
les portraits restent à 448 × 680. Les WebP transparents servent d’affiches
statiques pour la pause et la réduction des animations.
Vérifier les quatre GIF avant de remplacer les fichiers de `public/showcase`.
