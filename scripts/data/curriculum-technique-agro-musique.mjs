import { ch, sec, it } from '../curriculum-builder-helpers.mjs';

export const musiqueCollege = [
  ch("Module 1 : Solfège, théorie et écriture musicale", [
    sec("La notation musicale universelle", [
      it("cours", "La portée musicale, les clés de sol et de fa, et l'ordonnancement des notes", "Emplacement des notes sur les lignes et dans les interlignes, portées supplémentaires."),
      it("cours", "Les figures de notes et de silences : durées relatives et valeurs de temps", "La ronde (4 temps), la blanche (2 temps), la noire (1 temps), la croche (1/2 temps), double-croche et silences correspondants (pause, demi-pause, soupir, demi-soupir)."),
      it("cours", "Les altérations (dièse, bémol, bécarre) et les armures de clés", "Effets sur la hauteur des sons, tons et demi-tons diatoniques et chromatiques."),
      it("cours", "La mesure musicale : battement, chiffrage et tempo", "Mesures simples à 2/4, 3/4, 4/4 et initiation aux mesures composées (6/8) ; tempi lents (Largo, Adagio), modérés (Andante) et rapides (Allegro, Presto).")
    ])
  ]),
  ch("Module 2 : Voix, chant choral et interprétation", [
    sec("Technique vocale et pratique chorale collective", [
      it("cours", "Anatomie de l'appareil vocal et respiration diaphragmatique", "Posture corporelle droite, soutien abdominal, gestion de la colonne d'air et détente des cordes vocales."),
      it("cours", "Diction, vocalises d'échauffement et justesse mélodique", "Placement des voyelles, articulation consonantique nette et résonance dans les cavités faciales."),
      it("application", "Interprétation de l'Hymne national marocain et de chants patriotiques", "Respect du tempo solennel, de la nuance dynamique et de la ferveur collective."),
      it("cours", "Initiation à la polyphonie et au canon à deux et trois voix", "Écoute active des autres pupitres, synchronisation rythmique et équilibre des nuances (piano, mezzo-forte, forte).")
    ])
  ]),
  ch("Module 3 : Le patrimoine musical marocain et ses richesses régionales", [
    sec("Traditions savantes et populaires du Maroc", [
      it("cours", "La musique arabo-andalouse (Al-Ala marocaine) : structure de la Nouba", "Les cinq mouvements rythmiques (Mizan) : Bassit, Qaïm wa Nisf, Btaïhi, Darj, Qoddam, et la poésie chantée du Mouachah et du Zajal."),
      it("cours", "L'art authentique du Melhoun : poésie populaire, chantre et orchestre traditionnel", "Histoire des poètes artisans de Meknès, Fès et Marrakech, structure de la Qasida et rôle du Tarija."),
      it("cours", "La musique Gnaoua : rituels ancestraux, transes et syncrétisme africain", "Le rythme binaire et ternaire des Qraqeb (crotales en fer) et les sonorités profondes du Guembri (luth-tambour)."),
      it("cours", "Les musiques amazighes et sahariennes : Ahidous de l'Atlas, Ahwach du Souss et musique Hassanie", "Chants collectifs responsoriaux, polyrythmie des tambours Bendir, et poésie saharienne au son de la Tidinit.")
    ])
  ]),
  ch("Module 4 : Organologie et découverte des instruments du monde", [
    sec("Classification des instruments de musique", [
      it("cours", "Classification scientifique de Hornbostel-Sachs", "Cordophones (cordes), Aérophones (vent), Membranophones (peaux vibrantes) et Idiophones (matière auto-vibrante)."),
      it("cours", "Les instruments orientaux et maghrébins emblématiques", "L'Oud (luth oriental à manche court), le Qanun (cithare à cordes pincées), le Nay (flûte en roseau), le Riqq et la Derbouka."),
      it("cours", "Les grandes familles de l'orchestre symphonique occidental", "Cordes frottées (violon, alto, violoncelle, contrebasse), bois (flûte, hautbois, clarinette, basson), cuivres (trompette, cor, trombone, tuba) et percussions.")
    ])
  ])
];

export const agro2BAC = [
  ch("Module 1 : Pédologie appliquée et conservation des sols marocains", [
    sec("Propriétés physico-chimiques et travail du sol", [
      it("cours", "Constitution minérale et organique des sols agricoles au Maroc (texture et structure)", "Granulométrie (argile, limon, sable), porosité, rétention de l'eau utile et aération racinaire."),
      it("cours", "Le complexe argilo-humique (CAH), le pH du sol et la Capacité d'Échange Cationique (CEC)", "Fixation des cations nutritifs (Ca2+, Mg2+, K+, NH4+), assimilation racinaire et amendements calciques."),
      it("cours", "L'érosion des sols, la désertification et les techniques de conservation des terres", "Lutte contre l'érosion hydrique dans le Rif et éolienne dans le Sud : terrasses, banquettes, brise-vents et semis direct sous couverture végétale."),
      it("application", "Analyse agronomique d'un sol et choix des outils de travail du sol (labour, décompactage, hersage)", "Préparation du lit de semences et préservation de la structure motteuse contre le compactage.")
    ])
  ]),
  ch("Module 2 : Nutrition minérale des plantes et fertilisation raisonnée", [
    sec("Besoins nutritifs et plan de fumure", [
      it("cours", "Les macro-éléments indispensables : Azote (N), Phosphore (P), Potassium (K) et éléments secondaires", "Rôle de l'azote dans la croissance végétative, du phosphore dans l'enracinement et la floraison, et du potassium dans la résistance à la sécheresse et le calibre des fruits."),
      it("cours", "Les oligo-éléments essentiels (Fer, Zinc, Manganèse, Bore, Cuivre) et correction des carences", "Chlorose ferrique en sols calcaires et apports de chélates de fer par pulvérisation foliaire."),
      it("cours", "Calcul précis du bilan de fertilisation et élaboration du plan prévisionnel de fumure", "Évaluation des exportations des cultures, des fournitures du sol et calcul des doses d'engrais minéraux et organiques (compost).")
    ])
  ]),
  ch("Module 3 : Gestion rationnelle de l'eau et irrigation de précision", [
    sec("Économie de l'eau en milieu méditerranéen et aride", [
      it("cours", "Le cycle de l'eau dans le continuum Sol-Plante-Atmosphère : Évapotranspiration (ETP et ETM)", "Calcul des besoins nets en eau des cultures selon le coefficient cultural (Kc) et les données météorologiques."),
      it("cours", "Les systèmes d'irrigation modernes : micro-irrigation localisée (goutte-à-goutte) et fertigation", "Réseau de distribution, régulateurs de pression, stations de filtration (filtres à sable, à disques) et injecteurs d'engrais."),
      it("cours", "La stratégie nationale de l'eau au Maroc : grands barrages, interconnexion des bassins et dessalement d'eau de mer", "Modernisation des périmètres irrigués (Programme National d'Économie d'Eau en Irrigation PNEEI).")
    ])
  ]),
  ch("Module 4 : Productions végétales et arboriculture marocaine", [
    sec("Conduite technique des grandes cultures et vergers", [
      it("cours", "La céréaliculture (blé dur, blé tendre, orge) : itinéraires techniques, densité de semis et protection", "Stades phénologiques (tallage, montaison, épiaison), désherbage sélectif et récolte mécanique."),
      it("cours", "L'arboriculture fruitière stratégique : Olivier, Agrumes, Palmier dattier et Amandier", "Taille de formation et de fructification, pollinisation artificielle du palmier, alternance de production et récolte."),
      it("cours", "Les cultures maraîchères de primeurs sous abri-serre (tomate, poivron, melon)", "Conduite climatique des serres (aération, ombrage), tuteurage, pollinisation par les bourdons."),
      it("cours", "La protection intégrée des cultures (IPM) et lutte biologique", "Seuils d'intervention économique, lâchers d'auxiliaires (acariens prédateurs), piégeage à phéromones et respect des normes phytosanitaires (ONSSA).")
    ])
  ]),
  ch("Module 5 : Productions animales et gestion d'exploitation", [
    sec("Zootechnie des filières animales marocaines", [
      it("cours", "Filières ovine et bovine : races locales adaptées (Sardi, Timahdite, D'man) et races laitières sélectionnées", "Objectifs de sélection génétique, conformation bouchère et rusticité face aux aléas climatiques."),
      it("cours", "Alimentation rationnée du bétail : fourrages, ensilage, concentrés et équilibrage énergétique/azoté", "Calcul des Unités Fourragères (UF) et des Protéines Digestibles dans l'Intestin (PDI)."),
      it("cours", "Stratégies agricoles nationales : Plan Maroc Vert et Génération Green 2020-2030", "Agrégation agricole, valorisation des produits du terroir (appellations d'origine AOP/IGP) et rentabilité de l'exploitation.")
    ])
  ])
];

export const ste1BAC = [
  ch("Module 1 : Lois fondamentales des circuits électriques et théorèmes de réseaux", [
    sec("Courant continu et méthodes d'analyse des réseaux", [
      it("cours", "Grandeurs électriques fondamentales : potentiel, tension, intensité, énergie et puissance électrique", "Dipôles passifs linéaires (résistances) et dipôles actifs (générateurs de tension et de courant idéaux et réels)."),
      it("loi", "Lois de Kirchhoff dans les circuits à mailles multiples : loi des nœuds et loi des mailles", "Établissement rigoureux des équations de circuits."),
      it("cours", "Théorème de Thévenin et théorème de Norton : modélisation équivalente des dipôles actifs", "Calcul de la f.é.m. de Thévenin Eth, du courant de court-circuit Icc et de la résistance interne Rth."),
      it("cours", "Théorème de superposition et théorème de Millman", "Résolution rapide des potentiels de nœuds dans les réseaux à plusieurs sources indépendantes.")
    ])
  ]),
  ch("Module 2 : Régime alternatif sinusoïdal monophasé et puissances", [
    sec("Analyse fréquentielle et bilan de puissance", [
      it("cours", "Grandeurs sinusoïdales : valeur instantanée, amplitude, valeur efficace, période, fréquence et phase", "Relation fondamentale : Ueff = Umax / racine(2)."),
      it("cours", "Représentation vectorielle de Fresnel et méthode des nombres complexes appliquée aux impédances", "Impédance complexe d'une résistance (R), d'une inductance pure (j*L*omega) et d'un condensateur (1 / (j*C*omega))."),
      it("cours", "Bilan des puissances en alternatif : puissance active P (Watts), réactive Q (VAR) et apparente S (VA)", "Triangle des puissances, théorème de Boucherot et calcul du facteur de puissance cos(phi)."),
      it("application", "Compensation de l'énergie réactive et relèvement du facteur de puissance par batterie de condensateurs", "Diminution des pertes par effet Joule en ligne et réduction des factures électriques industrielles.")
    ])
  ]),
  ch("Module 3 : Électronique analogique et composants discrets", [
    sec("Semi-conducteurs et amplification", [
      it("cours", "La diode à jonction PN et la diode Zener : caractéristiques I=f(U) et applications", "Redressement simple et double alternance, stabilisation et régulation de tension continue."),
      it("cours", "Le transistor bipolaire (NPN et PNP) : régimes de fonctionnement (bloqué, saturé, amplificateur)", "Point de fonctionnement au repos, droite de charge statique et coefficient d'amplification en courant beta."),
      it("cours", "L'Amplificateur Opérationnel (AOP) en régime linéaire : montages fondamentaux", "Montage suiveur, amplificateur inverseur, non inverseur, sommateur et soustracteur différentiel."),
      it("cours", "L'AOP en régime de saturation : comparateurs simples et comparateur à hystérésis (Trigger de Schmitt)", "Élimination des parasites de commutation et mise en forme de signaux analogiques en signaux TOR.")
    ])
  ]),
  ch("Module 4 : Logique combinatoire et séquentielle", [
    sec("Systèmes logiques et traitement numérique", [
      it("cours", "Systèmes de numération (Binaire, Hexadécimal, BCD) et codes pondérés / non pondérés", "Conversions de bases et opérations arithmétiques binaires de base."),
      it("cours", "Algèbre de Boole : théorèmes de De Morgan et simplification des fonctions logiques par tableaux de Karnaugh", "Recherche de la forme disjonctive minimale (somme de produits)."),
      it("cours", "Circuits logiques combinatoires intégrés : multiplexeurs, démultiplexeurs, décodeurs et afficheurs 7 segments", "Aiguillage des données et affichage numérique."),
      it("cours", "Circuits logiques séquentiels : bascules RS, D et JK synchrones et asynchrones", "Fonction mémoire, chronogrammes temporels, compteurs binaires et registres à décalage.")
    ])
  ])
];

export const ste2BAC = [
  ch("Module 1 : Systèmes triphasés équilibrés et machines tournantes", [
    sec("Électrotechnique des réseaux triphasés industriels", [
      it("cours", "Réseaux triphasés équilibrés : tensions simples (V) et composées (U), déphasage de 120°", "Relation U = V * racine(3) ; couplages des récepteurs en étoile (Y) et en triangle (Delta)."),
      it("cours", "Puissances en triphasé équilibré et méthode des deux wattmètres", "P = racine(3) * U * I * cos(phi) ; calcul de la puissance réactive totale et du facteur de puissance de l'installation.")
    ]),
    sec("Transformateurs et machines asynchrones triphasées", [
      it("cours", "Le transformateur triphasé industriel : constitution, rapport de transformation et indice horaire", "Schéma équivalent ramené au secondaire, essai à vide, essai en court-circuit et calcul du rendement."),
      it("cours", "Moteurs asynchrones triphasés à cage d'écureuil : principe du champ tournant statorique", "Fréquence de synchronisme Ns, glissement g, couple électromagnétique, caractéristique mécanique Cu=f(N)."),
      it("cours", "Procédés de démarrage des moteurs asynchrones et variateurs de vitesse industriels", "Démarrage direct, étoile-triangle, démarreurs électroniques progressifs et variateurs de fréquence scalaires (U/f).")
    ])
  ]),
  ch("Module 2 : Électronique de puissance et conversion statique d'énergie", [
    sec("Commutation de puissance et convertisseurs", [
      it("cours", "Composants électroniques de puissance : Thyristors, Triacs, Transistors MOSFET de puissance et IGBT", "Pertes par conduction et par commutation, caractéristiques de commande de gâchette et protections."),
      it("cours", "Les redresseurs commandés (ponts mixtes et tout thyristors monophasés et triphasés)", "Contrôle de l'angle d'amorçage alpha, calcul de la tension moyenne redressée et filtrage LC."),
      it("cours", "Les hacheurs série et réversibles : conversion continu-continu", "Rapport cyclique alpha, tension moyenne de sortie, conduction continue et commande en modulation de largeur d'impulsion (MLI)."),
      it("cours", "Les onduleurs autonomes de tension monophasés et triphasés", "Onduleur en pont à commande MLI (PWM) pour la génération d'ondes sinusoïdales à fréquence variable destinées aux moteurs AC.")
    ])
  ]),
  ch("Module 3 : Systèmes automatisés, microcontrôleurs et réseaux de communication", [
    sec("Programmation embarquée et automatique industrielle", [
      it("cours", "Architecture interne des microcontrôleurs (CPU, Registres, Mémoires Flash/RAM/EEPROM, Périphériques E/S)", "Gestion des entrées-sorties Tout-Ou-Rien (TOR), convertisseur analogique-numérique (CAN 10 bits), timers et modules PWM."),
      it("cours", "Programmation des microcontrôleurs en langage C embarqué : gestion des interruptions matérielles", "Routage des interruptions externes, boucle principale et réactivité temps réel."),
      it("cours", "Automates Programmables Industriels (API) : architecture, câblage et programmation Grafcet / Ladder", "Traitement séquentiel et combinatoire, sécurité intrinsèque et liaison avec les pupitres opérateur IHM."),
      it("cours", "Bus de terrain et communication industrielle : Modbus RTU/TCP, bus CAN, bus I2C et SPI", "Structure de trames de données, détection d'erreurs par CRC et interconnexion des capteurs/actionneurs intelligents.")
    ])
  ])
];

export const stm1BAC = [
  ch("Module 1 : Dessin industriel, modélisation 3D CAO et tolérancements", [
    sec("Représentation technique et géométrie des formes", [
      it("cours", "Normalisation du dessin technique : formats de feuilles, cartouche d'inscription et traits normalisés", "Tracé rigoureux selon les normes ISO."),
      it("cours", "Projections orthogonales, coupes simples, demi-coupes et sections rabattues / sorties", "Règles de projection, plans de coupe sécants et hachures distinctives selon les métaux et alliages."),
      it("cours", "Modélisation volumique 3D paramétrique sur logiciel de CAO", "Contraintes géométriques d'esquisse (coïncidence, parallélisme, tangence), opérations de révolution, extrusion et balayage.")
    ]),
    sec("Cotation fonctionnelle et tolérancements géométriques", [
      it("cours", "La cotation fonctionnelle : établissement rigoureux des chaînes de cotes unidirectionnelles", "Identification de la cote-condition (jeu fonctionnel), boucle fermée des vecteurs-cotes et calcul des cotes limites max et min."),
      it("cours", "Ajustements normalisés ISO (système de l'alésage normalisé H)", "Ajustements avec jeu (ex: H7/g6), ajustements incertains (ex: H7/k6) et avec serrage (ex: H7/p6)."),
      it("cours", "Tolérancements géométriques de forme, d'orientation, de position et de battement", "Rectitude, planéité, circularité, parallélisme, perpendicularité, coaxialité et localisation.")
    ])
  ]),
  ch("Module 2 : Mécanique appliquée : Statique et cinématique des mécanismes", [
    sec("Équilibre des mécanismes et torseurs d'action", [
      it("cours", "Modélisation des liaisons mécaniques élémentaires et détermination des degrés de liberté", "Tableau récapitulatif des 11 liaisons normalisées et torseurs d'actions mécaniques transmissibles."),
      it("loi", "Le Principe Fondamental de la Statique (PFS) sous forme vectorielle et analytique", "Isolement d'un solide ou d'un ensemble de solides, bilan complet des forces et moments extérieurs, et résolution d'équations."),
      it("cours", "Lois du frottement et de l'adhérence de Coulomb : cône de frottement", "Calcul des conditions de blocage et de glissement dans les freins et embrayages mécaniques.")
    ]),
    sec("Cinématique du solide et transmissions de mouvement", [
      it("cours", "Cinématique du point et du solide en mouvement de translation et de rotation d'axe fixe", "Trajectoire, vitesse linéaire, vitesse angulaire omega et accélération tangentielle/normale."),
      it("cours", "Transmissions par engrenages droits, coniques et roues dentées", "Calcul des diamètres primitifs, du module normalisé, de l'entraxe et du rapport global de réduction cinématique.")
    ])
  ]),
  ch("Module 3 : Procédés de fabrication mécanique et métrologie d'atelier", [
    sec("Technologie d'usinage conventionnel et contrôle", [
      it("cours", "Usinage par tournage : géométrie de l'outil coupant, chariotage, dressage, chanfreinage et filetage", "Paramètres de coupe : Vitesse de coupe Vc (m/min), Avance f (mm/tr), Profondeur de passe ap (mm)."),
      it("cours", "Usinage par fraisage : fraisage de profil, surfaçage, rainurage et fraisage combiné", "Fraisage en concordance (avalant) et en opposition ; calcul de la fréquence de rotation N (tr/min) et de l'avance Vf."),
      it("cours", "Métrologie d'atelier : utilisation des instruments de mesure dimensionnelle et géométrique", "Pied à coulisse au 1/50e, micromètre d'extérieur (palmer), comparateur à cadran et jauges tampons/fourches."),
      it("cours", "Hygiène, sécurité et prévention des risques d'accidents en atelier mécanique industriel", "Port obligatoire des EPI (lunettes, chaussures de sécurité), arrêts d'urgence et consignation des machines.")
    ])
  ])
];

export const stm2BAC = [
  ch("Module 1 : Résistance des Matériaux (RDM) appliquée aux organes de machines", [
    sec("Dimensionnement des pièces sous sollicitations simples", [
      it("cours", "Hypothèses fondamentales de la RDM : milieu homogène, isotrope, continuité et déformations élastiques", "Domaine de validité de la loi de Hooke (sigma = E * epsilon) et module de Young E."),
      it("cours", "Sollicitation d'extension et de compression simples", "Contrainte normale sigma = N / S, allongement relatif delta_L, condition de résistance mécanique (sigma <= Rpe = Re / s)."),
      it("cours", "Sollicitation de cisaillement simple appliquée aux rivets, boulons et goupilles", "Contrainte tangentielle tau = T / S, déformation angulaire gamma, module de cisaillement G et dimensionnement."),
      it("cours", "Sollicitation de torsion simple des arbres de transmission circulaires", "Contrainte tangentielle maximale tau_max = (Mt * R) / Io, angle unitaire de torsion theta et rigidité de l'arbre."),
      it("cours", "Sollicitation de flexion plane simple des poutres droites", "Diagrammes des efforts tranchants Ty et des moments fléchissants Mfz, contrainte normale maximale de flexion et flèche.")
    ])
  ]),
  ch("Module 2 : Dynamique et énergétique des systèmes mécaniques", [
    sec("Mécanique générale et théorèmes énergétiques", [
      it("cours", "Centres d'inertie et moments d'inertie des solides usuels par rapport à un axe", "Théorème de Huygens pour le déplacement d'axe d'inertie."),
      it("loi", "Le Principe Fondamental de la Dynamique (PFD) en translation et en rotation", "Somme des forces extérieures = m * a_G ; Somme des moments dynamiques = J_delta * theta_point_point."),
      it("cours", "Théorème de l'énergie cinétique et bilan des puissances", "Travail des forces constantes et variables, énergie cinétique de translation et de rotation, calcul du rendement et volant d'inertie.")
    ])
  ]),
  ch("Module 3 : Productique mécanique et Commande Numérique (CNC)", [
    sec("Programmation ISO et Commande Numérique", [
      it("cours", "Structure des Machines-Outils à Commande Numérique (MOCN) : tours et centres d'usinage CNC", "Axes normalisés (X, Y, Z), origines machine (Om), origine programme (Opp) et décalages d'origines (PREF, DEC)."),
      it("cours", "Programmation en code ISO : fonctions préparatoires G (G00, G01, G02, G03, G90, G91) et auxiliaires M (M03, M05, M06, M08)", "Interpolation linéaire, circulaire, cycles fixes d'ébauche et de perçage automatique."),
      it("cours", "La chaîne CFAO (Conception et Fabrication Assistées par Ordinateur)", "Génération automatique des trajectoires d'outils, post-processeur et simulation 3D de l'usinage sans collision."),
      it("cours", "Procédés de fabrication avancés : découpe au jet d'eau haute pression, découpe laser et impression 3D métallique", "Principes physiques, tolérances obtenues et domaines d'application dans l'aéronautique et l'automobile au Maroc.")
    ])
  ])
];
