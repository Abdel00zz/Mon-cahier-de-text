import { ch, sec, it } from '../curriculum-builder-helpers.mjs';

export const physique1AC = [
  ch("Chapitre 1 : L'eau dans notre environnement", [
    sec("Les réservoirs naturels d'eau", [
      it("activite", "Identifier les différents réservoirs d'eau sur la Terre"),
      it("cours", "Répartition de l'eau sur le globe : mers, glaciers, nappes souterraines"),
      it("application", "Calculer le pourcentage d'eau douce exploitable par l'Homme")
    ]),
    sec("Le cycle naturel de l'eau", [
      it("cours", "Les étapes du cycle de l'eau : évaporation, condensation, précipitations"),
      it("observation", "Observation des changements d'état lors du cycle de l'eau"),
      it("conclusion", "Importance vitale de la préservation des ressources en eau")
    ])
  ]),
  ch("Chapitre 2 : Les trois états physiques de la matière", [
    sec("Propriétés physiques des solides et des liquides", [
      it("activite", "Manipuler des solides compacts et divisés, et des liquides"),
      it("cours", "Forme propre des solides compacts et absence de forme propre des liquides"),
      it("observation", "Planité et horizontalité de la surface libre d'un liquide au repos")
    ]),
    sec("Propriétés physiques des gaz", [
      it("activite", "Mise en évidence de l'absence de forme propre et de volume propre d'un gaz"),
      it("cours", "Compressibilité et expansibilité des gaz à l'aide d'une seringue"),
      it("application", "Comparer les trois états de la matière dans un tableau synthétique")
    ])
  ]),
  ch("Chapitre 3 : Mesure du volume des liquides et des solides", [
    sec("Unités de volume et instruments de mesure", [
      it("cours", "Notion de volume et capacité, unités usuelles ($L$, $mL$, $m^3$, $cm^3$)"),
      it("methode", "Utiliser correctement une éprouvette graduée et lire le ménisque"),
      it("exercice", "Conversions d'unités de volume et de capacité")
    ]),
    sec("Mesure du volume d'un solide", [
      it("methode", "Méthode par déplacement de liquide pour un solide de forme quelconque"),
      it("application", "Calculer le volume d'un solide géométrique régulier ($V=a^3$, $V=L\\times l\\times h$)")
    ])
  ]),
  ch("Chapitre 4 : Mesure de la masse des solides et des liquides", [
    sec("Unités de masse et pesée", [
      it("cours", "Unités de masse (kilogramme, gramme, milligramme, tonne)"),
      it("methode", "Utilisation de la balance électronique et fonction tare"),
      it("experience", "Mesurer la masse d'un liquide en tenant compte du récipient")
    ])
  ]),
  ch("Chapitre 5 : La masse volumique", [
    sec("Notion de masse volumique", [
      it("definition", "Définition de la masse volumique $\\rho = \\frac{m}{V}$"),
      it("cours", "Unités usuelles : $kg/m^3$ et $g/cm^3$"),
      it("experience", "Déterminer expérimentalement la masse volumique de l'eau et de l'huile"),
      it("application", "Identifier un métal inconnu d'après sa masse volumique mesurée")
    ])
  ]),
  ch("Chapitre 6 : Pression et pression atmosphérique", [
    sec("Notion de pression d'un gaz", [
      it("activite", "Expérience de la seringue : comprimer et détendre un gaz enfermé"),
      it("definition", "Définition de la pression $P = \\frac{F}{S}$ et unité internationale (Pascal)"),
      it("cours", "Instruments de mesure de pression : manomètre")
    ]),
    sec("La pression atmosphérique", [
      it("cours", "Mise en évidence de la pression atmosphérique (verre d'eau renversé)"),
      it("cours", "Mesure au baromètre, valeur normale au niveau de la mer ($1013\\text{ hPa}$)"),
      it("application", "Effet de l'altitude sur la valeur de la pression atmosphérique")
    ])
  ]),
  ch("Chapitre 7 : Modèle particulaire de la matière", [
    sec("Interprétation microscopique des états physiques", [
      it("cours", "Hypothèse particulaire : molécules en mouvement ou ordonnées"),
      it("observation", "Modélisation de l'état solide (ordonné et compact)"),
      it("observation", "Modélisation de l'état liquide (désordonné et compact)"),
      it("observation", "Modélisation de l'état gazeux (désordonné et dispersé)"),
      it("conclusion", "Conservation du nombre de particules lors des déformations physiques")
    ])
  ]),
  ch("Chapitre 8 : Chaleur et changements d'états physiques", [
    sec("Chaleur et température", [
      it("cours", "Distinction fondamentale entre chaleur (énergie transférée) et température"),
      it("methode", "Utilisation du thermomètre et échelle Celsius ($^\\circ\\text{C}$)")
    ]),
    sec("Les changements d'états physiques de l'eau", [
      it("experience", "Tracer la courbe de fusion et de solidification de l'eau pure"),
      it("loi", "Palier de température pendant le changement d'état d'un corps pur"),
      it("cours", "Conservation de la masse et variation du volume lors du gel de l'eau")
    ])
  ]),
  ch("Chapitre 9 : Les mélanges et corps purs", [
    sec("Mélanges homogènes et hétérogènes", [
      it("activite", "Mélanger eau et sel, eau et huile, eau et sable"),
      it("definition", "Définition d'un mélange homogène et d'un mélange hétérogène"),
      it("cours", "Miscibilité de deux liquides et émulsion temporaire")
    ])
  ]),
  ch("Chapitre 10 : La dissolution dans l'eau", [
    sec("Solution, soluté et solvant", [
      it("definition", "Définition du solvant (l'eau), du soluté et de la solution aqueuse"),
      it("cours", "Limite de solubilité et notion de solution saturée"),
      it("loi", "Conservation de la masse totale lors de la dissolution")
    ])
  ]),
  ch("Chapitre 11 : Séparation des constituants d'un mélange", [
    sec("Techniques usuelles de séparation", [
      it("methode", "La décantation et la centrifugation pour séparer solide et liquide"),
      it("methode", "La filtration : rôle du filtre et obtention d'un filtrat limpide"),
      it("experience", "La distillation simple : obtention d'eau distillée pure (distillat)")
    ])
  ]),
  ch("Chapitre 12 : Le circuit électrique simple", [
    sec("Éléments du circuit électrique", [
      it("activite", "Allumer une lampe avec une pile plate et des pinces crocodiles"),
      it("cours", "Rôle du générateur (pile), des récepteurs (lampe, moteur) et de l'interrupteur"),
      it("methode", "Symboles normalisés et tracé du schéma électrique"),
      it("cours", "Notion de court-circuit et dangers d'incendie")
    ])
  ]),
  ch("Chapitre 13 : Types de montages électriques", [
    sec("Montages en série et en dérivation", [
      it("experience", "Montage de deux lampes en série : conséquences du dévissage d'une lampe"),
      it("experience", "Montage de deux lampes en dérivation : indépendance des récepteurs"),
      it("application", "Choix du montage en dérivation pour l'installation domestique")
    ])
  ])
];

export const physique2AC = [
  ch("Chapitre 1 : L'air qui nous entoure", [
    sec("Les couches de l'atmosphère terrestre", [
      it("cours", "Structure de l'atmosphère : troposphère, stratosphère, mésosphère, thermosphère"),
      it("cours", "Le rôle protecteur de la couche d'ozone contre les rayonnements ultraviolets"),
      it("application", "Origine des vents : mouvements de masses d'air entre zones de haute et basse pression")
    ]),
    sec("Propriétés de l'air et composition", [
      it("experience", "Mise en évidence de la masse de l'air (pesée d'un ballon gonflé et dégonflé)"),
      it("cours", "Composition volumique de l'air : environ $78\\%$ diazote, $21\\%$ dioxygène, $1\\%$ autres gaz")
    ])
  ]),
  ch("Chapitre 2 : Les molécules et les atomes", [
    sec("Structure microscopique de la matière", [
      it("definition", "Définition de l'atome et symboles chimiques ($H, C, O, N, Cl, Fe$)"),
      it("definition", "Définition de la molécule comme assemblage d'atomes liés"),
      it("cours", "Formules chimiques usuelles ($H_2O, CO_2, O_2, N_2, CH_4$) et modèles moléculaires compacts")
    ]),
    sec("Corps purs simples et composés", [
      it("cours", "Distinction entre corps pur simple (atomes identiques) et composé (atomes différents)")
    ])
  ]),
  ch("Chapitre 3 : Les combustions", [
    sec("Combustions dans le dioxygène", [
      it("experience", "Combustion du carbone dans l'air et dans le dioxygène pur"),
      it("observation", "Test au dioxyde de carbone à l'eau de chaux"),
      it("experience", "Combustion complète et incomplète du butane"),
      it("cours", "Dangers du monoxyde de carbone $CO$ et consignes de sécurité")
    ])
  ]),
  ch("Chapitre 4 : La réaction chimique et ses lois", [
    sec("Notion de transformation chimique", [
      it("definition", "Définition d'une réaction chimique : réactifs consommés et produits formés"),
      it("cours", "Distinction entre transformation physique et réaction chimique")
    ]),
    sec("Lois de la réaction chimique", [
      it("loi", "Loi de Lavoisier : conservation de la masse au cours d'une réaction"),
      it("loi", "Conservation du type et du nombre d'atomes entre réactifs et produits"),
      it("methode", "Écrire et équilibrer des équations chimiques simples ($C+O_2\\rightarrow CO_2$, $2H_2+O_2\\rightarrow 2H_2O$)")
    ])
  ]),
  ch("Chapitre 5 : Les sources et les récepteurs de lumière", [
    sec("Lumière et vision", [
      it("cours", "Sources primaires et secondaires de lumière"),
      it("cours", "Récepteurs de lumière : l'œil, les cellules photovoltaïques, le papier photographique"),
      it("conclusion", "Conditions pour qu'un objet soit visible par un observateur")
    ])
  ]),
  ch("Chapitre 6 : Propagation rectiligne de la lumière", [
    sec("Rayons lumineux et ombres", [
      it("loi", "Principe de la propagation rectiligne de la lumière dans un milieu transparent homogène"),
      it("cours", "Faisceaux lumineux (convergents, divergents, parallèles)"),
      it("application", "Formation des ombres : ombre propre, ombre portée, zone de pénombre et éclipses")
    ])
  ]),
  ch("Chapitre 7 : Les lentilles minces et formation d'images", [
    sec("Caractéristiques des lentilles minces", [
      it("observation", "Classification optique : lentilles convergentes à bords minces et divergentes à bords épais"),
      it("cours", "Centre optique $O$, axe optique, foyer principal image $F'$ et distance focale $f'$)"),
      it("definition", "Vergence d'une lentille $C = \\frac{1}{f'}$ en dioptries ($\\delta$)")
    ]),
    sec("Construction géométrique de l'image", [
      it("methode", "Tracé des trois rayons particuliers passant par $O$, parallèle à l'axe, ou passant par $F$"),
      it("cours", "Conditions de netteté de Gauss et nature de l'image (réelle, renversée, virtuelle)")
    ])
  ]),
  ch("Chapitre 8 : Dispersion de la lumière et couleurs", [
    sec("Décomposition de la lumière blanche", [
      it("experience", "Dispersion de la lumière par un prisme ou un réseau"),
      it("cours", "Spectre continu de la lumière blanche et phénomène de l'arc-en-ciel"),
      it("cours", "Lumière monochromatique et lumière polychromatique")
    ])
  ]),
  ch("Chapitre 9 : Le courant électrique continu", [
    sec("Intensité du courant continu", [
      it("cours", "Sens conventionnel du courant : de la borne positive vers la borne négative"),
      it("definition", "Intensité du courant électrique $I$, unité Ampère ($A$)"),
      it("methode", "Utilisation et branchement de l'ampèremètre en série"),
      it("loi", "Loi d'unicité de l'intensité en série et loi des nœuds en dérivation")
    ])
  ]),
  ch("Chapitre 10 : La tension électrique", [
    sec("Tension électrique et lois", [
      it("definition", "Notion de tension électrique $U$, unité Volt ($V$)"),
      it("methode", "Branchement du voltmètre en dérivation aux bornes d'un dipôle"),
      it("loi", "Loi d'additivité des tensions en série et d'égalité des tensions en dérivation")
    ])
  ]),
  ch("Chapitre 11 : La résistance électrique et la loi d'Ohm", [
    sec("Le conducteur ohmique", [
      it("cours", "Rôle modérateur d'une résistance dans un circuit électrique"),
      it("methode", "Mesure à l'ohmmètre et lecture par le code des couleurs"),
      it("loi", "Loi d'Ohm pour un conducteur ohmique : $U = R\\cdot I$"),
      it("application", "Tracer et exploiter la caractéristique intensité-tension d'un résistor")
    ])
  ])
];

export const physique3AC = [
  ch("Chapitre 1 : Quelques matériaux utilisés dans la vie quotidienne", [
    sec("Distinction objet et matériau", [
      it("activite", "Distinguer entre un objet technique et les matériaux qui le composent"),
      it("cours", "Les trois grandes familles de matériaux : métaux, matières plastiques, verres et céramiques"),
      it("methode", "Tests simples de distinction des métaux usuels : fer, cuivre, aluminium, zinc"),
      it("methode", "Tests de distinction des matières plastiques : PE, PVC, PS, PET (flottaison, combustion)")
    ])
  ]),
  ch("Chapitre 2 : Les atomes et les ions", [
    sec("Constitution de l'atome", [
      it("cours", "Noyau central chargé positivement et nuage électronique chargé négativement"),
      it("cours", "Neutralité électrique de l'atome : charge totale du noyau $+Ze$ et des électrons $-Ze$")
    ]),
    sec("Formation des ions", [
      it("definition", "Définition d'un cation (perte d'électrons) et d'un anion (gain d'électrons)"),
      it("cours", "Ions monoatomiques ($Fe^{2+}, Al^{3+}, Cl^-$) et polyatomiques ($SO_4^{2-}, NO_3^-, OH^-$)"),
      it("application", "Écrire le bilan de charge d'une solution électrolytique")
    ])
  ]),
  ch("Chapitre 3 : Oxydation de quelques métaux dans l'air", [
    sec("Oxydation du fer et de l'aluminium", [
      it("experience", "Facteurs favorisant la rouille du fer : dioxygène et eau"),
      it("cours", "Formation de la rouille ($Fe_2O_3$), matériau poreux qui ne protège pas le fer"),
      it("cours", "Oxydation de l'aluminium et formation de l'alumine ($Al_2O_3$), couche protectrice imperméable"),
      it("methode", "Techniques de protection du fer contre la corrosion (peinture, galvanisation)")
    ])
  ]),
  ch("Chapitre 4 : Combustions des matériaux organiques", [
    sec("Combustions et dangers", [
      it("experience", "Combustion du polyéthylène et du papier dans l'air"),
      it("cours", "Gaz formés lors de la combustion : dioxyde de carbone, eau, chlorure d'hydrogène, cyanure"),
      it("conclusion", "Sensibilisation aux risques d'intoxication et respect de l'environnement")
    ])
  ]),
  ch("Chapitre 5 : Solutions acides et solutions basiques", [
    sec("Notion de pH", [
      it("definition", "Définition du pH comme mesure du caractère acide, neutre ou basique à $25^\\circ\\text{C}$"),
      it("methode", "Mesure du pH au papier indicateur et au pH-mètre"),
      it("cours", "Échelle de pH de $0$ à $14$ : dominance des ions $H^+$ (acide) ou $HO^-$ (basique)")
    ]),
    sec("Dilution d'une solution", [
      it("experience", "Évolution du pH lors de l'ajout d'eau pure : le pH se rapproche de 7"),
      it("cours", "Règle de sécurité : verser toujours l'acide dans l'eau, jamais l'inverse")
    ])
  ]),
  ch("Chapitre 6 : Tests d'identification de quelques ions", [
    sec("Tests de précipitation", [
      it("experience", "Précipitation par la soude des ions $Cu^{2+}$ (bleu), $Fe^{2+}$ (vert), $Fe^{3+}$ (rouille), $Zn^{2+}$ (blanc)"),
      it("experience", "Précipitation des ions chlorure $Cl^-$ par le nitrate d'argent (précipité blanc qui noircit à la lumière)"),
      it("application", "Écrire les équations de précipitation ioniques")
    ])
  ]),
  ch("Chapitre 7 : Action des solutions acides et basiques sur les métaux", [
    sec("Action de l'acide chlorhydrique sur les métaux", [
      it("experience", "Réaction de l'acide chlorhydrique avec le fer, le zinc, l'aluminium et absence de réaction avec le cuivre"),
      it("cours", "Caractérisation du dégagement gazeux de dihydrogène $H_2$ par détonation à la flamme"),
      it("application", "Équations bilans ioniques réduites")
    ])
  ]),
  ch("Chapitre 8 : Mouvement et repos - La vitesse", [
    sec("Description du mouvement", [
      it("cours", "Relativité du mouvement : choix indispensable d'un solide de référence"),
      it("cours", "Notion de trajectoire (rectiligne, circulaire, curviligne)"),
      it("cours", "Mouvement de translation et mouvement de rotation d'un solide")
    ]),
    sec("La vitesse moyenne et sécurité routière", [
      it("definition", "Formule de la vitesse moyenne $v = \\frac{d}{t}$ et conversion $m/s \\leftrightarrow km/h$"),
      it("cours", "Types de mouvements : accéléré, uniforme, retardé"),
      it("application", "Distance d'arrêt $D_A = D_R + D_F$ et facteurs d'insécurité routière (alcool, fatigue, pluie)")
    ])
  ]),
  ch("Chapitre 9 : Actions mécaniques et notion de force", [
    sec("Modélisation d'une action mécanique", [
      it("cours", "Actions de contact (localisées ou réparties) et actions à distance"),
      it("cours", "Effets d'une action mécanique : effet dynamique (mouvement) ou statique (équilibre, déformation)"),
      it("definition", "Caractéristiques du vecteur force $\\vec{F}$ : point d'application, droite d'action, sens, intensité (Newton)")
    ])
  ]),
  ch("Chapitre 10 : Équilibre d'un solide soumis à deux forces", [
    sec("Conditions d'équilibre", [
      it("experience", "Étude expérimentale d'un corps léger soumis à deux dynamomètres"),
      it("loi", "Énoncé des conditions d'équilibre : même droite d'action et $\\vec{F}_1 + \\vec{F}_2 = \\vec{0}$ ($F_1 = F_2$)"),
      it("application", "Résolution de problèmes d'équilibre statique")
    ])
  ]),
  ch("Chapitre 11 : Poids et masse", [
    sec("Distinction poids et masse", [
      it("cours", "La masse $m$ : grandeur intrinsèque invariante mesurée avec une balance"),
      it("cours", "Le poids $\\vec{P}$ : force d'attraction gravitationnelle exercée par la Terre mesurée au dynamomètre"),
      it("loi", "Relation $P = m\\cdot g$ et variation de l'intensité de pesanteur $g$ selon le lieu et l'altitude")
    ])
  ]),
  ch("Chapitre 12 : La loi d'Ohm", [
    sec("Caractéristique d'un conducteur ohmique", [
      it("experience", "Tracer la courbe $U = f(I)$ pour un dipôle ohmique"),
      it("loi", "Loi d'Ohm : la tension est proportionnelle à l'intensité ($U = R\\cdot I$)"),
      it("application", "Calculer une résistance, une tension ou une intensité à l'aide de la loi d'Ohm")
    ])
  ]),
  ch("Chapitre 13 : La puissance électrique", [
    sec("Puissance nominale et énergie", [
      it("cours", "Signification des indications nominales portées sur les appareils ménagers"),
      it("definition", "Expression de la puissance électrique en courant continu $P = U\\cdot I$"),
      it("cours", "Puissance consommée par un appareil à effet Joule : $P = R\\cdot I^2$"),
      it("application", "Calcul de la puissance totale consommée dans une installation domestique")
    ])
  ]),
  ch("Chapitre 14 : L'énergie électrique", [
    sec("Consommation d'énergie électrique", [
      it("definition", "Relation entre énergie, puissance et durée : $E = P\\cdot t$"),
      it("cours", "Unités d'énergie : Joule ($J$) et Wattheure ($Wh$), équivalence $1\\text{ kWh} = 3{,}6\\times 10^6\\text{ J}$"),
      it("application", "Lecture du compteur électrique et calcul du coût de consommation")
    ])
  ])
];
