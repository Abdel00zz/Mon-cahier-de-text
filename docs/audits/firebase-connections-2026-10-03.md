# Contrôle des branchements Firebase — 3 octobre 2026

## Corrections livrées

| Circuit | Correction / garantie vérifiée |
| --- | --- |
| Synchronisation des cahiers | Calcul des lots en octets UTF-8, délais couvrant aussi la lecture du corps, reprises avec temporisation progressive et `Retry-After`. |
| Reprise mobile | Les envois ordinaires attendent une application visible, active et connectée ; les événements de retour au premier plan réveillent le travail en attente. |
| Export / import local et archives | Validation complète sans reformater le contenu, même limite de taille à l'export et à l'import, refus d'exporter silencieusement une donnée illisible, tailles UTF-8 exactes. |
| Administration | Imports avec contrôle de version, conservation du texte arabe et des formules, dates prioritaires et suppression durable malgré un appareil resté hors ligne. Une date ne peut plus viser une classe inexistante. |
| Notifications Web | Réservation de l'appareil et liste d'abonnements dans une transaction Firestore ; une réponse tardive ne supprime pas une nouvelle inscription. |
| Notifications Android | Transfert de compte, rotation du jeton et désinscription tardive couverts par les tests de liaison native existants. |
| Messages | Création administrative, lecture de la boîte du propriétaire, accusé de lecture et compteur non lu contrôlés via les vrais handlers HTTP. |
| Sauvegarde cloud | Instantané cohérent, compression, AES-256-GCM, relecture et restauration comparée dans un émulateur vide. |

Les tests exercent le stockage Firebase réel des émulateurs, les handlers de production et le SDK Authentication. Les API conservées utilisent Node.js sur Vercel ; le code ne contient pas un déploiement Firebase Cloud Functions ou un accès Firestore direct dans le client.

## Preuves et périmètre

Les règles publiées correspondent au fichier du dépôt ; les sept exemptions JSON sont lisibles et actives. Les tests de règles refusent les accès anonymes, enseignants, d'un autre compte et d'un administrateur usurpé. Les autorisations métier passent par les API, puisque le SDK Admin n'est pas limité par ces règles.

La sauvegarde réelle Firestore, stockée hors dépôt, contient 76 documents. Son empreinte chiffrée est `bc5f58d57434900cb370652a404d535ad4891859334a6b9192f2ab9924220c33`. Les journaux et captures sont conservés localement sous `artifacts/firebase`, hors Git.

La restauration de cette archive réelle dans un émulateur vide a comparé exactement les 76 documents. La suite de régression passe 320 tests ; la suite Auth / Firestore passe 10 tests d'intégration. Les refus des règles produisent volontairement des messages `PERMISSION_DENIED` pendant les tests.

Les contrôles stricts du projet sont exécutés dans un checkout isolé de la révision à publier : des modifications UI présentes dans le dossier principal sont en cours indépendamment de cet audit.

## Limites restantes

La liste des sauvegardes gérées et des Cloud Functions répond HTTP 403 avec le compte serveur actuel. PITR et protection contre la suppression sont désactivés dans les métadonnées de la base. La console Firebase demande un forfait supérieur pour modifier PITR et les sauvegardes planifiées. Aucun droit IAM ni service payant n'a été activé. La sauvegarde chiffrée porte uniquement sur Firestore ; Firebase Authentication, les secrets et la configuration du projet demandent une conservation séparée.

Les tests de notifications vérifient les associations, les décisions d'envoi et la préservation des nouveaux jetons. Ils ne constituent pas une preuve de réception sur Samsung, Pixel ou iPhone. Un cahier dépassant à lui seul la limite HTTP nécessite toujours de répartir son contenu ; le calcul UTF-8 corrige le regroupement de plusieurs cahiers mais ne relève pas la limite serveur.

Voir la [procédure de sauvegarde et vérification](../operations/firebase-backup.md).
