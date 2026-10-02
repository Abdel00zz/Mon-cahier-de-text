# Contrôle du calendrier et de l’éditeur

## Références ministérielles vérifiées le 13 septembre 2026

- [Arrêté ministériel 047.26 du 3 juillet 2026, PDF officiel](https://pw.men.gov.ma/sites/default/files/2026-09/%D9%85%D9%82%D8%B1%D8%B1%20047.26.pdf) : annexe 1, page imprimée 8 (neuvième page du PDF), vérifiée visuellement.
- [Communiqué officiel de rentrée 2026/2027](https://www.men.gov.ma/fr/actualites/rappel-des-dates-de-la-rentr%C3%A9e-scolaire-2026/2027) : démarrage effectif des cours le 7 septembre 2026.

Les cinq périodes ci-dessous concordent avec `public/vacances-jourferie.json`. Le premier et le dernier jour sont inclus.

| Période | Début | Fin |
| --- | --- | --- |
| Première pause | 18/10/2026 | 25/10/2026 |
| Deuxième pause | 06/12/2026 | 13/12/2026 |
| Mi-année | 24/01/2027 | 31/01/2027 |
| Troisième pause | 21/03/2027 | 28/03/2027 |
| Quatrième pause | 09/05/2027 | 16/05/2027 |

L’annexe donne les fêtes religieuses en dates hégiriennes : Aïd al-Fitr du 29 Ramadan au 2 Chawwal, Aïd al-Adha du 9 au 11 Dhou al-Hijja, nouvel an le 1er Moharram. Les correspondances grégoriennes du projet demeurent estimatives ; ce contrôle ne les confirme pas.

Ce contrôle ciblé ne certifie ni toutes les dates d’examen, ni les fins de cours propres à chaque niveau. Aucune date nationale n’a été modifiée à partir d’une supposition.

## Règle du dimanche

Le dimanche non travaillé est la règle métier demandée pour ce cahier. L’annexe des vacances ne constitue pas, à elle seule, la preuve d’une interdiction générale de toute activité éducative le dimanche. Une séance exceptionnelle reste confirmable et conservée sans déplacement automatique.

- `isWeeklyRestDay` constitue le point commun, avec calcul du jour en UTC à partir d’une date ISO valide.
- `validateSessionDate` émet `weekly-rest` même sans emploi du temps. Le conflit horaire redondant est omis ; les avertissements de vacances, de jour férié et d’absence restent distincts.
- La saisie directe, l’affectation groupée et « Aujourd’hui » utilisent la vérification commune de l’éditeur.
- Le tableau et le centre de notifications reprennent le même avertissement et le même identifiant d’exception. Les dimanches passés restent signalés ; seul le conflit avec l’horaire actuel est neutralisé sur le passé.
- Les anciens créneaux du dimanche ne génèrent plus de séances attendues, de faux retards, de projections accélérées ou de rappels de séance. Les données historiques ne sont pas effacées.
- Le samedi reste travaillé et n’est plus présenté comme un jour de week-end dans le calendrier des notifications.

## Éditeur et téléphone

- Barre à largeur intrinsèque, bornée par l’écran et ses zones de sécurité ; actions fréquentes visibles, autres actions dans un menu accessible, sans défilement horizontal caché.
- Cibles de la barre d’au moins 44 px ; mutations désactivées pendant le calcul de sélection ; fermeture toujours accessible.
- Navigation clavier gauche/droite, début/fin et Échap, avec sens RTL respecté ; animation courte désactivée si les mouvements réduits sont demandés.
- Facteur typographique mobile central `--app-text-scale: 0.85` : tailles sémantiques de l’interface, textes fluides, navigation et échelle du tableau. Les tailles ponctuelles codées en pixels ailleurs ne sont pas toutes converties par ce facteur.
- La taille racine, les espacements et les cibles tactiles ne sont pas réduits. Les champs tactiles au focus conservent un minimum de 16 px ; l’impression n’utilise pas le facteur mobile.
- Titres de chapitre bleu-vert désaturé, variantes claire et sombre, sans remplacer les couleurs sémantiques d’erreur ou d’avertissement.

## Vérifications reproductibles

`npm run test:editor`, `npm run test:pilotage`, `npm run test:notifications`, `npm run check:architecture`, `npm run build`.

Cas couverts : dimanche sans horaire, ancien créneau dimanche, samedi normal, traductions FR/AR/EN, dates impossibles, conflits cumulés, notification ignorée, rappels de séance, progression officielle et verrouillage de la barre pendant le calcul.
