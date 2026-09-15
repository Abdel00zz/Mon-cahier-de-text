# Captures du guide

Cette entrée Vite de développement monte les **composants de production**, avec des
classes et contenus fictifs. Aucun fournisseur de compte ou de synchronisation
n’est monté. Les réglages du banc restent en mémoire React. Ne pas activer les
notifications système ni utiliser un compte enseignant pour réaliser les captures.

## Reproduire

1. Lancer `npm exec vite -- --host localhost --port 5186`.
2. Ouvrir `/scripts/guide-preview/?screen=guide&lang=fr` sur cette origine locale.
3. Les écrans disponibles sont `classes`, `schedule`, `editor`, `add`,
   `notifications`, `pilotage`, `dates`, `appearance`, `guide`. Langues : `fr`, `ar`.
4. Tester les formats ordinateur 1120 × 800 et téléphone 390 × 844.
5. Attendre le rendu MathJax avant les captures d’éditeur. La capture des cartes
   est recadrée sur les 260 premiers pixels. Le cours français reste en LTR même
   avec l’interface arabe : ne jamais appliquer la langue de l’interface aux formules.
   Le choix de date est recadré à (208, 177), 704 × 446 ; l’apparence à (20, 20),
   1060 × 644 pour montrer seulement le thème et la palette. Les autres montrent
   la zone visible. Relever de nouveau ces zones si la mise en page change.
6. Capturer à la résolution native, puis recadrer si nécessaire. Vérifier le fichier
   enregistré : certains outils de capture recadrée décalent les pixels avec le zoom
   Windows. Convertir en WebP dans `public/guide/current/<screen>-<lang>.webp`.
   Conserver les pixels de l’interface ; aucune reconstruction graphique.
7. Exécuter `npm run test:guide`, `npm run lint` et `npm run build`.

Les images ont été renouvelées le 14 septembre 2026. Les états de permissions
reflètent le navigateur de capture (notifications bloquées), pas une activation
simulée. L’horloge et les données d’exemple ne décrivent aucun compte réel.

## Maintenance

- `constants/guides.ts` : contenus FR/AR, liens entre chapitres, mots de recherche.
- `features/guide/GuideText.tsx` : emphase sûre des mots-clés, sans HTML brut.
- `features/guide/GuideFigure.tsx` : cadre, zoom intégré défilable, erreur et nouvelle tentative.
- `vite.config.ts` : précache des captures pour l’application installée.
- Les dimensions déclarées dans `GuideFigure` doivent rester celles des fichiers.
- Tester recherche accentuée/arabe, résultat vide, changement de langue, lecture
  RTL/LTR, ouverture d’image, navigation clavier, fermeture et thème sombre.
- Cette entrée n’est pas une entrée de compilation Vite et ne doit pas être publiée.
