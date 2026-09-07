# Audit ciblé — progression légère

## Avant correction

| Fichier | Zone | Problème | Catégorie |
| --- | --- | --- | --- |
| components/CurriculumChapterProgress.tsx | Chaque chapitre | Deux pistes et plusieurs lignes (dates, durées, alertes, taux manquants) | A, B |
| features/editor/modals/AnalysisModal.tsx | Liste de chapitres | Titre officiel ajouté au titre personnel, phrase explicative répétée et repères calendrier dupliqués | A |
| components/CurriculumProgressLabel.tsx | Résumé | Consigne de configuration et rythme ajoutés systématiquement | A |
| components/OfficialCurriculumModal.tsx | Association | Deuxième vue complète du programme avec détails techniques | A, B |

## Corrections

- `components/ui/dual-progress-bar.tsx` : composant partagé, une seule piste de 8 px, couleur `primary` pour l’avancement, `primary/10` pour le restant. Fin repère sur la cible calculée, y compris lorsque l’avancement la dépasse. Pas de nouvelle couleur de marque ni dépendance.
- `components/CurriculumChapterProgress.tsx` : adaptateur de données uniquement, sans texte métier visible. Une donnée inconnue produit une piste neutre, pas un zéro inventé ni une animation de chargement.
- `features/editor/modals/AnalysisModal.tsx` : titre personnel seul, une barre par chapitre, retrait du texte officiel et des repères calendrier ; les alertes restent centralisées dans le Centre de pilotage. Le balayage récursif des dates a été supprimé de cette modale, tandis que la prop publique `getDateWarnings` reste tolérée pour compatibilité.
- `features/editor/EditorModals.tsx` : le workflow d’analyse ne reçoit plus le callback de validation calendrier ; il reste disponible pour les saisies de dates qui en ont besoin.
- `components/CurriculumProgressLabel.tsx` : un résumé court, sans avertissement technique ; couleur de texte `foreground/80`.
- `components/OfficialCurriculumModal.tsx` : association facultative et sauvegarde inchangées ; suppression de la liste secondaire du programme. Les noms officiels restent uniquement dans le sélecteur où le professeur réalise explicitement ses correspondances.
- `docs/previews/dual-progress-bar.svg` : aperçu vectoriel illustratif reprenant les tokens du thème bleu existant (40 % de progression, repère à 70 %), pas une capture d’un compte utilisateur.

## Vérification et limites

- 43 tests de calcul : cache, changement de jour/année, exclusions, début/fin et synchronisation de données.
- 5 tests de rendu statique React : piste unique, aucun texte visible, titre accessible, RTL, bornes, valeurs manquantes, mouvement réduit et absence des repères calendrier dans la modale d’analyse.
- Tests navigateur existants adaptés au nouvel affichage, mais non relancés : le service d’autorisation a refusé la relance de compilation à cause d’une limite d’usage. Aucun contournement effectué.
- Le repère et les pourcentages sont exposés au survol et aux lecteurs d’écran. Aucune information de correspondance officielle ne sert de titre visible dans l’analyse.
- Le contraste des deux teintes est d’environ 3,1:1 pour le thème bleu clair par défaut. Ce chiffre ne certifie pas toutes les palettes personnalisées.

## Décisions humaines

Aucune nouvelle couleur à choisir : le réglage du thème existant est conservé. La compilation de production et la revue navigateur restent à relancer lorsque l’autorisation redevient disponible.
