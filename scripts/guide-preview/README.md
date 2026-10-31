# Captures du guide

Cette entrée Vite de développement monte les **composants de production**, avec des
classes et contenus fictifs. Aucun fournisseur de synchronisation cloud n’est monté.
Les paramètres et la connexion utilisent le fournisseur de compte sur l’origine locale.
Les réglages du banc restent en mémoire React. Ne pas activer les
notifications système ni utiliser un compte enseignant pour réaliser les captures.

## Reproduire

1. Lancer `npm exec vite -- --host localhost --port 5186`.
2. Ouvrir `/scripts/guide-preview/?screen=guide&lang=fr` sur cette origine locale.
3. Les écrans disponibles sont `classes`, `schedule`, `editor`, `add`,
   `notifications`, `dates`, `appearance`, `guide`. Langues : `fr`, `ar`.
4. Tester les formats ordinateur 1120 × 800 et téléphone 390 × 844.
5. Capturer les composants réellement rendus, sur ordinateur et téléphone.
   Vérifier les pixels, le cadrage, la lisibilité et l’absence de données personnelles.
   Enregistrer les images dans `public/guide/current/<screen>-<lang>.webp`, puis
   reporter leurs dimensions exactes dans `GuideFigure.tsx`.
6. Exécuter `npm run test:guide`, `npm run check:architecture` et `npm run build`.

Captures renouvelées le 29 octobre 2026 : dix écrans bilingues (20 images)
et deux vues mobiles utilisées dans le téléphone de la connexion.

Pour les régénérer, démarrer `npm run dev` (port 3000), puis exécuter
`node scripts/generate-guide-images.mjs`. Le script ouvre un profil Edge isolé,
attend le contenu et les polices locales, masque les barres de défilement et
encode les captures en WebP. Vérifier ensuite les images et lancer
`npm run test:guide`. Aucun compte réel n'est nécessaire.

## Maintenance

- `src/constants/guides.ts` : index et recherche ; `src/constants/guide/` : un fichier par chapitre bilingue.
- `src/features/guide/GuideText.tsx` : emphase sûre des mots-clés, sans HTML brut.
- `src/features/guide/GuideFigure.tsx` : captures réelles, dimensions intrinsèques, agrandissement, erreur et nouvelle tentative.
- `guide.css` : cadre des captures et lecture sur téléphone.
- Ne jamais reconstruire une interface en HTML/CSS pour la présenter comme une capture.
- Une image ancienne ne doit pas être présentée comme la version actuelle.
- Tester recherche accentuée/arabe, résultat vide, changement de langue, lecture
  RTL/LTR, agrandissement, navigation clavier, fermeture et thème sombre.
- Cette entrée n’est pas une entrée de compilation Vite et ne doit pas être publiée.
# Atelier des modales

`?screen=modals&modal=settings&lang=fr` présente les composants réels avec des données fictives. La galerie permet d'inspecter 20 fenêtres (classes, séances, impression, sauvegardes, paramètres, aide et administration), en français, arabe ou anglais et dans les deux thèmes. Les actions de démonstration ne sauvegardent pas de données dans le cloud. Les évaluations permettent aussi d'ouvrir les formulaires imbriqués d'activité, de devoir et d'absence.

`?screen=auth&lang=fr` affiche l'accueil et la connexion réels. Ne soumettez pas de véritables identifiants dans cet aperçu. `?screen=feedback&lang=fr` simule les états d'activation des notifications sans demander de permission ni envoyer de push.
