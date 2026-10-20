import { ch, sec, it } from '../curriculum-builder-helpers.mjs';

export const physiqueTCS = [
  ch("Chapitre 1 : La gravitation universelle", [
    sec("L'échelle des longueurs dans l'univers", [
      it("cours", "Ordres de grandeur et notation scientifique, de l'atome aux galaxies"),
      it("loi", "Loi de la gravitation universelle de Newton : $F = G\\frac{m_1 m_2}{d^2}$"),
      it("cours", "Poids d'un corps et champ de pesanteur terrestre $P = m\\cdot g$, relation avec l'altitude")
    ])
  ]),
  ch("Chapitre 2 : Les actions mécaniques et modélisation par des forces", [
    sec("Typologie des forces", [
      it("cours", "Actions de contact (localisées, réparties) et forces à distance"),
      it("cours", "Vecteur force : caractéristiques, composante normale et tangentielle (frottement)")
    ])
  ]),
  ch("Chapitre 3 : Équilibre d'un solide soumis à deux forces", [
    sec("Conditions d'équilibre statique", [
      it("loi", "Condition vectorielle : $\\vec{F}_1 + \\vec{F}_2 = \\vec{0}$"),
      it("application", "Tension d'un ressort : loi de Hooke $T = k\\cdot |\\Delta l|$"),
      it("application", "Poussée d'Archimède : définition, expression et conditions de flottaison")
    ])
  ]),
  ch("Chapitre 4 : Équilibre d'un solide soumis à trois forces non parallèles", [
    sec("Résolution graphique et analytique", [
      it("loi", "Conditions d'équilibre : forces coplanaires, concourantes et $\\sum \\vec{F} = \\vec{0}$"),
      it("methode", "Méthode géométrique du polygone fermé des forces"),
      it("methode", "Méthode analytique par projection sur un repère orthonormé $(O, \\vec{i}, \\vec{j})$")
    ])
  ]),
  ch("Chapitre 5 : Équilibre d'un solide en rotation autour d'un axe fixe", [
    sec("Le moment d'une force", [
      it("definition", "Moment d'une force par rapport à un axe $\\Delta$ : $\\mathcal{M}_\\Delta(\\vec{F}) = \\pm F\\cdot d$"),
      it("loi", "Théorème des moments : $\\sum \\mathcal{M}_\\Delta(\\vec{F}) = 0$"),
      it("cours", "Notion de couple de forces et moment d'un couple")
    ])
  ]),
  ch("Chapitre 6 : Le mouvement et le principe d'inertie", [
    sec("Cinématique et première loi de Newton", [
      it("cours", "Relativité du mouvement, repères d'espace et de temps"),
      it("cours", "Vitesse instantanée et vecteur vitesse"),
      it("loi", "Énoncé du principe d'inertie (première loi de Newton)"),
      it("cours", "Définition du centre d'inertie $G$ et relation barycentrique")
    ])
  ]),
  ch("Chapitre 7 : Le courant électrique continu", [
    sec("Nature et lois du courant", [
      it("cours", "Porteurs de charge : électrons libres dans les métaux, ions en solution"),
      it("definition", "Débit de charge et intensité $I = \\frac{Q}{\\Delta t}$"),
      it("loi", "Loi des nœuds dans un circuit avec dérivations")
    ])
  ]),
  ch("Chapitre 8 : La tension électrique", [
    sec("Mesures et propriétés de la tension", [
      it("definition", "Différence de potentiel $U_{AB} = V_A - V_B$"),
      it("loi", "Loi d'additivité des tensions et loi des mailles de Kirchhoff"),
      it("methode", "Utilisation de l'oscilloscope : réglages de sensibilité verticale et balayage horizontal")
    ])
  ]),
  ch("Chapitre 9 : Les dipôles passifs et loi d'Ohm", [
    sec("Conducteurs ohmiques et association", [
      it("loi", "Loi d'Ohm $U = R\\cdot I$, conductance $G = 1/R$"),
      it("cours", "Association de conducteurs ohmiques en série ($R_{eq} = \\sum R_i$) et en dérivation ($\\frac{1}{R_{eq}} = \\sum \\frac{1}{R_i}$)"),
      it("application", "Diviseur de tension et potentiomètre")
    ])
  ]),
  ch("Chapitre 10 : Les espèces chimiques et techniques d'extraction", [
    sec("Extraction, séparation et identification", [
      it("cours", "Espèces chimiques naturelles et synthétiques"),
      it("methode", "Techniques d'extraction : macération, décoction, hydrodistillation et extraction par solvant"),
      it("methode", "Chromatographie sur couche mince (CCM) et calcul du rapport frontal $R_f$")
    ])
  ]),
  ch("Chapitre 11 : Synthèse des espèces chimiques", [
    sec("Réalisation et contrôle", [
      it("cours", "Objectifs et importance de la chimie de synthèse industrielle"),
      it("experience", "Montage à reflux pour accélérer la réaction sans perte de matière"),
      it("methode", "Filtration sous vide sur Büchner et recristallisation")
    ])
  ]),
  ch("Chapitre 12 : Le modèle de l'atome et la classification périodique", [
    sec("Structure atomique et cortège électronique", [
      it("cours", "Constitution : nucléons (protons, neutrons) et électrons, nombre $Z$ et $A$"),
      it("cours", "Répartition électronique en couches $K, L, M$ et électrons de valence"),
      it("loi", "Classification périodique des éléments et règles de stabilité (duet et octet)")
    ])
  ]),
  ch("Chapitre 13 : La mole et les grandeurs molaires", [
    sec("La quantité de matière", [
      it("definition", "Constante d'Avogadro $N_A$ et définition de la mole"),
      it("cours", "Masse molaire atomique et moléculaire $M$, relation $n = \\frac{m}{M}$"),
      it("cours", "Volume molaire d'un gaz $V_m$ à pression et température données, relation $n = \\frac{V}{V_m}$")
    ])
  ]),
  ch("Chapitre 14 : Les solutions aqueuses et concentration", [
    sec("Préparation et dosage de solutions", [
      it("definition", "Concentration molaire $C = \\frac{n}{V}$ et concentration massique $C_m = \\frac{m}{V}$"),
      it("methode", "Protocole expérimental de dissolution d'un soluté solide"),
      it("methode", "Protocole expérimental de dilution d'une solution mère ($C_1 V_1 = C_2 V_2$)")
    ])
  ])
];

export const physique1BAC_SE = [
  ch("Chapitre 1 : Rotation d'un solide indéformable autour d'un axe fixe", [
    sec("Cinématique de la rotation", [
      it("cours", "Abscisse angulaire $\\theta(t)$, vitesse angulaire $\\omega = \\frac{d\\theta}{dt}$"),
      it("cours", "Mouvement de rotation uniforme : période $T$, fréquence $N$ et équation horaire $\\theta(t) = \\omega t + \\theta_0$"),
      it("application", "Relation entre vitesse linéaire et vitesse angulaire $v = R\\cdot\\omega$")
    ])
  ]),
  ch("Chapitre 2 : Travail et puissance d'une force", [
    sec("Travail mécanique", [
      it("definition", "Travail d'une force constante en translation : $W_{AB}(\\vec{F}) = \\vec{F}\\cdot\\vec{AB} = F\\cdot AB\\cdot\\cos(\\alpha)$"),
      it("cours", "Travail moteur, résistant et nul"),
      it("cours", "Travail du poids : $W_{AB}(\\vec{P}) = \\pm m g h$ (indépendance du chemin suivi)"),
      it("cours", "Travail d'une force de moment constant en rotation : $W = \\mathcal{M}_\\Delta(\\vec{F})\\cdot\\Delta\\theta$"),
      it("cours", "Puissance moyenne et instantanée : $\\mathcal{P} = \\vec{F}\\cdot\\vec{v} = \\mathcal{M}_\\Delta\\cdot\\omega$")
    ])
  ]),
  ch("Chapitre 3 : Travail et énergie cinétique", [
    sec("Théorème de l'énergie cinétique", [
      it("definition", "Énergie cinétique de translation $E_c = \\frac{1}{2}m v^2$ et de rotation $E_c = \\frac{1}{2}J_\\Delta\\omega^2$"),
      it("loi", "Théorème de l'énergie cinétique : $\\Delta E_c = \\sum W(\\vec{F}_{ext})$"),
      it("application", "Application au freinage, chute libre et plans inclinés")
    ])
  ]),
  ch("Chapitre 4 : Travail et énergie potentielle de pesanteur - Énergie mécanique", [
    sec("Énergie potentielle et énergie mécanique", [
      it("definition", "Expression de l'énergie potentielle de pesanteur $E_{pp} = m g z + C$"),
      it("definition", "Définition de l'énergie mécanique $E_m = E_c + E_{pp}$"),
      it("loi", "Conservation de l'énergie mécanique en l'absence de frottements ($\\Delta E_m = 0$)"),
      it("cours", "Non-conservation en présence de frottements : $\\Delta E_m = W(\\vec{f})$")
    ])
  ]),
  ch("Chapitre 5 : Énergie thermique et transferts thermiques", [
    sec("Chaleur et calorimétrie", [
      it("cours", "Modes de transfert thermique : conduction, convection et rayonnement"),
      it("definition", "Capacité thermique massique $c$ et quantité de chaleur $Q = m\\cdot c\\cdot\\Delta T$"),
      it("application", "Bilan thermique d'un calorimètre à l'équilibre")
    ])
  ]),
  ch("Chapitre 6 : Le champ électrostatique", [
    sec("Forces et champs électriques", [
      it("loi", "Loi de Coulomb pour deux charges ponctuelles"),
      it("definition", "Vecteur champ électrostatique $\\vec{E}$, force $\\vec{F} = q\\vec{E}$"),
      it("cours", "Champ uniforme entre deux armatures planes parallèles ($E = U/d$)")
    ])
  ]),
  ch("Chapitre 7 : Énergie potentielle électrostatique", [
    sec("Travail de la force électrostatique", [
      it("cours", "Travail de la force électrostatique $W_{AB}(\\vec{F}) = q(V_A - V_B)$"),
      it("definition", "Énergie potentielle électrostatique $E_{pe} = q V$"),
      it("loi", "Conservation de l'énergie mécanique d'une particule chargée")
    ])
  ]),
  ch("Chapitre 8 : Transfert d'énergie dans un circuit électrique", [
    sec("Bilan énergétique d'un circuit", [
      it("cours", "Effet Joule : $W_J = R\\cdot I^2\\cdot\\Delta t$"),
      it("cours", "Générateur réel : force électromotrice $E$, résistance interne $r$, tension $U_{PN} = E - r I$"),
      it("cours", "Récepteur actif : force contre-électromotrice $E'$, tension $U_{AB} = E' + r' I$"),
      it("loi", "Loi de Pouillet et rendement d'un circuit électrique")
    ])
  ]),
  ch("Chapitre 9 : Le champ magnétique", [
    sec("Propriétés du champ magnétique", [
      it("cours", "Sources magnétiques : aimants naturels, courants électriques"),
      it("definition", "Vecteur champ magnétique $\\vec{B}$, unité Tesla ($T$)"),
      it("cours", "Lignes de champ créées par un fil rectiligne, une bobine plate et un solénoïde ($B = \\mu_0\\frac{N}{L}I$)")
    ])
  ]),
  ch("Chapitre 10 : La force de Laplace", [
    sec("Action d'un champ magnétique sur un courant", [
      it("loi", "Loi de Laplace : force $\\vec{F} = I\\vec{L}\\wedge\\vec{B}$"),
      it("methode", "Règle de la main droite ou des trois doigts pour déterminer le sens"),
      it("application", "Applications industrielles : moteur à courant continu, haut-parleur électrodynamique")
    ])
  ]),
  ch("Chapitre 11 : Optique géométrique : les lentilles convergentes", [
    sec("Formation d'images et grandissement", [
      it("loi", "Formule de conjugaison de Descartes : $\\frac{1}{\\overline{OA'}} - \\frac{1}{\\overline{OA}} = \\frac{1}{f'}$"),
      it("loi", "Formule de grandissement : $\\gamma = \\frac{\\overline{A'B'}}{\\overline{AB}} = \\frac{\\overline{OA'}}{\\overline{OA}}$"),
      it("application", "Étude du modèle du microscope optique")
    ])
  ]),
  ch("Chapitre 12 : La mesure en chimie et quantité de matière", [
    sec("Approche quantitative des réactions", [
      it("cours", "Incertitudes de mesure et précision de la verrerie"),
      it("cours", "Tableau d'avancement d'une réaction chimique, avancement maximal $x_{max}$ et réactif limitant")
    ])
  ]),
  ch("Chapitre 13 : Solutions électrolytiques et conductimétrie", [
    sec("Conductance et concentration", [
      it("definition", "Conductance $G = I/U$ et conductivité d'une solution $\\sigma$"),
      it("loi", "Loi de Kohlrausch : $\\sigma = \\sum \\lambda_i [X_i]$"),
      it("application", "Dosage par étalonnage conductimétrique")
    ])
  ]),
  ch("Chapitre 14 : Réactions acido-basiques et dosages", [
    sec("Théorie de Brönsted et titrage", [
      it("definition", "Couple acide/base selon Brönsted, échange de protons $H^+$"),
      it("methode", "Titrage acido-basique en présence d'un indicateur coloré, repérage de l'équivalence")
    ])
  ]),
  ch("Chapitre 15 : Réactions d'oxydo-réduction", [
    sec("Transfert d'électrons", [
      it("definition", "Couple oxydant/réducteur ($Ox/Red$) et demi-équations électroniques"),
      it("methode", "Établir une équation bilan redox globale"),
      it("application", "Dosage d'oxydo-réduction par le permanganate de potassium")
    ])
  ]),
  ch("Chapitre 16 : Chimie organique : squelettes carbonés et fonctions", [
    sec("Structure des molécules organiques", [
      it("cours", "Tétravalence du carbone, alcanes, alcènes et isomérie"),
      it("cours", "Familles fonctionnelles : alcools, aldéhydes, cétones, acides carboxyliques")
    ])
  ])
];

export const physique2BAC_SVT = [
  ch("Chapitre 1 : Ondes mécaniques progressives", [
    sec("Propagation d'une perturbation", [
      it("definition", "Définition d'une onde mécanique et de la célérité $v = \\frac{d}{\\Delta t}$"),
      it("cours", "Ondes transversales et ondes longitudinales"),
      it("cours", "Retard temporel $\\tau = \\frac{SM}{v}$, relation $y_M(t) = y_S(t-\\tau)$")
    ])
  ]),
  ch("Chapitre 2 : Ondes mécaniques progressives périodiques", [
    sec("Périodicité et diffraction", [
      it("definition", "Double périodicité temporelle ($T$) et spatiale (longueur d'onde $\\lambda = v\\cdot T$)"),
      it("experience", "Mise en évidence du phénomène de diffraction d'une onde mécanique à la cuve à ondes"),
      it("cours", "Notion de milieu dispersif : dépendance de la célérité avec la fréquence")
    ])
  ]),
  ch("Chapitre 3 : Propagation d'une onde lumineuse", [
    sec("Nature ondulatoire de la lumière", [
      it("experience", "Diffraction d'un faisceau laser par une fente de largeur $a$"),
      it("loi", "Écart angulaire de diffraction $\\theta = \\frac{\\lambda}{a} = \\frac{L}{2D}$"),
      it("cours", "Dispersion de la lumière par un prisme : indice de réfraction $n = c/v$")
    ])
  ]),
  ch("Chapitre 4 : Décroissance radioactive", [
    sec("Radioactivité naturelle et décroissance", [
      it("cours", "Stabilité des noyaux et diagramme de Segrè $(N, Z)$"),
      it("cours", "Émissions radioactives $\\alpha, \\beta^-, \\beta^+, \\gamma$ et lois de Soddy"),
      it("loi", "Loi de décroissance radioactive $N(t) = N_0 e^{-\\lambda t}$"),
      it("definition", "Demi-vie radioactive $t_{1/2} = \\frac{\\ln(2)}{\\lambda}$ et activité $A(t) = -\\frac{dN}{dt} = \\lambda N$")
    ])
  ]),
  ch("Chapitre 5 : Noyaux, masse et énergie", [
    sec("Équivalence masse-énergie", [
      it("loi", "Relation d'Einstein : $E = m\\cdot c^2$"),
      it("definition", "Défaut de masse $\\Delta m$ et énergie de liaison du noyau $E_l = \\Delta m\\cdot c^2$"),
      it("cours", "Énergie de liaison par nucléon $\\frac{E_l}{A}$ et courbe d'Aston"),
      it("cours", "Fission et fusion nucléaires, bilan énergétique $\\Delta E = \\Delta m\\cdot c^2$")
    ])
  ]),
  ch("Chapitre 6 : Le dipôle RC", [
    sec("Réponse d'un dipôle RC à un échelon de tension", [
      it("definition", "Relation charge-tension d'un condensateur : $q = C\\cdot u_C$ et courant $i = \\frac{dq}{dt}$"),
      it("loi", "Équation différentielle de charge et décharge : $u_C + RC\\frac{du_C}{dt} = E$"),
      it("methode", "Solution de l'équation différentielle et constante de temps $\\tau = RC$"),
      it("cours", "Énergie emmagasinée dans un condensateur : $\\mathcal{E}_e = \\frac{1}{2}C u_C^2$")
    ])
  ]),
  ch("Chapitre 7 : Le dipôle RL", [
    sec("Comportement d'une bobine", [
      it("definition", "Tension aux bornes d'une bobine : $u_L = L\\frac{di}{dt} + r i$"),
      it("loi", "Équation différentielle d'établissement du courant : $L\\frac{di}{dt} + (R+r)i = E$"),
      it("methode", "Constante de temps $\\tau = \\frac{L}{R+r}$"),
      it("cours", "Énergie magnétique emmagasinée : $\\mathcal{E}_m = \\frac{1}{2}L i^2$")
    ])
  ]),
  ch("Chapitre 8 : Oscillations libres dans un circuit RLC série", [
    sec("Circuit oscillant", [
      it("loi", "Équation différentielle du circuit $RLC$ : $\\frac{d^2 q}{dt^2} + \\frac{R_t}{L}\\frac{dq}{dt} + \\frac{1}{LC}q = 0$"),
      it("cours", "Régimes pseudo-périodique, apériodique et critique"),
      it("cours", "Période propre du circuit idéal $LC$ : $T_0 = 2\\pi\\sqrt{LC}$"),
      it("cours", "Amortissement et échange d'énergie électrostatique et magnétique")
    ])
  ]),
  ch("Chapitre 9 : Les lois de Newton", [
    sec("Dynamique du point matériel", [
      it("cours", "Vecteur vitesse et vecteur accélération dans le repère de Frenet et cartésien"),
      it("loi", "Deuxième loi de Newton : $\\sum \\vec{F}_{ext} = m\\cdot\\vec{a}_G$ dans un référentiel galiléen"),
      it("application", "Troisième loi de Newton (principe des actions réciproques)")
    ])
  ]),
  ch("Chapitre 10 : Chute libre verticale d'un solide", [
    sec("Mouvement sous champ de pesanteur", [
      it("cours", "Chute libre sans frottement : équations horaires et trajectoire"),
      it("cours", "Chute avec frottement fluide : équation différentielle $m\\frac{dv}{dt} = mg - kv^n$ et vitesse limite $v_{lim}$")
    ])
  ]),
  ch("Chapitre 11 : Mouvements plans : projectiles", [
    sec("Mouvement dans un champ de pesanteur uniforme", [
      it("methode", "Établir les équations horaires $x(t)$ et $y(t)$ à partir des conditions initiales"),
      it("loi", "Équation cartésienne de la trajectoire parabolique"),
      it("application", "Calcul de la flèche $H$ et de la portée $X_P$")
    ])
  ]),
  ch("Chapitre 12 : Transformations lentes et rapides", [
    sec("Cinétique chimique", [
      it("cours", "Facteurs cinétiques : température, concentration des réactifs, catalyseur"),
      it("methode", "Techniques de suivi temporel : spectrophotométrie, conductimétrie, pH-métrie"),
      it("definition", "Vitesse volumique de réaction $v = \\frac{1}{V}\\frac{dx}{dt}$ et temps de demi-réaction $t_{1/2}$")
    ])
  ]),
  ch("Chapitre 13 : Transformations non totales et équilibre chimique", [
    sec("État d'équilibre d'un système", [
      it("definition", "Taux d'avancement final $\\tau = \\frac{x_f}{x_{max}}$"),
      it("definition", "Quotient de réaction $Q_r$ et constante d'équilibre $K$"),
      it("loi", "Critère d'évolution spontanée : comparaison de $Q_{r,i}$ et $K$")
    ])
  ]),
  ch("Chapitre 14 : Réactions acido-basiques en solution aqueuse", [
    sec("Constantes d'acidité et pH", [
      it("definition", "Autoprotolyse de l'eau et produit ionique $K_e = [H_3O^+][OH^-] = 10^{-14}$"),
      it("definition", "Constante d'acidité $K_A = \\frac{[H_3O^+][A^-]}{[HA]}$ et relation $pH = pK_A + \\log\\frac{[A^-]}{[HA]}$"),
      it("cours", "Diagrammes de prédominance et zone de virage des indicateurs colorés")
    ])
  ]),
  ch("Chapitre 15 : Piles électrochimiques et production d'énergie", [
    sec("Piles et énergie chimique", [
      it("cours", "Constitution d'une pile : demi-piles, pont salin, électrodes (anode, cathode)"),
      it("loi", "Quantité d'électricité débitée : $Q = I\\cdot\\Delta t = n(e^-)\\cdot F$"),
      it("application", "Bilan de masse aux électrodes lors du fonctionnement d'une pile")
    ])
  ]),
  ch("Chapitre 16 : Réactions d'estérification et d'hydrolyse", [
    sec("Chimie organique et équilibre", [
      it("cours", "Réaction entre un acide carboxylique et un alcool : formation d'un ester et d'eau"),
      it("cours", "Caractéristiques : réaction lente, limitée et athermique"),
      it("cours", "Facteurs influençant le rendement : excès de réactif ou élimination d'un produit")
    ])
  ])
];

export const physique2BAC_SMA = [
  ...physique2BAC_SVT,
  ch("Chapitre 17 : Ondes électromagnétiques et modulation d'amplitude (Spécifique SM)", [
    sec("Transmission d'informations", [
      it("cours", "Principe de la modulation d'amplitude : signal modulant et onde porteuse"),
      it("loi", "Expression du signal modulé $s(t) = [A + S_m\\cos(2\\pi f t)]\\cos(2\\pi F t)$"),
      it("definition", "Taux de modulation $m = \\frac{S_m}{A}$ et condition de non-surmodulation ($m < 1$)"),
      it("methode", "Démodulation d'amplitude : détecteur d'enveloppe et filtre passe-bas")
    ])
  ]),
  ch("Chapitre 18 : Oscillations électriques forcées en régime sinusoïdal (Spécifique SM)", [
    sec("Résonance électrique", [
      it("cours", "Dipôle RLC excité par une tension sinusoïdale de fréquence réglable"),
      it("definition", "Impédance du circuit $Z = \\sqrt{R^2 + (L\\omega - \\frac{1}{C\\omega})^2}$"),
      it("loi", "Phénomène de résonance d'intensité : fréquence de résonance $f_0$, bande passante et facteur de qualité $Q$")
    ])
  ]),
  ch("Chapitre 19 : Mouvement des satellites et des planètes (Spécifique SM)", [
    sec("Lois de Kepler et mécanique céleste", [
      it("loi", "Les trois lois de Kepler du mouvement planétaire"),
      it("application", "Mouvement circulaire uniforme d'un satellite artificiel : vitesse $v = \\sqrt{\\frac{GM}{r}}$ et période $T = 2\\pi\\sqrt{\\frac{r^3}{GM}}$"),
      it("cours", "Satellite géostationnaire et conditions d'orbite")
    ])
  ]),
  ch("Chapitre 20 : Rotation d'un solide autour d'un axe fixe - Moment cinétique (Spécifique SM)", [
    sec("Dynamique de la rotation", [
      it("definition", "Moment cinétique d'un solide $L_\\Delta = J_\\Delta\\cdot\\omega$"),
      it("loi", "Deuxième loi de Newton en rotation : $\\sum \\mathcal{M}_\\Delta(\\vec{F}) = J_\\Delta\\cdot\\frac{d\\omega}{dt}$"),
      it("loi", "Conservation du moment cinétique d'un système isolé")
    ])
  ]),
  ch("Chapitre 21 : Systèmes mécaniques oscillants (Spécifique SM)", [
    sec("Pendules et oscillations", [
      it("cours", "Le pendule élastique : équation différentielle, période propre $T_0 = 2\\pi\\sqrt{\\frac{m}{k}}$"),
      it("cours", "Le pendule de torsion : constante de torsion $C$, période $T_0 = 2\\pi\\sqrt{\\frac{J_\\Delta}{C}}$"),
      it("cours", "Le pendule pesant et pendule simple : étude dynamique et énergétique")
    ])
  ])
];
