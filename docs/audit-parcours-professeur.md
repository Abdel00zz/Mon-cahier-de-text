# Audit du parcours professeur — 31 août 2026

## Circuit et responsabilités

| Entrée | Branchement | Source de vérité |
| --- | --- | --- |
| Connexion / inscription | `AuthPage` → `AuthContext` → `/api/auth` → `App` | Identité et état de session ; aucun cycle imposé par la connexion |
| Première connexion | `Dashboard` vérifie `hasCompletedWelcome` → `OnboardingPage` | Configuration locale et marqueur du compte |
| Onboarding | Langue → thème → profil/cycles → matières → classes → emploi du temps | `useConfigManager` pour les préférences ; `useClassManager` pour les classes |
| Bouton Paramètres | `App.handleOpenSettings` → `SettingsPage` → `ConfigModal` | Même configuration que le tableau de bord ; retour à la vue d’origine |
| Créer une classe sur le tableau de bord | `CreateClassModal` → `Dashboard` → `useClassManager.addClass` | Cycles et matières du profil ; groupe vérifié contre les classes existantes |
| Configurer une classe depuis sa carte | Même modale avec `editingClass` → `updateClass` | Métadonnées de cette classe, sans remplacer sa matière par celle du profil |
| Créer depuis l’emploi du temps | `ScheduleTab` → même `CreateClassModal` → `addClass` puis affectation du créneau | Identifiant de la classe effectivement créée |
| Propagation entre vues | Écriture locale → événement `config-changed` → autres instances du gestionnaire | Référence actualisée immédiatement, avant le prochain rendu React |

## Corrections appliquées

- Un seul cycle : ouverture directe de la liste des classes, y compris en configuration. Plusieurs cycles : choix conservé. Le nombre de cycles est normalisé (doublons et valeurs inconnues ignorés) et ne compte pas le cycle historique d'une ancienne classe. Au lycée et en prépa, la filière reste un vrai choix.
- Si le profil change pendant l'ouverture, une étape de cycle devenue inutile disparaît ; un brouillon compatible est conservé. Une ancienne classe garde son cycle réel, même s'il n'est plus sélectionné dans le profil, et les anciens noms officiels permettent de retrouver un cycle manquant.
- Initialisation du formulaire une seule fois par ouverture : les nouveaux tableaux de props ou les rafraîchissements du parent n’effacent plus la saisie.
- Modale fermée non montée ; détection des groupes occupés calculée une fois par liste/niveau et recherche du premier groupe libre bornée à 99.
- Sauvegarde protégée contre les doubles soumissions ; le bouton indique le traitement et les erreurs conservent le formulaire.
- Modification : matière existante conservée, même si elle ne figure plus dans la sélection du professeur.
- Onboarding : le clic sur la langue ouvre le thème ; terminer sans classe fonctionne ; dernière étape reliée directement à la fin réelle. L’écran artificiel de 3,8 secondes n’est plus monté.
- Terminer le parcours ne force plus l’activation de la vibration et des notifications.
- Inscription : langue de l’écran de connexion conservée après la remise à zéro du nouvel espace.
- Authentification : requête initiale annulée au démontage et retour tardif ignoré ; soumission du formulaire protégée.
- Paramètres : seuls les champs de profil modifiés constituent le brouillon à enregistrer. L’apparence, la langue, les notifications et l’emploi du temps suivent la configuration courante et s’appliquent en direct. Enregistrer le profil n’écrase plus les mises à jour externes d’autres champs.
- Gestionnaire de configuration : fusion depuis la dernière valeur reçue, et aucune écriture pour un patch strictement inchangé.
- Deux références de traduction absentes dans les paramètres remplacées par les clés existantes.
- Modale de classe plus haute sur téléphone, progression et boutons utilisables en RTL. Export de type `EditorProps` rétabli pour permettre la compilation du composant `MathEditor` existant.

## Validation effectuée

- Dix-huit tests automatisés : `node --import tsx --test scripts/test-class-creation.ts`.
- `npm run lint`, `npm run check:i18n` et compilation de production.
- Tests navigateur avec composants réels et données de scénario, sans modifier les classes du professeur : collège seul, liste des cycles, lycée, prépa/PCSI, modification de matière conservée, saisie préservée pendant les rafraîchissements, navigation de l’onboarding et sortie facultative.
- Paramètres : simulation d’une modification externe pendant l’ouverture ; enregistrer le nom conserve l’établissement et le thème reçus.
- Création depuis un créneau : classe créée puis affectée au lundi 08h–09h.
- Deux instances réelles de `useConfigManager`, deux écritures dans le même événement : les deux vues conservent le cycle et la matière nouveaux.
- Téléphone 390 × 844, arabe/RTL : ouverture directe et enregistrement du groupe `٣` comme groupe `3`.

Les tests navigateur ont utilisé une page de test temporaire, retirée après validation. La connexion réelle à deux comptes et la synchronisation cloud multi-appareils n’ont pas été testées. Aucun chiffre de FPS ou de gain de latence n’est revendiqué.

## Rectification des quatre points restants

1. **Isolation après expiration de session — implémentée et testée localement.** Le propriétaire de l’espace est fixé avant qu’un retour 401 retire le cache de session. Connexion, inscription et déconnexion passent par `switchAccountWorkspace`. Avant un changement, la dernière saisie de l’éditeur de l’onglet courant est enregistrée, puis les cahiers, réglages, archives, conflits et opérations en attente sont sauvegardés sous le propriétaire sortant. Un autre compte ne les fusionne plus avec ses données. Une reconnexion du propriétaire les restaure. Les données anciennes sans propriétaire vérifiable sont conservées séparément, sans attribution automatique. Une erreur de sauvegarde bloque le changement ; une erreur de restauration tente le retour à l’espace précédent et conserve sa copie de secours.
2. **Bouton Aide — relié.** `ConfigModal` → `SettingsPage` → callback `App.setGuideOpen(true)`. Plus de clé de session sans consommateur. Le guide s’ouvre après fermeture des paramètres ; un brouillon de profil exige d’abord une confirmation d’abandon.
3. **Contrôle d’architecture — corrigé.** Retrait des imports et variables inutilisés identifiés dans la navigation, le tableau de bord, les étapes visuelles et l’en-tête de l’éditeur. `check:architecture` contrôle également les nouveaux tests. Ce résultat ne signifie pas que l’audit distinct Knip de tous les exports est terminé.
4. **Fermeture des paramètres — clarifiée.** Sans brouillon : « Fermer ». Avec brouillon : « Enregistrer le profil » ou « Abandonner les modifications ». La croix et la demande de fermeture passent par la même confirmation. Le texte précise que langue, apparence, notifications et emploi du temps sont immédiats et ne sont pas annulés par l’abandon du profil. Confirmation centrée, de hauteur adaptée au contenu, boutons d’au moins 44 px. Libellés FR/AR/EN ; champs nom/téléphone associés à leurs labels.

### Protection des requêtes et fluidité

- Les opérations de synchronisation capturent le propriétaire et une révision de l’espace. Une réponse tardive d’un ancien compte ne modifie ni le stockage actif, ni sa file de synchronisation, même après un aller-retour A → B → A.
- Annulation des requêtes et minuteries au changement de compte ; remontage des composants pour éliminer leur ancien état. Les écritures différées de l’éditeur et des gestionnaires vérifient leur espace avant de persister.
- Le serveur vérifie `X-Workspace-Owner` contre la session authentifiée. Ce champ n’accorde aucun accès ; la session reste l’autorité. Désaccord ou champ absent : HTTP 409, avec message traduit côté interface.
- « Synchroniser » attend maintenant l’opération réelle ; retrait du délai artificiel de 400 ms. Pas de nouvelle dépendance ni de boucle de surveillance permanente. Les snapshots complets sont réalisés au changement de compte, pas à chaque frappe.

### Validation complémentaire

- **39 tests automatisés réussis** : 15 pour les espaces par compte et la liaison serveur, 6 pour l’authentification/UI, 18 pour la création de classes.
- `node --import tsx --test scripts/test-account-workspace.ts scripts/test-auth-ui.ts scripts/test-class-creation.ts`.
- `npm run check:architecture`, `npm run check:i18n` et `npm run build`.
- Navigateur, vrais providers/composants avec stockage **en mémoire** et réponses API simulées : session expirée → compte B vide ; création B ; retours A/B restaurant les classes respectives ; déconnexion/reconnexion conservant le profil enregistré.
- Réponses GET et POST de A volontairement retardées, puis délivrées après passage à B : classe B et versions de sa file d’attente inchangées. Le simulateur ignore volontairement l’annulation réseau pour éprouver aussi les garde-fous de réponse.
- Paramètres : continuer à modifier conserve le brouillon ; abandonner conserve le thème déjà appliqué ; enregistrer conserve le profil après reconnexion ; bouton Aide ouvre le guide réel en français et en arabe, avec et sans brouillon.
- Mesures DOM : téléphone FR 320 × 740, confirmation de 296 px sans débordement ; arabe/RTL 390 × 844, confirmation d’environ 366 × 265 px ; boutons de confirmation et fermeture hauts de 44 px.
- Page temporaire de test retirée et serveur de test arrêté. Aucun compte réel ni cahier utilisateur modifié par ces scénarios.

### Limites et précautions de mise en service

- Déployer client et API ensemble. Une ancienne version PWA sans `X-Workspace-Owner` doit être actualisée avant de synchroniser ; son envoi est volontairement refusé plutôt que d’accepter un propriétaire incertain.
- Valider encore avec deux comptes de recette sur l’API réelle, plusieurs appareils et des onglets simultanés. Les tests locaux ne couvrent pas la concurrence inter-onglets : `localStorage` n’offre pas de transaction inter-onglets et le rechargement défensif d’un autre onglet ne garantit pas la conservation de sa saisie encore uniquement en mémoire.
- Les snapshots sont locaux et non chiffrés : séparation fonctionnelle des comptes, pas protection contre une personne ayant accès au stockage du navigateur. Les sauvegardes sans propriétaire vérifiable sont conservées sous `workspaceSnapshot_v1_unassigned_*` ; leur réattribution nécessite une récupération contrôlée, pas une fusion automatique.
- Un avertissement de développement préexistant concerne l’import du calendrier depuis `public/vacances-jourferie.json`. Il n’a pas été traité dans cette rectification ciblée ; la compilation de production réussit.
- Aucun gain chiffré de FPS ou de latence, ni validation cloud multi-appareils, n’est revendiqué.
