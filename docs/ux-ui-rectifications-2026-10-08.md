# Rectifications UX/UI — 8 octobre 2026

Lot regroupant les modifications UX/UI autorisées pour le push sur `main` et la génération de l’APK. La validation visuelle reste à la charge de l’utilisateur, conformément à sa demande. Aucune nouvelle capture n’a été réalisée pour ce lot ; les images antérieures de `screenshots-ui/` ne prouvent pas le rendu actuel.

| ID | Écran / problème avant | Correction et résultat après | Impact / priorité | Critère d’acceptation |
| --- | --- | --- | --- | --- |
| UI-001 | Menu des cartes : espaces, séparateurs et flou coûteux | Trois actions compactes, sans séparateurs, surface opaque, animation de 150 ms, cibles ≥ 44 px et réduction des mouvements | Accès direct aux actions / P1 | Le menu ouvre les évaluations de la bonne classe, ses réglages et sa confirmation de suppression ; utilisable au clavier en RTL/LTR |
| UI-002 | Cartes et barre du dashboard : identité et accents hétérogènes | Placement rapproché du numéro et du libellé, coins plus sobres, barre mobile alignée, accents issus du thème | Lecture et cohérence / P1 | Titres longs et groupes à deux chiffres lisibles en portrait ; couleurs valides en clair/sombre |
| UI-003 | Suppression d’une activité ou d’un devoir depuis la liste | Confirmation nommée, conséquences propres à chaque opération, saisie du nom avant suppression, messages FR/AR/EN | Prévention d’une perte accidentelle / P0 | Annuler conserve les données ; un nom incorrect empêche la validation |
| UI-004 | Import du cahier : confirmation possible avant inspection | Aperçu produit par le même moteur de validation que l’import, fichier/date/version disponibles et nombre de blocs ; remplacement explicitement accepté | Prévention d’un remplacement erroné / P0 | JSON invalide ou plusieurs cahiers refusés ; changer le fichier ou le texte invalide l’accord précédent |
| UI-005 | Restauration globale : fichier lu sans aperçu validé | Validation complète avant accord, aperçu des classes/blocs, erreur dans la modale, verrou immédiat des soumissions concurrentes | Fiabilité de la restauration / P0 | Une sauvegarde incompatible ne peut pas être confirmée ; fermeture bloquée pendant l’écriture |
| UI-006 | Suppression locale : nettoyage incomplet et échec de stockage silencieux | Retrait des listes d’élèves, suivis et documents associés à la classe ; échec de persistance propagé à la confirmation | Cohérence locale/cloud / P0 | Un échec de stockage conserve le cahier et ne poursuit pas le nettoyage des réglages |
| UI-007 | Identité de classe : niveau/filière/groupe perdus dans le circuit administrateur | Identité structurée issue du formulaire partagé, transmission et validation API, conservation par la synchronisation | Correspondance aux programmations officielles / P0 | Le niveau et le groupe saisis restent présents après création administrateur et lecture enseignant ; valeur non textuelle refusée |
| UI-008 | Revue de date : date abrégée et bouton générique | Jour de semaine et date complète, actions « Modifier la date » / « Utiliser cette date », icône réduite | Décision contextualisée / P1 | Date lisible dans les trois langues ; une date illisible ne déclenche pas de validation |
| UI-009 | Boutons, administration et apparence : accents et pictogrammes hétérogènes | Bouton principal suivant le thème, pictogrammes partagés pour les actions administrateur, aperçu typographique arabe et latin | Cohérence et lisibilité / P1 | L’aperçu affiche « درس » et « Leçon » ; actions destructives toujours rouges |
| UI-010 | Évaluations : intitulés, actions et répétitions visuelles | Actions plus explicites, regroupement des familles conservé, descriptions répétées masquées, commandes tactiles plus grandes | Lisibilité pédagogique / P1 | La classe ne doit pas être redemandée ; documents, élèves, dates et états restent accessibles |
| UI-011 | Édition / impression : formulations et alignements | Libellés harmonisés, traitement de la remarque en portrait, adaptation commune de l’affichage imprimé | Continuité écran/papier / P1 | Les données et la hiérarchie du cours restent inchangées ; vérification finale du rendu par l’utilisateur |

## Validation technique

- Tests de domaine et de composants, dont aperçu des imports, absence de métadonnées inventées et refus d’une suppression locale non persistée.
- Test Firebase sur émulateurs : identité de classe transmise par l’administration, lecture enseignant, imports, listes d’élèves et résistance aux envois périmés.
- Contrôles TypeScript/architecture, imports API, code inutilisé, traductions, données et secrets ; compilation web et Android.

## Couverture du guide

Ce registre décrit le lot effectivement livré ; il ne constitue pas une validation visuelle exhaustive du guide. Le parcours progressif, le formulaire de classe partagé, les feuilles mobiles, le suivi des cahiers et de l’oral, la recherche et la séparation contenu/activités reposent sur les mécanismes existants. La séparation explicite présence/qualité du cahier, un objectif de compétence pour l’oral et une protection généralisée des brouillons demandent un lot fonctionnel distinct ; aucun champ existant « cahier non apporté » n’a été requalifié en absence de l’élève.
