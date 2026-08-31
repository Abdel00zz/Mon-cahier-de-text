# Authentification et surfaces Keep — validation du 31 août 2026

## Modifications

- Connexion et inscription : barre bilingue, aperçu HTML localisé et mémoïsé, contrôle segmenté à ressort, saisie lisible sur mobile, champs associés à leurs labels, visibilité et Caps Lock, jauge indicative à quatre segments.
- Téléphone : format local, collage +212 / 00212 et chiffres arabes/persans ; badge uniquement pour un numéro complet. Les anciens comptes à huit chiffres restent saisissables.
- Cartes et listes : couleurs déterministes par identifiant, cinq pastels avec variantes sombres, bordures Keep, rayons 12/8 px. Actions ouvrir/configurer séparées en boutons natifs ; réglages visibles au toucher.
- Choix de l’onboarding, création de classe et cycles des paramètres : surfaces et sélection harmonisées. Le parcours adaptatif par cycle est conservé.
- Modales : séparateurs fins, fermeture de 44 px, titres de section utiles conservés sans répéter le titre de l’onglet. Champs établissement/AREF/direction provinciale liés à leurs labels.
- Correction globale du thème : les variantes Tailwind `dark:` suivent désormais `.dark`, déjà pilotée par `useTheme`, au lieu de suivre indépendamment la préférence système.
- Suppression de la largeur minimale du body qui provoquait un débordement avec la scrollbar à 320 px. Zoom tactile réactivé.

## Vérifications

Tests automatisés :

```sh
npm run lint
npm run check:i18n
npx tsx scripts/test-auth-ui.ts
npx tsx scripts/test-class-creation.ts
npm run build
```

Les six tests auth/UI couvrent les téléphones, la jauge, la stabilité des couleurs, les libellés et le contraste AA des cinq pastels (texte secondaire, clair et sombre). Les 18 tests de création couvrent les cycles et les groupes.

Contrôles navigateur sur une page temporaire isolant les composants réels : français/arabe, 320 et 390 px, paysage 844 × 390 et bureau 1440 × 1000. Champs auth de 48 px, texte mobile de 16 px, contrôles auth de 44 px minimum ; pas de débordement horizontal après correction. Vérification des erreurs de confirmation FR/AR, des libellés institutionnels AR/EN, du menu Académie, de la création avec cycle unique, des deux vues de classes et du thème sombre. La page de test est supprimée après contrôle.

## Limites et formulation

- Pas de compte réel créé ni de données d’enseignant modifiées ; les appels serveur de connexion/inscription ne font pas partie de ces tests visuels.
- Caps Lock et clavier physique restent à valider sur appareils réels. Aucune mesure de FPS ou de temps de réponse en production n’est revendiquée.
- « Hors-ligne & Cloud » précise qu’une première connexion et une connexion Internet pour synchroniser sont nécessaires ; la promesse absolue « 100 % » n’est pas utilisée.
- Le badge institutionnel reprend le libellé demandé. Il ne constitue pas une vérification d’agrément par une autorité publique.
