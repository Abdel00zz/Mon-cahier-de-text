import { ch, sec, it } from '../curriculum-builder-helpers.mjs';

export const siTCT = [
  ch("Module 1 : Analyse fonctionnelle et structurelle des systèmes", [
    sec("Expression du besoin et cahier des charges fonctionnel", [
      it("cours", "Le produit et son cycle de vie : de l'expression du besoin au recyclage", "Normes AFNOR de la démarche de projet industriel et respect de l'environnement."),
      it("methode", "L'outil 'Bête à cornes' : formulation du besoin fondamental du client", "À qui le produit rend-il service ? Sur quoi agit-il ? Dans quel but ?"),
      it("methode", "Analyse fonctionnelle du besoin : le diagramme 'Pieuvre' (APTE)", "Identification des Fonctions Principales (FP) et des Fonctions Contraintes (FC)."),
      it("methode", "Analyse fonctionnelle technique : l'outil FAST (Fonction, Action, Solution Technique)", "Décomposition arborescente des fonctions de service en fonctions techniques élémentaires et composants réels."),
      it("methode", "Analyse structurelle et flux de matières : le diagramme SADT (niveau A-0 et niveaux descendants)", "Modélisation de la valeur ajoutée, des matières d'œuvre (matière, énergie, information) et des données de contrôle.")
    ])
  ]),
  ch("Module 2 : Représentation graphique normalisée et modélisation géométrique", [
    sec("Dessin technique normalisé et lecture de plans", [
      it("cours", "Normalisation internationale ISO du dessin industriel : formats, cartouche, échelle et types de traits", "Trait continu fort pour les arêtes visibles, trait interrompu court pour les arêtes cachées, trait mixte fin pour les axes."),
      it("cours", "Méthode des projections orthogonales : disposition européenne des six vues normalisées", "Correspondance géométrique étroite entre vue de face, vue de gauche, vue de droite, vue de dessus et vue de dessous."),
      it("cours", "Représentation des formes intérieures : coupes simples, demi-coupes et sections sorties", "Règles de hachures selon la nature du matériau (aciers, alliages d'aluminium, matières plastiques)."),
      it("application", "Initiation à la Conception Assistée par Ordinateur (CAO 3D)", "Création d'esquisses 2D contraintes, extrusion volumique, perçage, congé et assemblage de pièces virtuelles.")
    ])
  ]),
  ch("Module 3 : Solutions constructives d'assemblage et de guidage", [
    sec("Liaisons mécaniques et organes associés", [
      it("cours", "Typologie des liaisons mécaniques normalisées (degrés de liberté en translation et rotation)", "Liaisons encastrement, pivot, glissière, hélicoïdale, appui-plan, linéaire rectiligne, et rotule."),
      it("cours", "Solutions d'assemblage démontable et indémontable", "Vis, boulons, goujons, goupilles, clavettes, rivets, emmanchement fretté et soudage."),
      it("cours", "Guidage en rotation : solutions par contact direct (coussinets autolubrifiants) et par roulements", "Roulements rigides à billes, à rouleaux coniques : règles de montage et arrêts axiaux.")
    ])
  ]),
  ch("Module 4 : La chaîne d'énergie d'un système pluritechnologique", [
    sec("Alimenter, Distribuer, Convertir et Transmettre l'énergie", [
      it("cours", "Fonction Alimenter : sources d'énergie électrique (réseau ONEE, batteries) et pneumatique (compresseur)", "Grandeurs associées : tension, intensité, pression en bar, débit volumique en L/min."),
      it("cours", "Fonction Distribuer : les préactionneurs électriques (relais, contacteurs) et pneumatiques (distributeurs)", "Distributeurs 3/2 et 5/2 à commande électrique ou pneumatique."),
      it("cours", "Fonction Convertir : les actionneurs (moteurs électriques, vérins pneumatiques simple et double effet)", "Transformation de l'énergie en puissance mécanique de translation ou de rotation."),
      it("cours", "Fonction Transmettre et Adapter : transmission sans et avec transformation de mouvement", "Poulies-courroies, engrenages droits, pignon-crémaillère, système vis-écrou et calcul du rapport de transmission.")
    ])
  ]),
  ch("Module 5 : La chaîne d'information et automatisme", [
    sec("Acquérir, Traiter et Communiquer", [
      it("cours", "Fonction Acquérir : capteurs de position Tout-Ou-Rien (TOR), mécaniques, inductifs, capacitifs et optiques", "Principe de détection de présence, de fin de course et d'obstacle."),
      it("cours", "Fonction Traiter : l'unité de commande programmable (microcontrôleur, automate programmable)", "Exécution séquentielle des consignes de pilotage."),
      it("cours", "Modélisation des cycles de fonctionnement par GRAFCET niveau 1 (point de vue système)", "Étapes actives, transitions, réceptivités logiques associées et actions élémentaires.")
    ])
  ])
];

export const si2BAC_SMB = [
  ch("Module 1 : Analyse fonctionnelle et modélisation SysML des systèmes complexes", [
    sec("Ingénierie système et langage SysML", [
      it("cours", "Concepts de l'ingénierie système appliquée aux systèmes mécatroniques modernes", "Approche globale d'un système cyber-physique autonome."),
      it("methode", "Diagrammes comportementaux SysML : Diagramme des Cas d'Utilisation (uc) et de Séquence (sd)", "Identification des acteurs externes, des cas d'usage et des flux temporels d'échanges d'informations."),
      it("methode", "Diagrammes structurels SysML : Diagramme de Définition de Blocs (bdd) et Blocs Internes (ibd)", "Hiérarchie des sous-systèmes, flux de matière, d'énergie et de signal à travers les ports de communication."),
      it("methode", "Diagramme des Exigences (req) et traçabilité des performances", "Relations de dérivation (deriveReqt), de satisfaction (satisfy) et de validation expérimentale (verify).")
    ])
  ]),
  ch("Module 2 : Modélisation cinématique des mécanismes", [
    sec("Cinématique du solide indéformable et torseurs cinématiques", [
      it("cours", "Graphe des liaisons et détermination rigoureuse des classes d'équivalence cinématique", "Schématisation cinématique minimale normalisée dans l'espace tridimensionnel."),
      it("cours", "Torseur cinématique d'un solide par rapport à un repère : vecteur rotation et champ des vitesses", "Relation fondamentale de champ des moments (formule de Varignon) : V(B) = V(A) + BA ^ Omega."),
      it("cours", "Composition des mouvements : loi de dérivation vectorielle dans les repères mobiles", "Vitesse absolue, vitesse relative et vitesse d'entraînement ; accélération absolue et accélération de Coriolis."),
      it("application", "Cinématique graphique plane : Centre Instantané de Rotation (CIR) et propriété d'équiprojectivité", "Résolution géométrique rapide des vecteurs vitesses sur mécanismes articulés plans.")
    ])
  ]),
  ch("Module 3 : Modélisation des actions mécaniques et Statique", [
    sec("Torseurs d'actions mécaniques et équilibre des systèmes", [
      it("cours", "Modélisation torsorielle des actions mécaniques de contact transmissibles par les liaisons parfaites", "Torseurs des liaisons normalisées : composantes d'efforts et de moments transmissibles au point de contact."),
      it("cours", "Actions mécaniques à distance : pesanteur, actions magnétiques et centre de gravité", "Torseur d'action pesanteur appliqué au barycentre d'un système matériel."),
      it("loi", "Principe Fondamental de la Statique (PFS) sous forme vectorielle et torsorielle", "Condition nécessaire et suffisante d'équilibre : somme des torseurs d'actions mécaniques extérieures nulle."),
      it("cours", "Lois du frottement et de l'adhérence de Coulomb : cône de frottement et arc-boutement", "Coefficient d'adhérence f0, coefficient de frottement f, et calcul des conditions de non-glissement."),
      it("application", "Résolution analytique et graphique de systèmes matériels isostatiques", "Isolement d'un sous-ensemble, bilan complet des actions extérieures et calcul des inconnues de liaison.")
    ])
  ]),
  ch("Module 4 : La chaîne d'énergie : Puissance électrique et électrotechnique", [
    sec("Actionneurs électriques industriels et électronique de commande", [
      it("cours", "Moteurs à Courant Continu (MCC) : équations électromécaniques fondamentales, couple et vitesse", "Modélisation : E = k*Omega, C = k*I, bilan énergétique et commande par hacheur 4 quadrants (MLI)."),
      it("cours", "Moteurs asynchrones triphasés : constitution, principe du champ tournant, caractéristique couple-vitesse", "Glissement, point de fonctionnement avec la charge mécanique et commande par variateur de fréquence scalaire (U/f)."),
      it("cours", "Moteurs synchrones et servomoteurs 'brushless' à aimants permanents", "Performances dynamiques, autopilotage et utilisation dans la robotique de précision.")
    ]),
    sec("Transmission et transformation de puissance mécanique", [
      it("cours", "Trains d'engrenages simples et trains épicycloïdaux : calcul de la raison cinématique", "Formule de Willis appliquée aux réducteurs épicycloïdaux à planétaires et satellites."),
      it("cours", "Système vis-écrou à billes : transformation de mouvement rotation-translation à haut rendement", "Pas de la vis, réversibilité, calcul de la vitesse d'avance linéaire et poussée axiale.")
    ])
  ]),
  ch("Module 5 : La chaîne d'information : Systèmes asservis et traitement du signal", [
    sec("Automatique des systèmes continus et échantillonnés", [
      it("cours", "Structure générale d'un système asservi en boucle fermée (consigne, comparateur, correcteur, capteur)", "Concepts clés : précision statique, rapidité (temps de réponse à 5%) et stabilité (marges de gain et de phase)."),
      it("cours", "Modélisation temporelle et fréquentielle par transformée de Laplace : fonctions de transfert", "Systèmes du 1er et du 2ème ordre : réponse indicielle à un échelon, pulsation propre et coefficient d'amortissement."),
      it("cours", "Représentations fréquentielles : lieux de Bode (gain et phase) et identification expérimentale", "Tracé asymptotique de Bode et détermination des caractéristiques fréquentielles d'un système."),
      it("cours", "Les correcteurs industriels PID (Proportionnel, Intégrateur, Dérivateur)", "Rôle de l'action P (rapidité), I (élimination de l'erreur statique), D (amortissement et stabilité).")
    ]),
    sec("Systèmes séquentiels et programmation industrielle", [
      it("cours", "GRAFCET point de vue commande et point de vue partie opérative : structures avancées", "Sélections de séquences exclusives, séquences simultanées (parallélisme ET), macro-étapes et temporisations."),
      it("cours", "GEMMA (Guide d'Étude des Modes de Marches et d'Arrêts)", "Procédures de mise en route, d'arrêt d'urgence, de marche de préparation et de production normale."),
      it("application", "Programmation des Automates Programmables Industriels (API) en langage Ladder et C embarqué", "Implémentation d'un automatisme complet avec gestion des sécurités et dialogue IHM.")
    ])
  ])
];
