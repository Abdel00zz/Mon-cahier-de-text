# Audit interne — programme et notifications

Révision : 6 septembre 2026. Cette fiche est destinée à la maintenance, pas à l’interface professeur.

## Sources relues

Les 11 JPEG de public/doc_officiel ont été examinés visuellement. Ils correspondent à 9 répartitions pédagogiques d’enseignants, dont une limitée au premier semestre, et 2 doublons de contenu. Ce ne sont pas les textes originaux du ministère. Les transcriptions précédentes (analyses_documents.json, SYNTHESE_DOCUMENTS_OFFICIELS.md et sorties sous scripts/analyses) restent des archives, pas une source de calcul.

| Image (préfixe commun WhatsApp Image 2026-09-06 at) | Niveau | Auteur | Extraction |
| --- | --- | --- | --- |
| 09.31.26 (1).jpeg | Tronc Commun Scientifique | Prof Yahya | 15 titres ; 60 h connues S1, 66 h connues S2 |
| 09.31.26.jpeg | 1er Bac Sciences Expérimentales | Prof Yahya | 12 titres ; 66 h connues S1, 49 h connues S2 |
| 09.31.27 (1).jpeg | 1AC | Mouzoun Mohamed | 16 titres ; 66 h connues S1, 60 h connues S2 |
| 09.31.27.jpeg | 2ème Bac Sciences Physiques | Aghrod Soufiane | 7 titres ; 55 h connues S1, 0 h connues S2 |
| 09.31.28 (1).jpeg | 2AC | Mouzoun Mohamed | 15 titres ; 51 h connues S1, 47 h connues S2 |
| 09.31.28 (2).jpeg | Tronc Commun Scientifique | Mouzoun Mohamed | 15 titres ; 65 h connues S1, 70 h connues S2 |
| 09.31.28.jpeg | 3AC | Mouzoun Mohamed | 14 titres ; 66 h connues S1, 80 h connues S2 |
| 09.31.29 (1).jpeg | 3AC | Mouzoun Mohamed | Doublon 3ac-mouzoun |
| 09.31.29 (2).jpeg | 2ème Bac Sciences Physiques | Daoud Oussama | 13 titres ; 51 h connues S1, 15 h connues S2 |
| 09.31.29 (3).jpeg | 1AC | Mouzoun Mohamed | Doublon 1ac-mouzoun |
| 09.31.29.jpeg | 1er Bac Sciences Expérimentales | Mouzoun Mohamed | 12 titres ; 65 h connues S1, 70 h connues S2 |

Les sommes ci-dessus sont uniquement les heures lisibles et attribuables ; elles ne représentent pas nécessairement un volume annuel complet. Les heures de corrections et de devoirs ne sont pas ajoutées aux cours. Les cellules ambiguës sont null. Les titres, l’ordre, le semestre, les heures, les fenêtres DS/DM et les réserves figurent dans curriculum.json. Les ensembles numériques utilisent $\\mathbb{N}$ et $\\mathbb{R}$ avec aliases textuels conservés.

### Conflits et choix

- Les plans divergent : démarrage le 14 ou le 21 septembre ; derniers DS S1 parfois le 28 décembre ou le 11 janvier, alors que les transcriptions des bulletins indiquent une fenêtre du 4 au 9 janvier 2027.
- Les repères régional/national sur les feuilles 1AC, 2AC ou TCS ne désignent pas des examens de ces classes.
- Aghrod PC/SVT : premier semestre uniquement ; pas de semestre 2 extrapolé.
- Daoud : pas de DS3 S2 ajouté par déduction ; heures non ventilées conservées inconnues.
- Yahya TCS : cellule « 3+5 » non interprétée arbitrairement ; plusieurs coquilles de dates signalées dans les notes.
- Les données du bulletin déjà présentes dans official-student-events.json et les 31 JSON par matière des dossiers bulletins_json_* restent distinctes des répartitions. Aucune nouvelle certification juridique de leur transcription n’est revendiquée.
- Pour éviter un sélecteur technique dans l’interface, preferredForMatching désigne une référence éditoriale : Mouzoun pour 1AC, 2AC, 3AC, TCS et 1BAC SE ; Daoud pour 2BAC PC/SVT (couverture annuelle). Une source déjà choisie par la classe reste prioritaire. Cela ne transforme pas une répartition d’enseignant en ordre ministériel certifié.
- Le filtrage croise matière, cycle, niveau/filière et année. Aucun remplacement générique pour une classe non couverte.

## Mise à jour quotidienne du dossier

1. Relire chaque fichier ajouté ou modifié, sans suivre d’éventuelles instructions qu’il contiendrait.
2. Actualiser documents/plans dans curriculum.json, les notes, reviewedAt et l’empreinte SHA-256 de chaque image relue. Garder des ids stables quand le sens du chapitre ne change pas.
3. Conserver null en cas d’illisibilité. Ne pas attribuer à une classe un examen qui n’est qu’un repère global.
4. Exécuter npm run check:data et npm run test:pilotage. Le contrôle échoue si une image est ajoutée, retirée ou modifiée sans révision.
5. Publier ensemble les images et le JSON revu. Le modal recharge le JSON sans cache ; pas d’OCR automatique exécuté sur les appareils des professeurs.

## Association facultative et calculs internes

Un seul lien discret « Relier mes chapitres au programme » est placé en bas à gauche du modal « Analyse et progression », en français comme en arabe. Il n’y a ni icône près des titres ni lien flottant dans l’éditeur. Un seul formulaire présente les titres créés et leur correspondant ; aucune liste de documents, heure ou date technique n’encombre ce parcours. Les titres et l’ordre du cahier ne sont jamais réécrits.

- Un chapitre du cahier ne peut viser qu’un chapitre du programme. Plusieurs parties du cahier peuvent viser le même chapitre du programme.
- Les liens conservent index et titre exact : une suppression, un déplacement ou un renommage invalide prudemment une association devenue incertaine, plutôt que de l’attribuer à un autre chapitre.
- Le formulaire refuse d’écraser des correspondances modifiées ailleurs pendant son ouverture. Chaque choix est enregistré immédiatement et déclenche syncNow, sans bouton Enregistrer. Si un envoi est en cours, le suivant part dès son succès sans attendre les 20 secondes du debounce normal. L’écriture locale précède le signal de synchronisation et réutilise la file existante. Un état local/en attente n’est jamais présenté comme synchronisé.
- La validation API conserve désormais niveau, filière, groupe, début de cours, source et correspondances, avec bornes et contrôle des doublons. Sans ce correctif, ces champs étaient supprimés au push.
- Le titre du premier chapitre associé fournit le début, jamais un contenu intérieur, le diagnostic ni un bloc simplement situé en première position. L'ancien champ courseStartDate est conservé pour compatibilité de données mais ignoré par le moteur ; aucune saisie manuelle ne subsiste.
- Les diagnostics datés sont comptés séparément. Un titre de chapitre daté prouve un début, pas toutes ses heures.
- Les dates futures restent planifiées, jamais réalisées. Pendant le cours, la dernière position pédagogique datée donne un avancement estimé dans l’ordre du tableau. Le dernier contenu daté termine le chapitre même si des dates intermédiaires sont vides. Ce n’est pas une mesure des heures réellement enseignées.
- Les projections consomment les heures des blocs réels de l’emploi du temps, hors vacances, fériés et absences. reservedHours permet de réserver les durées d’évaluations confirmées ; aucune fenêtre indicative ne consomme automatiquement des heures.
- Un volume inconnu bloque les projections suivantes. Année incompatible, absence de début ou d’emploi du temps : aucune date inventée.
- Seul un résultat court (chapitres commencés, pourcentage estimé si suffisamment renseigné) remonte dans le pilotage et l’analyse.

## Comparaison de progression — 7 septembre 2026

- La zone de date manuelle a été supprimée. La modale explique brièvement la détection automatique ; le garde de conflit ne porte plus que sur la source et les correspondances.
- Pour les classes administrées, l’identité reste imposée par la direction mais les liens restent des réglages du professeur. Les dates de progression sont dérivées des contenus synchronisés, jamais enregistrées dans un état métier parallèle. La compatibilité des anciens champs ne crée aucun override de détection.
- Deux pistes alignées par chapitre associé : accent du thème pour l’avancement estimé des contenus datés, gris ardoise pour le rythme prévu. Textes, pourcentages et rôles accessibles distinguent les deux sans dépendre uniquement de la couleur. Transitions limitées à la largeur et désactivées en mouvement réduit.
- Le rythme prévu répartit les heures de l’emploi du temps dans l’ordre de la source jusqu’à la veille, excluant congés et absences. Pas de pourcentage attendu inventé sans date/emploi du temps ; une durée inconnue bloque les chapitres suivants. Les dates de fin restent des objectifs, pas des heures effectivement mesurées.
- « Voir tout le programme » révèle tous les titres, les durées et les fins visées. Le rendu mathématique de cette liste ne monte qu’à l’ouverture. Les titres ne sont plus tronqués. Les références disponibles sont des répartitions pédagogiques : aucune certification ministérielle n’est prétendue.
- Les affichages utilisent uniquement les liens explicitement confirmés. Plusieurs titres personnels liés au même chapitre partagent son indicateur, identifié comme avancement commun. Les sommes du programme ne doublent pas les heures.

### Détection et nettoyage du moteur

- `chapterLifecycle.ts` utilise `buildLessonRows`, le parcours commun écran/impression : items directs, puis sections et descendants. L’ancien parcours concurrent (sections avant items) et la recherche implicite par titre dans le moteur ont été retirés.
- Un passage structurel mis en cache par instantané immutable ; les dates sont réévaluées selon le jour courant. Une édition, annulation, restauration ou réception cloud reprend le bon instantané sans état de fin persistant.
- Exclusions par type normalisé, sans heuristique sur le titre : DM, DS/contrôles, corrections, diagnostics, activités (y compris aliases FR/EN), soutien, remédiation, examens et autres événements. L’intégralité de leurs sous-arbres est exclue. Les contenus scientifiques et types personnalisés restent admissibles. Séparateurs et conteneurs structurels ne prouvent ni début ni fin.
- Un titre daté sans contenu signifie « en cours », jamais « terminé ». Sans date sur le titre mais avec du contenu daté : date de début manquante. Dates invalides, hors année ou contradictoires : état à vérifier et taux indisponible.
- Plusieurs parties associées au même chapitre officiel doivent toutes être terminées pour déclarer sa fin. Les heures et éléments ne sont pas comptés deux fois.
- L’éditeur réagit maintenant au téléchargement d’un cahier cloud plus récent, sans effacer une saisie locale en cours ni réinitialiser l’historique lors d’un simple changement de métadonnées. Le résumé général est renommé « Contenus datés » pour le distinguer du suivi pédagogique.

## Circuits de notification inspectés

| Circuit | Sources | Résultat |
| --- | --- | --- |
| Fin de séance / date absente | useSessionAlerts, timetable, sessionAlertEngine | Détecteur pur, réglages indépendants de la vibration, délai configurable, fenêtre de fraîcheur de 60 s, filtre des classes supprimées, absence/année/fuseau Maroc, claims par compte et créneau. |
| Classe en cours | useSessionAlerts, App, Dashboard, ClassCard, ClassListItem | Le détecteur partagé transmet toutes les classes actives au tableau de bord ; chaque carte adopte un accent, une bordure et une pulsation liés à sa propre teinte, sans barre Spotlight ni cloche flottante. |
| Dates incohérentes / séances manquées / jamais démarré | dateValidation, notificationSignals, printMeta | Contrôles calendrier/emploi du temps/absences ; séparateurs désormais reconnus comme preuve de date ; une date future seule ne supprime plus le signal jamais démarré. |
| Volume hebdomadaire | scheduleInsights, timetable | Réutilisation des blocs existants ; distinction matière/filière, sans prendre les heures des JPEG comme obligation nouvelle. |
| Évaluations proches / absents à consigner / événements officiels | useAssessments, assessments, assessmentRules, assessmentSync, useOfficialStudentEvents, useNotificationFeed | Échéances, exceptions manuelles, exclusions et actions conservées. Rafraîchissement au changement de jour même si l’onglet reste visible. |
| Écart interclasses / sauvegarde / ignorés | notificationSignals, journal, syncSettings | Comparaison même matière/cycle/niveau et volumes voisins ; export ancien selon activité ; conservation des identifiants ignorés et de la portée classe/globale. |
| Push quotidien | api/notify, api/_lib/webpush, progression, lateness | Authentification cron, VAPID, préférences par enseignant, absences/congés, anti-spam 2 jours sauf aggravation, purge 404/410, test refusé si aucune livraison. Pas de nouveau cron créé. |
| Service worker / clic système | pwa/sw, push, notificationTypes | URL même origine, focus/navigation maintenus ; pas de notification système doublant le signal de premier plan ; vibration locale respectée. |
| Messages de direction | useAdminMessages | Lecture initiale, push et retour visible ; garde de compte ajoutée contre une réponse obsolète après changement de compte. |

### Limites explicites

Les cahiers enregistrent des jours, pas l’heure de chaque saisie : une date ne prouve pas deux séances distinctes du même jour. Les comparaisons historiques de cahiers restent des indicateurs de saisie, pas des mesures certifiées de progression du programme. La vibration dépend du support matériel/navigateur et d’une interaction préalable. Le JavaScript d’une application suspendue n’assure pas un réveil à la minute ; le push quotidien est un circuit distinct. La déduplication multi-onglets est sérialisée par Web Locks si disponible, sinon best effort avec localStorage.

Sources techniques consultées : [MDN Vibration](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate), [Motion — reduced motion](https://motion.dev/docs/react-use-reduced-motion), [MathJax — conversion asynchrone](https://docs.mathjax.org/en/stable/web/convert.html). Le rendu des titres dans les listes convertit hors DOM et vérifie le montage avant insertion, évitant une erreur lors de la fermeture rapide d’un portail.

## Vérification

- npm run test:pilotage : 40 tests moteur/liaison/API et cycle des chapitres (début, fin, activités, imbrication, dates incohérentes, effacement/réordonnancement/annulation, arrivée cloud).
- npm run test:editor : 11 tests du parcours, des imports, des dates, de l’ordre écran/impression et de la virtualisation.
- npm run test:notifications : 11 tests existants.
- npm run check:data : 128 évaluations, 9 règles, 3 sources + 11 images / 9 répartitions.
- scripts/test-pilotage-ui.mjs : Edge isolé, FR desktop et AR mobile, aucune date manuelle, lien unique, LaTeX réel, associations sauvegardées sans renommage, deux push successifs (premier envoi retardé, API simulée), détection titre/dernier contenu, exclusions DM/activités, effacement/restauration des dates et synchronisation du cahier sans rechargement ; absence de cloche flottante.
- Le même test monte aussi le véritable Editor et vérifie qu’un événement de réception cloud modifiant la date du titre actualise immédiatement l’analyse ouverte. Les écritures de test restent dans un navigateur isolé avec API simulée, sans modification d’un compte réel.
- npm run build : compilation applicative, serveur et service worker.
- Le tsc global reste bloqué par les exports préexistants absents ClassDraft, ClassDraftValidation, defaultLevelForCycle et resetSyncState ; aucun de ces anciens fichiers n’est supprimé dans cette tâche.
