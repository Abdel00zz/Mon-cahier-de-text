# Galerie UI — Mon cahier de textes (V2)

259 captures d'écran vérifiées en haute résolution, avec un index interactif consultable dans **index.html** et un inventaire complet dans **index.json**.

## Répartition des captures

- **pages/** (53 captures) :
  - Accueil (Landing page), authentification, inscription, intégration (onboarding complet).
  - Tableau de bord des classes (grille responsive, vue 1 ou 2 colonnes, thèmes clair et sombre).
  - Cahier de texte interactif (barre d'outils, formules mathématiques LaTeX/KaTeX, séances fusionnées, remarques et activités synchronisées).
  - Emploi du temps interactif, suivi des devoirs et contrôles, pilotage et alertes pédagogiques, aperçu d'impression.

- **modales/** (122 captures) :
  - **Nouvelle modale Remarque de séance** avec *Action Dock* réactif et intégration des activités pédagogiques (*Devoir maison donné*, *Contrôle des cahiers*, *Remédiation*, *Soutien*, *Rattrapage*).
  - **Attribution et vérification de dates** (design neutre monochrome, en-tête resserré).
  - Création et modification de classe, ajout et édition de leçons.
  - Sauvegarde et transfert de données, analyse de progression, options d'impression.
  - Suivi des cahiers élèves (*Notebook review*), suivi de l'oral, absents aux devoirs, participants aux activités.
  - Palette de commandes (*Ctrl+K*), message de la direction, avertissements créneaux horaires.

- **fonctions/** (50 captures) :
  - Tous les onglets des paramètres (*Profil*, *Horaires*, *Notifications*, *Certificats médicaux*, *Données*, *Apparence*).
  - Parcours d'onboarding par étape (*Cycles*, *Matières*, *Classes*, *Horaires*).
  - Les 19 chapitres du guide enseignant interactif.
  - Menus d'actions contextuels et sélecteurs de devoirs.

- **admin/** (34 captures) :
  - Tableau de bord administrateur et fiche détaillée des professeurs.
  - Pilotage du calendrier scolaire et des vacances officielles.
  - Gestion du bulletin officiel et des créneaux horaires.
  - Import et publication des listes d'élèves (*Rosters*).

## Spécifications techniques
- **Format** : PNG non compressé sans artefact.
- **Résolutions** :
  - Bureau (*Desktop*) : 1280×880 px (ou taille native du composant).
  - Tablette (*Tablet*) : 820×1180 px.
  - Mobile (*Phone*) : 390×844 px.
- **Bilinguisme** : Captures complètes en arabe (RTL) et en français (LTR).
- **Navigation** : Ouvrir **index.html** dans un navigateur pour effectuer une recherche instantanée ou filtrer par catégorie, langue et appareil.

## Régénérer la galerie

1. Servir l’application en local sur `http://localhost:3000`.
2. Capturer les écrans : `npm run screenshots:v2` (Microsoft Edge requis ; 4 captures en parallèle).
3. Reconstruire l’index interactif : `npm run screenshots:v2:index`.

