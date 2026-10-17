# Vérification des listes d’élèves — 16 octobre 2026

## Circuit vérifié

Les paramètres de classe publient `classRosters[classId]`. Cette liste alimente les absences, les participants, l’oral, les remises de devoirs et les activités. Les notes et observations restent dans leurs enregistrements de séance ; modifier une liste ne les réécrit pas.

Le serveur conserve les listes dans les réglages du document de travail du professeur (`users/{uid}/workspace/classes`). L’administration lit et modifie la même source. Les écritures passent par les API authentifiées ; les règles Firestore refusent les écritures directes des clients.

## Corrections issues de l’audit

- Séparer l’identité d’un élève de la recherche tolérante : accents et lettres arabes proches ne fusionnent plus les notes ou les personnes.
- Déclencher rapidement la synchronisation lorsqu’une liste change.
- Valider les identifiants de classe et les métadonnées d’ajout/retrait ; les reçus restent contrôlés par le serveur.
- Conserver les intentions d’ajout/retrait lorsque l’utilisateur annule une modification pendant un envoi en cours.
- Préserver les reçus lors d’une modification administrative et éviter les propriétés indéfinies dans la réponse sérialisée.
- Relire une configuration locale validée avant d’appliquer un accusé de réception, sans remplacer silencieusement un document illisible.

## Vérifications effectuées

- 81 tests ciblés : listes, fusion, contrôles continus, suivi pédagogique, isolation, transport, stockage local et déclenchement de synchronisation.
- 230 tests de l’éditeur et des composants d’interface.
- 16 tests Firebase Auth/Firestore en émulateur : API réelles, concurrence, anciens clients, isolation des comptes, suppression, sauvegarde/restauration et règles de sécurité.
- Vérification cloud en lecture seule : projet `cahier-text`, règles conformes au dépôt, 7 exemptions d’index actives, 19 champs consultables. Aucun changement de données de production effectué pour ces tests.
- Parcours navigateur : ajout de plusieurs noms avec `؛`, dédoublonnage, retour vers l’oral sans perte de note en cours ; en portrait 390 × 844 et arabe sombre, ajout depuis les absences sans perte de sélection et sans sélectionner automatiquement les nouveaux élèves.

## Limites de portée

Les listes restent fondées sur les noms : une modification orthographique ne transfère pas automatiquement les anciennes notes à un autre nom. Deux homonymes exacts ne disposent pas encore d’identifiants distincts. Le contrôle cloud vérifie la configuration déployée ; les corrections locales doivent être livrées pour être utilisées en production.
