# Interface de lecture, pages mobiles et suivi — 7 novembre 2026

## Références et périmètre

Les fichiers fournis `دفتر نصوصي (2).html` et `قسم الجذع العلمي 1.html`
servent de références visuelles. Les demandes de l’utilisateur priment sur
leurs choix de code et de polices. Aucun moteur de données, d’ordre ou de
déplacement issu de ces démonstrations n’a remplacé celui de l’application.

## Résultat

- Paramètres mobile : six rubriques dans une page, avec les mêmes composants
  que sur ordinateur. Brouillon du profil enregistré après 400 ms, puis vidé
  immédiatement lors d’une sortie ou avant un changement d’espace de compte.
- Aide recodée : quatre groupes, vingt chapitres bilingues, recherche indexée
  une fois par langue, réponses montées à l’ouverture, liens contextuels et
  fermeture visible sur ordinateur. Page continue sur mobile.
- Suivi : un composant `EvaluationDate` pour toutes les dates et périodes.
  Affichage gris de 11 px, centré, sans cadre et sans commande d’édition.
  Retrait des chemins de modification de date et de titre depuis cette feuille.
  Documents, élèves et suppressions confirmées restent accessibles.
- Cartes pastel conservées, badge « séance en cours » retiré. Modales compactes
  avec des en-têtes et pieds sans séparateurs décoratifs.
- Tableau : Lexend, Bricolage Grotesque et IBM Plex Sans Arabic embarquées avec
  leurs licences. Lettre de section dans un carré arrondi. Dates et remarques
  en pastilles dans les colonnes **Date · Contenu · Remarque**, dont les titres
  restent visibles sur mobile. Une paire de repères par séance fusionnée.
  Les gestionnaires d’événements,
  la hiérarchie, les règles de déplacement, l’annulation et l’impression restent
  ceux de l’application. La présentation ne modifie pas les données.
- Nettoyage : contenu des réglages partagé, ancienne navigation mobile par
  onglets retirée, commandes et styles de date obsolètes supprimés, imports
  inutilisés retirés. Les archives documentaires sont exclues du détecteur de
  code mort, sans effacer leurs ressources.

La vérification de navigation a également révélé un démarrage bloqué lorsque
des cahiers locaux n’étaient pas encore associés au cloud. Le chemin de retour
passait le statut de synchronisation à `idle` mais laissait sa progression à
`pulling`. Les deux états sont maintenant libérés ensemble.

## Vérification

Les captures et relevés locaux se trouvent dans `tmp/mobile-pages-visual/` et
`tmp/editor-reading-visual/`. Ils couvrent le français et l’arabe, les modes
clair et sombre, les largeurs 360/390 px et le bureau, les seize natures de
suivi et la correction du devoir maison.

Un navigateur Edge isolé et une API de développement indépendante ont vérifié
les six sections mobiles sans dialogue, les vingt chapitres d’aide, la recherche,
l’enregistrement du profil lors d’une navigation en moins de 400 ms, le retour
arrière, le rechargement, le lien vers l’emploi du temps et la modale de bureau.
Dans le véritable éditeur : sélection, déplacement au clavier, annulation,
ouverture de la date et de la remarque d’une séance fusionnée ont été exercés.

Validation finale : 946 tests de domaine réussis (un ignoré), puis 328 tests
d’interface réussis, rejoués après le rétablissement des trois colonnes.
TypeScript, architecture, code inutilisé, parité des traductions et compilation
réussissent. Les budgets sont respectés : 935,1 kB de JavaScript et 111,9 kB de
CSS compressés. La vérification visuelle confirme les trois colonnes en français
et en arabe, sur ordinateur et téléphone, sans débordement ni erreur d’exécution.
Les journaux se trouvent dans `tmp/`. Il s’agit de tests locaux avec des données
synthétiques, sans publication ni compte réel.

## Préservation

Points de récupération locaux : `tmp/mobile-pages-recovery-20261106-160640/`,
`tmp/mobile-pages-style-before/` et `tmp/editor-style-recovery-20261107/`.
L’arbre contient également des travaux simultanés d’autres interventions ;
aucune remise à zéro ou restauration massive n’a été utilisée.
