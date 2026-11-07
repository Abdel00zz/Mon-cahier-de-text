# Tableau : alignements, déplacement et fluidité — 7 novembre 2026

## Présentation

Les trois en-têtes sont centrés dans leurs cellules. Le style de lecture ne
supprime plus la bordure de fin du contenu : la séparation avec Remarque
reste continue, sur les lignes seules comme sur les séances fusionnées.
Les icônes vides Date et Remarque sont grises, à 55 % d’opacité ; le focus
et le survol les renforcent sans réduire leurs cibles tactiles.

Le déplacement reprend l’effet du fichier fourni `قسم الجذع العلمي 1.html` :
le contenu, ses badges et ses formules sont soulevés dans leur colonne et
suivent le pointeur. La copie est inerte, sans identifiants dupliqués ; sa
typographie reste celle de la source. Les coordonnées des destinations sont
lues ensemble avant l’animation de dépôt de 240 ms. La préférence de réduction
des animations est respectée. Les plans de déplacement et l’historique restent
ceux de l’application.

## Causes et corrections

- Les cellules répétaient la validation du calendrier pour la même date,
  notamment après une attribution. Un cache borné à 512 dates partage ces
  résultats. Il dépend de la classe, de la langue, des horaires, des absences
  et de l’année scolaire ; un calendrier ou bulletin actualisé le vide.
- Les formateurs de dates étaient recréés pendant certaines validations.
  Ils utilisent maintenant le cache de formateurs existant.
- La projection d’un cahier modifié recrée ses coordonnées. Le composant de
  contenu confondait ces nouvelles références avec un changement de texte et
  recomposait les formules inchangées. La comparaison prend désormais en compte
  les valeurs des coordonnées et tous les autres paramètres du contenu.
- La sélection passait par une transition différée, avec un rendu d’attente
  désactivant brièvement les actions. La mise à jour de la sélection est directe.

## Mesures locales de production

Deux compilations du même banc, avant et après, avec des données synthétiques.
Edge sans extension, écran 390 × 844, CPU ralenti ×4, douze affectations de date
par taille de cahier, chacune suivie d’une annulation. Durée jusqu’à la seconde
image d’affichage après l’action, en millisecondes. Aucun appel cloud inclus.

| Contenus | Date avant, médiane | Date après, médiane | Sélection avant / après, médiane |
| --- | ---: | ---: | ---: |
| 120 | 765 | 123 | 40 / 47 |
| 1 200, tableau virtualisé | 426 | 81 | 34 / 27 |

La validation et la composition expliquent un gain local d’environ 5 à 6 fois
sur cette attribution de date. Le gain de sélection varie selon le cahier ;
ces chiffres ne promettent pas une latence identique sur tous les appareils.
Les mesures de développement, plus coûteuses, ne sont pas utilisées dans ce tableau.

Le site fourni répond en HTTP 200 et sert la version 1.2.17 construite le
6 novembre 2026 à 22:43 UTC. Les modifications de cette passe sont locales,
sans publication. Le cahier réel de l’utilisateur n’a pas été modifié.

## Vérification et traces

- Suite complète : 948 tests de domaine et 330 tests d’interface réussis,
  un test ignoré. Les tests d’interface ont été rejoués après la finition du déplacement.
- Vérification dans le navigateur : en-têtes, filets, icônes, absence de
  débordement, français/arabe, mobile/bureau, clair/sombre ; déplacement à
  la souris, tactile et clavier, annulation et réduction des animations.
- TypeScript, architecture et compilation contrôlés ; budgets JS/CSS respectés.
- Captures : `tmp/editor-polish-visual/`. Mesures :
  `tmp/editor-performance-production-before.json` et
  `tmp/editor-performance-production-after.json`.
- Point de récupération : `tmp/editor-polish-recovery-20261107/`.

Le banc de comparaison reste dans `tmp/` et n’est pas intégré à l’application.
