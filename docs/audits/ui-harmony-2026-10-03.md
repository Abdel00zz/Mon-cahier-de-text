# Harmonisation des interfaces — 3 octobre 2026

Les modales partagent maintenant une typographie adaptée à la langue, des surfaces neutres, une séparation discrète entre le contenu et les actions, ainsi que des cibles tactiles de 44 px minimum. Les styles historiques concurrents ont été retirés de la feuille globale.

## Changements livrés

- Cartes de sauvegarde, compte et assistance : icônes Lucide correctement rendues, libellés complets, descriptions lisibles et accents limités aux repères utiles.
- Paramètres : navigation mobile persistante, ouverture plus ample et actions de profil placées dans un pied de fenêtre fixe. Une fermeture conserve le contrôle des changements non enregistrés.
- Contenus : champs de description agrandis et titres de chapitres lisibles, avec les actions de déplacement séparées sur téléphone.
- Import et restauration : boutons communs, erreurs contextualisées, choix de fichier neutre et avertissement ambre. L’action qui remplace une sauvegarde complète conserve sa couleur destructive.
- Impression : sélecteur commun accessible au clavier, avec déplacement logique des flèches en arabe et saut des choix désactivés.
- Fenêtres imbriquées : chaque nouveau voile couvre la surface précédente, y compris les confirmations rendues comme composants frères. Le focus et la fermeture restent gérés par Radix.
- Commutateurs : curseur contenu dans sa piste, animation courte et suppression des effets de flou superflus. Les actions de compte et d’archives respectent la réduction des animations.
- Aide et évaluations : largeur du guide adaptée au téléphone et titres d’évaluation sans troncature du contexte.

## Vérifications

La galerie de développement monte 20 fenêtres de production avec des classes et séances fictives. Revue visuelle sur téléphone des 20 fenêtres, des trois formulaires imbriqués d’activité, devoir et absence, puis de l’accueil, de la connexion et de l’activation des notifications en simulation. Contrôles supplémentaires en arabe et mode sombre à 320 px, sur téléphone à 390 px, sur ordinateur à 1280 px et en paysage à 720 × 360 px.

Les corps des 20 fenêtres françaises examinées ne débordent pas horizontalement. En paysage, le contenu d’impression défile pendant que les actions restent visibles. Le profil non enregistré reste intact après « Continuer à modifier ». Les flèches du clavier changent correctement de choix dans les deux directions, et ignorent un onglet désactivé. La simulation de notifications passe de l’autorisation à « Continuer l’activation », puis à l’état actif.

Contrastes des cartes d’action mesurés sur le thème standard : titres 14,57:1 en clair et 13,42:1 en sombre ; descriptions 6,66:1 et 7,38:1. Cette mesure porte sur ces cartes, sans constituer un audit WCAG complet des palettes personnalisées.

`npm run check`, `npm test` (323 tests réussis) et `npm run build:android:web` passent. Le build Android web conserve l’avertissement de taille du chunk principal ; aucun APK signé ni test sur appareil physique n’est produit par cette révision d’interface.

Les captures et sorties détaillées sont conservées localement dans `artifacts/ui-harmony/`. La galerie est accessible via `/scripts/guide-preview/?screen=modals&modal=settings&lang=fr` en développement et n’est pas embarquée dans les builds de production.
