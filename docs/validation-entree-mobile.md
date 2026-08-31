# Entrée principale, classes tactiles et typographie arabe

Date : 31 août 2026. Complète et actualise `validation-onboarding-keep.md`.

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
