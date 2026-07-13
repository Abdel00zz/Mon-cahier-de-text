# UX — Cahier de textes interactif

## Intention

L’application aide l’enseignant à comprendre, décider et agir rapidement sur téléphone. Le contenu pédagogique reste central ; les indicateurs orientent sans juger.

## Principes

1. Un écran porte une intention principale.
2. Une information apparaît à l’endroit où elle peut être corrigée.
3. Une exception importante demande une décision explicite.
4. Quatre informations essentielles au maximum dans un résumé.
5. Le mobile est la référence : cibles de 44 px, texte lisible et actions atteignables au pouce.
6. Les surfaces ont un contour complet et une séparation nette ; les décorations gratuites sont évitées.

## Navigation

- Il n’existe pas de sidebar.
- L’accueil donne un accès direct au **Guide** et aux **Paramètres**.
- Les actions propres à une classe vivent dans son menu `…` : importer, exporter, historique, évaluations et gestion des contenus.
- Les libellés décrivent l’action ; une icône seule possède toujours un nom accessible.

## Accueil Mes classes

- La salutation ne porte aucun compteur.
- Le titre forme une unité : **Mes classes · 4 classes**, sans sous-titre ni soulignement.
- La recherche fermée est un bouton bleu compact à droite. Ouverte, elle s’élargit dans la rangée et pousse les autres actions sans chevauchement.
- Le briefing affiche au plus quatre repères réellement utiles et actualisés.
- La matière apparaît en haut à gauche de chaque carte.
- Le nom complet et lisible de la classe reste le point focal.
- Le pied de carte est séparé sur toute la largeur et contient prochaine séance et mise à jour.

## Dates et messages

- Toutes les saisies de date passent par la même validation.
- Une date hors emploi du temps, en vacances, un dimanche, pendant une absence ou hors année scolaire ouvre un dialogue de vérification.
- Le dialogue explique chaque raison et propose **Modifier la date** ou **J’ai compris, enregistrer**.
- **Modifier la date** ramène directement à la planification de l’élément concerné.
- Les toasts sont réservés aux confirmations brèves qui n’exigent aucune décision.

## Cahier et tableau

- L’identité de la classe, le professeur et l’établissement sont lisibles, alignés et non enfermés dans une carte décorative.
- Le tableau possède un contour externe complet et des séparateurs internes plus discrets.
- Les en-têtes ne sont pas soulignés.
- Un chapitre est rouge, élégant, accompagné d’une icône livre à gauche et jamais souligné.
- Les contenus affectés à une date utilisent un fond distinct mais doux.
- Le LaTeX fonctionne dans le cahier, les recherches, la prochaine séance et l’impression.

## Modales et panneaux

- Pas de bouton `X` visible.
- La sortie est explicite : **Fermer**, **Annuler**, **Appliquer** ou l’action métier précise.
- Sur téléphone, une modale devient une feuille en bas avec hauteur limitée, contenu scrollable et respect de la zone sûre.
- Sur ordinateur, elle est centrée sans être surdimensionnée.
- Une modale ne cache pas la destination d’une action : les transitions vers date, emploi du temps ou source du problème sont directes.
- Les lignes décoratives inutiles sont supprimées ; espacement et hiérarchie remplacent les séparateurs.

## Guide

- Surface jaune papier de livre, chaude et légère.
- Texte plus grand, mots clés en gras, paragraphes courts.
- Au moins six captures ou GIF expliquent les gestes importants.
- En arabe, `dir="rtl"` s’applique à tout le contenu et le sommaire est placé à droite.
- Le pied possède un bouton **Fermer** bien placé.

## Mouvement et notifications

- Les transitions durent environ 180 à 300 ms et expliquent un changement d’état.
- Aucun clignotement décoratif ; un signal animé est réservé à une action réellement requise.
- `prefers-reduced-motion` désactive les mouvements non indispensables.
- L’autorisation des notifications natives est demandée après la configuration initiale, avec une explication préalable.
- Vibration et push respectent les préférences et ne remplacent jamais un message persistant à traiter.

## Accessibilité et responsive

- Focus clavier visible, ordre de tabulation logique et titres hiérarchisés.
- Contraste suffisant et aucun état communiqué uniquement par couleur.
- Texte agrandissable à 200 % sans perte d’action.
- Validation minimale : 320×568, 360×800, 390×844, 430×932, 768×1024, 1024×1366 et 1440×900.
- Le clavier mobile, le mode paysage et les zones sûres iOS/Android ne doivent masquer aucune action primaire.

## Checklist de revue

- [ ] L’utilisateur comprend-il immédiatement l’intention de l’écran ?
- [ ] L’action principale est-elle unique et explicite ?
- [ ] Une non-conformité mène-t-elle directement à sa source ?
- [ ] La recherche ouverte reste-t-elle alignée sans chevauchement ?
- [ ] Le parcours fonctionne-t-il à 320 px, au clavier et en RTL ?
- [ ] Le mouvement apporte-t-il une information réelle ?
- [ ] Le composant respecte-t-il le circuit métier unique ?
