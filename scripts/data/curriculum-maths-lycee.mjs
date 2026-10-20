import { ch, sec, it } from '../curriculum-builder-helpers.mjs';

export const mathsTCT = [
  ch("Chapitre 1 : Notions d'arithmétique dans N", [
    sec("Multiples, diviseurs et nombres premiers", [
      it("cours", "Ensemble $\\mathbb{N}$, parité des entiers, multiples et diviseurs"),
      it("cours", "Nombres premiers et décomposition en facteurs premiers"),
      it("application", "Calcul du PGCD et PPCM par décomposition et algorithme d'Euclide")
    ])
  ]),
  ch("Chapitre 2 : Calcul vectoriel dans le plan", [
    sec("Vecteurs et opérations", [
      it("cours", "Égalité vectorielle, relation de Chasles, colinéarité de deux vecteurs"),
      it("definition", "Milieu d'un segment, centre de gravité d'un triangle"),
      it("application", "Démontrer l'alignement de trois points et le parallélisme de deux droites")
    ])
  ]),
  ch("Chapitre 3 : La projection dans le plan", [
    sec("Théorème de Thalès et projection", [
      it("cours", "Définition de la projection sur une droite selon une direction donnée"),
      it("loi", "Théorème de Thalès direct et réciproque"),
      it("cours", "Conservation du coefficient de colinéarité par projection")
    ])
  ]),
  ch("Chapitre 4 : Ensembles de nombres et calcul numérique", [
    sec("Ensembles et intervalles", [
      it("cours", "Inclusions $\\mathbb{N} \\subset \\mathbb{Z} \\subset \\mathbb{D} \\subset \\mathbb{Q} \\subset \\mathbb{R}$"),
      it("cours", "Intervalles de $\\mathbb{R}$, encadrements et valeur absolue $|x|$"),
      it("application", "Règles de puissances, racines carrées et identités remarquables")
    ])
  ]),
  ch("Chapitre 5 : La droite dans le plan", [
    sec("Repère et équations cartésiennes", [
      it("cours", "Coordonnées d'un point et d'un vecteur dans un repère orthonormé"),
      it("cours", "Vecteur directeur et équation cartésienne $ax+by+c=0$"),
      it("cours", "Coefficient directeur (pente) et équation réduite $y = mx+p$"),
      it("application", "Positions relatives de deux droites (parallélisme, sécantes, perpendicularité)")
    ])
  ]),
  ch("Chapitre 6 : Polynômes et factorisation", [
    sec("Degré et racines", [
      it("definition", "Définition d'un polynôme, monôme et degré"),
      it("loi", "Division euclidienne d'un polynôme par $x-a$ et schéma de Horner"),
      it("cours", "Racine d'un polynôme et factorisation")
    ])
  ]),
  ch("Chapitre 7 : Équations, inéquations et systèmes", [
    sec("Résolution algébrique", [
      it("cours", "Équations et inéquations du premier degré à une inconnue"),
      it("cours", "Trinôme du second degré $ax^2+bx+c$, discriminant $\\Delta$ et tableau de signes"),
      it("application", "Résolution de systèmes linéaires de deux équations à deux inconnues par déterminant de Cramer")
    ])
  ]),
  ch("Chapitre 8 : Trigonométrie dans le cercle unité", [
    sec("Angles orientés et lignes trigonométriques", [
      it("cours", "Le cercle trigonométrique, enroulement de la droite numérique et radian"),
      it("cours", "Définition de $\\cos(x), \\sin(x)$ et $\\tan(x)$"),
      it("loi", "Formules de symétrie : $\\cos(-x), \\sin(\\pi-x), \\cos(\\pi/2-x)$"),
      it("loi", "Identité fondamentale $\\cos^2(x)+\\sin^2(x)=1$"),
      it("application", "Résolution d'équations trigonométriques élémentaires $\\cos(x)=a, \\sin(x)=b$")
    ])
  ]),
  ch("Chapitre 9 : Généralités sur les fonctions numériques", [
    sec("Domaine de définition et variations", [
      it("definition", "Ensemble de définition $D_f$, image et antécédent"),
      it("cours", "Parité (fonction paire, fonction impaire) et symétries graphiques"),
      it("cours", "Sens de variation (croissance, décroissance, extremums locaux)"),
      it("cours", "Étude et représentation des fonctions de référence : $x\\mapsto ax^2$ et $x\\mapsto a/x$")
    ])
  ]),
  ch("Chapitre 10 : Statistiques", [
    sec("Séries statistiques à une variable", [
      it("cours", "Effectifs, fréquences et effectifs cumulés"),
      it("cours", "Paramètres de position : moyenne arithmétique $\\bar{x}$, médiane $Me$, mode"),
      it("cours", "Paramètres de dispersion : variance $V$, écart-type $\\sigma$, étendue")
    ])
  ])
];

export const maths1BAC_ECO = [
  ch("Chapitre 1 : Notions de logique et raisonnements", [
    sec("Connecteurs logiques et quantificateurs", [
      it("cours", "Propositions, négation, conjonction, disjonction, implication et équivalence"),
      it("cours", "Quantificateurs universel $\\forall$ et existentiel $\\exists$"),
      it("methode", "Méthodes de raisonnement : direct, par contraposée, par l'absurde, contre-exemple")
    ])
  ]),
  ch("Chapitre 2 : Équations, inéquations et systèmes linéaires", [
    sec("Outils algébriques pour l'économie", [
      it("cours", "Résolution des équations du second degré $ax^2+bx+c=0$"),
      it("cours", "Signe du trinôme et inéquations du second degré"),
      it("methode", "Systèmes linéaires $2\\times 2$ et $3\\times 3$ par la méthode du pivot de Gauss et de Cramer"),
      it("application", "Modélisation économique : équilibre offre-demande et allocation de budget")
    ])
  ]),
  ch("Chapitre 3 : Généralités sur les fonctions numériques", [
    sec("Analyse des fonctions économiques", [
      it("cours", "Domaine de définition, parité et monotonie"),
      it("cours", "Fonction de coût total, coût moyen, fonction de recette et de bénéfice"),
      it("application", "Recherche du seuil de rentabilité et du volume de production optimal")
    ])
  ]),
  ch("Chapitre 4 : Les suites numériques", [
    sec("Suites arithmétiques et géométriques", [
      it("definition", "Mode de génération : terme explicite $u_n=f(n)$ et récurrence $u_{n+1}=f(u_n)$"),
      it("cours", "Suites arithmétiques : raison $r$, terme général $u_n=u_0+n r$, somme des termes"),
      it("cours", "Suites géométriques : raison $q$, terme général $u_n=u_0 q^n$, somme des termes"),
      it("application", "Mathématiques financières : intérêts simples, intérêts composés, amortissement d'un emprunt")
    ])
  ]),
  ch("Chapitre 5 : Dénombrement et combinatoire", [
    sec("Principes de comptage", [
      it("cours", "Principe additif et multiplicatif, cardinal d'un ensemble fini"),
      it("loi", "Arrangements avec répétition ($n^p$), sans répétition ($A_n^p$), permutations ($n!$)"),
      it("loi", "Combinaisons ($C_n^p$), triangle de Pascal et formule du binôme de Newton"),
      it("application", "Applications aux tirages avec ou sans remise et tirages simultanés")
    ])
  ]),
  ch("Chapitre 6 : Limites de fonctions numériques", [
    sec("Calcul de limites et asymptotes", [
      it("cours", "Limites usuelles en un point et à l'infini"),
      it("cours", "Opérations sur les limites et levée des quatre formes indéterminées ($+\\infty-\\infty, 0\\times\\infty, \\frac{0}{0}, \\frac{\\infty}{\\infty}$)"),
      it("cours", "Interprétation graphique : asymptotes horizontales, verticales et obliques")
    ])
  ]),
  ch("Chapitre 7 : Dérivation et optimisation", [
    sec("Nombre dérivé et fonction dérivée", [
      it("definition", "Taux de variation et nombre dérivé $f'(x_0)$, équation de la tangente"),
      it("cours", "Dérivées des fonctions usuelles et opérations ($u+v, u\\cdot v, u/v, u^n$)"),
      it("loi", "Lien entre le signe de la dérivée et le sens de variation de la fonction"),
      it("application", "Notion de coût marginal et élasticité de la demande")
    ])
  ]),
  ch("Chapitre 8 : La fonction logarithme décimal", [
    sec("Propriétés algébriques de log", [
      it("definition", "Définition de $\\log_{10}(x) = \\frac{\\ln(x)}{\\ln(10)}$"),
      it("cours", "Propriétés : $\\log(a\\cdot b) = \\log(a)+\\log(b)$ et $\\log(10^n) = n$"),
      it("application", "Résolution des équations exponentielles du type $q^n \\ge A$ (calcul de durée d'épargne)")
    ])
  ])
];

export const maths1BAC_LSH = [
  ch("Chapitre 1 : Calcul numérique, pourcentages et proportions", [
    sec("Calcul élémentaire et applications réelles", [
      it("cours", "Fractions, puissances de 10, racines carrées et identités remarquables"),
      it("cours", "Calculs de pourcentages, taux d'évolution, augmentations et réductions"),
      it("application", "Proportions, coefficients multiplicateurs et indices de prix")
    ])
  ]),
  ch("Chapitre 2 : Équations et inéquations du premier et second degré", [
    sec("Résolution de problèmes concrets", [
      it("cours", "Résolution des équations $ax+b=0$ et inéquations du premier degré"),
      it("cours", "Équations du second degré $ax^2+bx+c=0$ à l'aide du discriminant $\\Delta$"),
      it("application", "Résolution de systèmes d'équations à deux inconnues et applications pratiques")
    ])
  ]),
  ch("Chapitre 3 : Les suites numériques", [
    sec("Progressions arithmétiques et géométriques simples", [
      it("definition", "Notion de suite numérique et calcul des premiers termes"),
      it("cours", "Suites arithmétiques : formule de récurrence $u_{n+1}=u_n+r$ et formule explicite"),
      it("cours", "Suites géométriques : formule $u_{n+1}=q\\cdot u_n$ et applications démographiques")
    ])
  ]),
  ch("Chapitre 4 : Statistiques et représentations graphiques", [
    sec("Traitement de données statistiques", [
      it("cours", "Tableaux d'effectifs, fréquences et pourcentages"),
      it("methode", "Diagrammes en bâtons, histogrammes et diagrammes circulaires"),
      it("cours", "Calcul de la moyenne, médiane et étendue d'une série statistique")
    ])
  ]),
  ch("Chapitre 5 : Dénombrement et probabilités élémentaires", [
    sec("Hasard et chances de réalisation", [
      it("cours", "Vocabulaire des événements : univers, événement certain, impossible, contraire"),
      it("methode", "Utilisation des arbres de probabilités pour dénombrer les issues"),
      it("loi", "Équiprobabilité : calcul de $P(A) = \\frac{\\text{Cas favorables}}{\\text{Cas possibles}}$")
    ])
  ]),
  ch("Chapitre 6 : Fonctions usuelles et lectures graphiques", [
    sec("Courbes et interprétations", [
      it("cours", "Représentation graphique d'une fonction affine $f(x)=ax+b$"),
      it("cours", "Lecture graphique d'images, d'antécédents et de solutions d'équations $f(x)=k$"),
      it("cours", "Sens de variation et tableau de variations d'une fonction")
    ])
  ])
];

export const maths2BAC_ECO = [
  ch("Chapitre 1 : Continuité et limites", [
    sec("Continuité sur un intervalle", [
      it("cours", "Continuité en un point et sur un intervalle, continuité des fonctions usuelles"),
      it("loi", "Théorème des valeurs intermédiaires (TVI) et corollaire avec stricte monotonie"),
      it("cours", "Image d'un intervalle par une fonction continue"),
      it("cours", "Limites usuelles et branches infinies (asymptotes et directions asymptotiques)")
    ])
  ]),
  ch("Chapitre 2 : Dérivation et étude de fonctions", [
    sec("Dérivabilité et optimisation économique", [
      it("cours", "Dérivabilité en un point et sur un intervalle, dérivée des fonctions composées"),
      it("cours", "Sens de variation, extremums relatifs et tableau de variations"),
      it("cours", "Convexité d'une courbe, point d'inflexion et signe de la dérivée seconde $f''$"),
      it("application", "Applications économiques : coût marginal, maximisation du profit, élasticité-prix")
    ])
  ]),
  ch("Chapitre 3 : Les suites numériques et convergence", [
    sec("Limites de suites", [
      it("cours", "Suites majorées, minorées, bornées et suites monotones"),
      it("loi", "Théorème de convergence monotone : toute suite croissante et majorée converge"),
      it("cours", "Limites des suites géométriques selon la valeur de la raison $q$"),
      it("application", "Suites récurrentes $u_{n+1}=f(u_n)$ et équation $f(l)=l$")
    ])
  ]),
  ch("Chapitre 4 : Les fonctions logarithmes", [
    sec("Fonction logarithme népérien et décimal", [
      it("definition", "Définition de $\\ln(x)$ comme primitive de $1/x$ sur $]0, +\\infty[$ s'annulant en $1$"),
      it("cours", "Propriétés algébriques fondamentales : $\\ln(ab)=\\ln(a)+\\ln(b), \\ln(a/b)=\\ln(a)-\\ln(b)$"),
      it("cours", "Limites de référence de $\\ln(x)$ en $0^+$ et en $+\\infty$, croissances comparées"),
      it("cours", "Étude complète de fonctions comportant $\\ln(x)$")
    ])
  ]),
  ch("Chapitre 5 : Les fonctions exponentielles", [
    sec("Fonction exponentielle népérienne", [
      it("definition", "Définition de $\\exp(x) = e^x$ comme bijection réciproque de $\\ln(x)$"),
      it("cours", "Propriétés algébriques : $e^{a+b}=e^a\\cdot e^b, e^{-a}=1/e^a, (e^a)^b=e^{ab}$"),
      it("cours", "Limites usuelles et croissances comparées en $\\pm\\infty$"),
      it("application", "Modèles de croissance exponentielle et amortissement de capital")
    ])
  ]),
  ch("Chapitre 6 : Calcul intégral et calcul d'aires", [
    sec("Primitives et intégration", [
      it("definition", "Notion de primitive d'une fonction continue sur un intervalle"),
      it("cours", "Tableau des primitives usuelles et intégration par parties : $\\int u v' = [uv] - \\int u' v$"),
      it("cours", "Interprétation géométrique de $\\int_a^b f(x)dx$ comme aire sous la courbe"),
      it("application", "Calcul du surplus du consommateur et du producteur en économie")
    ])
  ]),
  ch("Chapitre 7 : Probabilités et variables aléatoires", [
    sec("Calcul des probabilités", [
      it("cours", "Probabilité conditionnelle $P(B|A) = \\frac{P(A\\cap B)}{P(A)}$ et indépendance d'événements"),
      it("loi", "Formule des probabilités totales"),
      it("definition", "Variable aléatoire discrète $X$, loi de probabilité, espérance $E(X)$ et variance $V(X)$"),
      it("loi", "Schéma de Bernoulli et loi binomiale $\\mathcal{B}(n, p)$ : formule $P(X=k) = C_n^k p^k (1-p)^{n-k}$")
    ])
  ])
];

export const maths2BAC_LETTRES = [
  ch("Chapitre 1 : Les suites numériques", [
    sec("Suites arithmétiques et géométriques", [
      it("cours", "Rappels sur le calcul des termes d'une suite"),
      it("cours", "Suites arithmétiques : formule $u_n = u_0 + n r$ et somme $S = \\frac{n+1}{2}(u_0+u_n)$"),
      it("cours", "Suites géométriques : formule $u_n = u_0 q^n$ et somme"),
      it("application", "Applications pratiques (évolution de populations, budget personnel)")
    ])
  ]),
  ch("Chapitre 2 : Limites et dérivées de fonctions simples", [
    sec("Dérivée et variations", [
      it("cours", "Calculs de limites sans indétermination pour les polynômes"),
      it("cours", "Dérivée des fonctions usuelles : $x\\mapsto ax+b, x\\mapsto ax^2$"),
      it("loi", "Signe de la dérivée et tableau de variations d'une fonction du second degré")
    ])
  ]),
  ch("Chapitre 3 : Étude et tracé de courbes de fonctions polynômes", [
    sec("Étude de fonctions du second et troisième degré", [
      it("methode", "Démarche d'étude complète : ensemble de définition, limites, dérivée, variations"),
      it("cours", "Extremums locaux (maximum, minimum)"),
      it("cours", "Tracé soigné de la courbe représentative dans un repère")
    ])
  ]),
  ch("Chapitre 4 : Dénombrement et probabilités", [
    sec("Événements et calcul de chances", [
      it("cours", "Dénombrement par tableau à double entrée ou arbre de choix"),
      it("cours", "Calcul de probabilités dans des situations d'équiprobabilité simples"),
      it("cours", "Probabilité de l'événement contraire $P(\\bar{A}) = 1 - P(A)$")
    ])
  ]),
  ch("Chapitre 5 : Statistiques descriptives", [
    sec("Indicateurs statistiques", [
      it("cours", "Tableaux de fréquences, pourcentages et effectifs cumulés"),
      it("cours", "Paramètres de position : moyenne et médiane"),
      it("cours", "Représentations graphiques adaptées et interprétation critique d'informations chiffrées")
    ])
  ])
];
