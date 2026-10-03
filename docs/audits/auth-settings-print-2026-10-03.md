# Connexion, paramètres et impression — version 1.2.8

## Changements

- Google et e-mail via Firebase Auth ; contact téléphonique facultatif, anciens accès conservés et identifiants indépendants des contacts. Le compteur Android et les associations de notifications acceptent aussi ces nouveaux identifiants.
- Paramètres : suppression des raccourcis Archives/Cloud en double, des drapeaux et intitulés répétés, du faux indicateur permanent « Connecté » et du contact d'assistance non vérifié. Sauvegarde/restauration gardent deux actions directes. L'aide ouvre le guide existant.
- Le profil garde son brouillon lors d'un changement d'onglet. Annuler rétablit les valeurs et Enregistrer applique le profil sans fermer les paramètres. Le pied fixe suit l'ordre logique français/arabe. Fermer un brouillon non enregistré demande toujours confirmation.
- Android n'enregistre plus l'ouverture d'un aperçu comme un tirage réussi. `NativePrint` suit l'état du travail système et le cycle de vie de l'adaptateur WebView. Annulation/échec ne créent aucun historique. Si une imprimante reste en attente, une confirmation explicite remplace l'attente dans l'application. Aucun repli `window.print()` silencieux sur Android.
- Sur le Web, une confirmation après l'impression est nécessaire, car le navigateur ne signale pas de manière fiable l'impression ou l'annulation. Le document complet reste disponible même sans dates ou après un premier tirage.
- L'ancien historique enregistrait aussi les aperçus annulés : ces entrées non confirmées ne suppriment plus les nouveautés. Les préférences sont conservées. Le nouveau format reste au même emplacement de sauvegarde et mémorise une empreinte du contenu et de son contexte par date. Une modification sur la même date redevient nouvelle. La confirmation porte sur l'instantané réellement envoyé, avec protection du compte actif.

## Validation

337 tests du projet, dont les régressions d'impression et d'identité ; contrôles TypeScript, architecture, code inutilisé, traductions, données officielles et build Web/PWA réussis. Les 14 tests Firebase Auth/Firestore réussissent avec fournisseurs émulés. Deux tests JVM vérifient les états natifs d'impression.

Huit tests sur l'émulateur Android 13 : compteurs et associations de notifications, nouveaux comptes Google/e-mail, mécanismes de mise à jour, aperçu système d'une page A4 et annulation retournant `cancelled`. Les essais utilisent le paquet `.qa` et des données fictives, séparés du cahier de production.

Le rendu des paramètres a été contrôlé à 390 × 844 en français et arabe : pas de débordement horizontal, boutons tactiles, pied d'enregistrement visible et ordre RTL correct. Les captures et journaux sont dans `artifacts/ui/`, `artifacts/firebase/` et `artifacts/android/`, exclus de Git.

L'impression sur une imprimante physique Samsung, la connexion Google réelle sur la Tab S7, la réception FCM et la distribution Play nécessitent encore les essais sur appareils/services correspondants. La compilation ne publie pas sur Google Play et ne crée pas de canal APK de mise à jour en ligne.
