# Entrée principale, classes tactiles et typographie arabe

Date : 31 août 2026. Complète et actualise `validation-onboarding-keep.md`.

## Actualisation : transitions du parcours d’inscription

- Bouton Retour de l’en-tête supprimé : l’historique natif conserve les choix de classe et les champs d’inscription. Le lien contextuel de modification de classe et l’accès accueil restent disponibles.
- Sous-titre arabe demandé repris exactement sous « لنبدأ بقسمك الأول. ».
- Apparition des vues en 280 ms et des champs progressifs en 220 ms, uniquement par opacité et translation verticale courte. Pas de délai de sortie, d’animation de hauteur, de flou animé ni de `will-change` permanent.
- Retours tactiles en 160 ms ; survol réservé aux pointeurs précis. Les animations ajoutées sont désactivées avec `prefers-reduced-motion`. Les badges informatifs n’ont plus de zoom au survol.
- Recliquer sur le cycle ou la filière sélectionnés ne réinitialise plus les choix suivants. Les champs ne sont pas remontés à chaque saisie.
- Recette sur le serveur local : préparation AR → collège → matière → groupe `٣` normalisé en `3` → inscription ; Précédent/Suivant natifs conservent groupe et nom. Déroulant fonctionnel, contrôles ≥ 44 px, aucun débordement horizontal relevé à 320, 393 (394 rapportés) et 768 px ; passage FR/AR vérifié. Aucun compte créé.
- TypeScript strict et audit des traductions validés. Les modifications locales de typographie, dashboard, synchronisation et serveur hors de ce parcours sont exclues de cette publication.
- Validation de la version à publier dans un worktree isolé : **67/67 tests réussis**, TypeScript strict et build de production réussis. La feuille d’animation compilée pèse 1,41 Ko (0,39 Ko gzip), sans nouvelle dépendance. Le rendu compilé à 393 px conserve Lateef et ne déborde pas horizontalement. La recette navigateur ne crée aucun compte réel ; aucune mesure de 60 fps ni test matériel iOS/Android n’est revendiqué.

## Actualisation : adapter l’existant, sans mode guest distinct

Cette section décrit le dernier ajustement demandé. Les sections suivantes restent le journal de l’itération précédente et ne décrivent pas toutes l’état local actuel.

### Trois choix UX

1. Le bouton existant « Créer un compte / إنشاء حساب جديد » ouvre directement le formulaire de préparation, puis l’inscription. La connexion existante reste directe. Aucun nouvel écran ni nouvelle modale ajoutés.
2. Le formulaire inline conserve ses contrôles et son style. Les choix restent dans le parent lors des retours, des changements de langue et du passage au formulaire d’identifiants. Les données de classe sont enregistrées seulement après inscription réussie.
3. Le parcours d’essai parallèle, sa confirmation intermédiaire et son délai artificiel de 2,5 secondes sont supprimés. Les règles de groupes sont réutilisées depuis le dashboard ; les champs et sélections ont des labels accessibles et des cibles d’au moins 44 px.

| Élément existant | Adaptation | Interaction | Objectif |
| --- | --- | --- | --- |
| Accueil | Composition et aperçu conservés ; lien d’essai retiré | Créer un compte → préparation | Une entrée claire pour le nouvel enseignant |
| Formulaire de classe | Ancien composant renommé `RegistrationOnboarding`, contrôles conservés | Cycle → classe → matière / groupe → inscription | Pas de second système de création ni de modale dormante |
| Inscription | Formulaire sécurisé conservé, texte de dernière étape | Retour modifiable ; compte existant toujours accessible | Enregistrer les choix sans recommencer l’onboarding |

### Branchements et nettoyage

- `authNavigation` est de nouveau utilisé par l’écran réel, pour les clics, `popstate` et `hashchange`. `#register` sans préparation validée renvoie à `#start`. `#preview` reste uniquement un alias compatible, pas un parcours distinct.
- Une modification du brouillon invalide sa validation précédente ; elle ne permet pas de finaliser une ancienne classe par un lien direct.
- Suppression des callbacks d’essai, du bouton Retour dupliqué, du code de modale inaccessible, des états d’attente et des imports inutilisés du parcours. Le contrôle de choix existant est déplacé hors du rendu pour conserver le focus.
- Préparation terminée : flag local synchronisable et accusé de fin d’accueil serveur, sans attendre cet accusé pour ouvrir le dashboard. Les garde-fous d’identité et de conservation des espaces existants restent actifs.
- Aucun changement des préférences typographiques, cartes du dashboard, dates d’ouverture ou code serveur hors de l’authentification. Aucun push effectué dans cette intervention.

### Vérifications de cette adaptation

- Navigateur, vrais composants et providers avec stockage en mémoire et API simulées : CTA arabe → collège → groupe `٣` normalisé en `3` → inscription ; groupe `0` refusé ; retour conservant classe et nom ; changement en groupe 4 → validation exigée avant inscription ; compte fictif → dashboard avec classe 4, sans second onboarding.
- FR/AR et viewports 320×740, 393×852 (394 px rapportés), 768×1024 : aucun débordement horizontal observé ; contrôles du formulaire mesurés à 44 px. Pas de test matériel iOS/Android ni de compte cloud réel.
- TypeScript / architecture, i18n et build validés. Suite globale : **65 tests réussis sur 67**. Les deux régressions préexistantes sur Lateef et la conservation API de `lastOpenedAt` restent signalées. Les assertions sont conservées, mais leur chargement n’empêche plus les autres tests de démarrer.
- L’audit global de code inutilisé signale encore des éléments hors de ce parcours et des scripts de test non déclarés comme points d’entrée. Pas de suppression automatique à l’échelle du projet.
- Les fichiers temporaires de recette sont retirés ; aucun compte ou cahier réel modifié.

## Journal de l’itération précédente

## Analyse UX : trois décisions

1. **Préparer avant de demander les identifiants.** « Créer mon espace » est désormais l’action principale : classe → premier titre facultatif → inscription. La connexion reste accessible aux enseignants déjà inscrits. Le libellé « Essayer sans compte » ne présente plus ce parcours comme une option secondaire.
2. **Conserver les choix et partager les règles.** Accueil, liens directs, retour navigateur et inscription utilisent un même routeur d’entrée. La création et la modification préparatoires réutilisent la modale du dashboard, ses cycles, ses groupes 1–99 et sa normalisation des chiffres arabes. Une inscription réussie conserve la classe et son contenu, sans imposer un second onboarding.
3. **Privilégier la lecture et le toucher.** Présentation Keep sobre, boutons ≥ 44 px, champs d’authentification 48 px / 16 px, Lateef pour l’interface arabe avec tailles optiques adaptées. La carte ouvre le cahier au toucher simple ; l’appui prolongé ouvre les réglages, sans bouton redondant sur écran compact ou périphérique tactile.

## Structure du layout

| Composant | Style / typo | Interaction | Objectif UX |
| --- | --- | --- | --- |
| Accueil | Fond neutre, titre hiérarchisé, cartes Keep 12 px | « Créer mon espace » ; connexion secondaire | Une intention principale explicite |
| Aperçu | Cahier léger en HTML, libellés FR/AR | Animation chargée uniquement sur demande, refermable | Montrer le produit sans imposer le poids du GIF |
| Préparation | Progression en trois étapes ; saisie 16 px ; footer accessible | Modale de classe partagée, titre et aperçu en direct | Préserver la cohérence des règles et rendre le résultat tangible |
| Inscription | Champs 48 px, labels explicites, indicateur étape 3/3 | Retour à la préparation ; enregistrement réel uniquement à la validation | Présenter le compte comme une sauvegarde |
| Carte / liste de classes | Nom puis date discrète ; teintes Keep existantes | Toucher simple, maintien 550 ms, clic droit, Shift+F10 | Ouvrir rapidement, garder les réglages accessibles |

## Branchements et protections

- `#start` est l’entrée principale ; l’ancien `#preview` reste reconnu. Un lien `#register` sans préparation rejoint d’abord la configuration. `#login` conserve l’accès direct.
- Les boutons Retour restent dans le parcours ; l’historique du navigateur conserve le brouillon tant que la page n’est pas rechargée. La perte du brouillon au rechargement est annoncée : il reste uniquement en mémoire avant inscription.
- L’authentification reçoit seulement les identifiants. La préparation est appliquée après vérification de l’identité et activation de l’espace du nouveau compte ; jamais lors d’une connexion à un compte existant. Les protections de propriétaire, validation, borne de taille et rollback existantes sont conservées.
- La préparation achevée active le dashboard et la checklist. L’endpoint existant de fin d’accueil est appelé en arrière-plan ; le flag local synchronisable demeure le repli si cet accusé de réception échoue. Aucun délai artificiel ajouté.
- La date d’ouverture est écrite à l’entrée effective dans l’éditeur, après authentification lorsque celle-ci est requise. Pas de date fictive pour une classe jamais ouverte. La validation API conserve le champ et les fusions client/serveur prennent la date valide la plus récente, sans modifier les horodatages de contenu.
- Les réglages tactiles partagent un seul hook pour cartes et listes. Déplacement > 12 px, annulation et multi-touch arrêtent la minuterie ; le clic suivant un maintien est supprimé. Un seul timer actif par geste, aucun intervalle ajouté.
- Lateef est le défaut arabe dans les réglages, leur réinitialisation, le rendu et les fallbacks. Un choix explicite de police de contenu reste respecté. Les tailles optiques de l’accueil n’altèrent pas la géométrie des tableaux de l’éditeur ni le texte pédagogique.

## Validation effectuée

- **63 tests automatisés réussis** : espaces de comptes, authentification, règles de classe, onboarding, routes d’entrée, gestes, dates et défaut typographique.
- Commande : `npx tsx --test scripts/test-account-workspace.ts scripts/test-auth-ui.ts scripts/test-class-creation.ts scripts/test-onboarding-keep.ts scripts/test-entry-flow.ts`.
- TypeScript avec règles d’architecture ; audit i18n : 1 013 clés dans chaque langue, aucune différence ni clé appelée manquante ; compilation de production et vérification des espaces Git.
- Navigateur : composants réels, stockage isolé en mémoire et API simulées. Aucun compte ni cahier réel créé ou modifié. Les fichiers de recette temporaires sont retirés après vérification.
- Parcours : classe collège groupe `٣` → titre `الدوال العددية` → changement FR/AR → inscription fictive → dashboard direct → ouverture du cahier avec titre inchangé. Le groupe `٠` est refusé. Modifier la préparation conserve le groupe 3 et le titre.
- Retour navigateur depuis l’inscription : préparation conservée. Lien direct `#register` : ouverture de la préparation. Checklist : ouverture effective cochée ; carte : date d’ouverture effectivement affichée.
- Gestes via le composant réel et un banc Pointer Events : maintien = 0 ouverture / 1 réglage ; toucher simple = 1 ouverture / 1 réglage ; défilement = compteurs inchangés ; Shift+F10 = deuxième ouverture des réglages. Bouton de réglage masqué au format compact.
- Mesures : accueil FR 320×740 et 412×915 ; AR 393×852 (394 px rapportés par le navigateur), 768×1024 et 1024×768 ; modale en paysage 844×390. Aucun débordement horizontal de page observé. Inscription mobile : champs de 48 px et police de 16 px. En paysage, la modale mesure environ 672×364 px dans un écran 844×390.
- Inspections visuelles des accueils français et arabe, téléphone et tablette. Lateef confirmé dans le style calculé. Image initiale : icône seulement ; GIF non monté avant action explicite.

## Limites

- Il s’agit de tailles de viewport et de gestes synthétiques dans Chromium, **pas de tests matériels Safari/iPhone, Android/Pixel ou iPad**. Le clavier virtuel, VoiceOver/TalkBack et les gestes natifs restent à vérifier sur appareils.
- Authentification cloud, synchronisation multi-appareils et concurrence réelles restent à valider avec des comptes de recette. Les tests unitaires couvrent les règles de fusion, pas un environnement cloud complet.
- Le chargement distant LaTeX ne fait pas partie de cette validation ; le texte pédagogique réel a été vérifié dans l’éditeur.
- Aucune promesse chiffrée de gain de vitesse, de FPS ou de conversion. Pas de nouvelle dépendance applicative, pas de modification des fichiers GIF ni des travaux préexistants hors périmètre.
