import { ch, sec, it } from '../curriculum-builder-helpers.mjs';

export const mathsCpge1stYear = [
  ch("Chapitre 1 : Nombres complexes et trigonométrie", [
    sec("Algèbre des nombres complexes", [
      it("cours", "Forme algébrique, conjugué, module et inégalité triangulaire"),
      it("cours", "Forme trigonométrique et exponentielle, formule d'Euler et de Moivre"),
      it("cours", "Racines n-ièmes de l'unité et d'un nombre complexe quelconque"),
      it("application", "Linéarisation et factorisation de polynômes trigonométriques")
    ])
  ]),
  ch("Chapitre 2 : Raisonnement, ensembles et applications", [
    sec("Fondements logiques", [
      it("cours", "Logique formelle, quantificateurs, implication et négation"),
      it("cours", "Ensembles, opérations (union, intersection, produit cartésien, complémentaire)"),
      it("cours", "Injections, surjections, bijections et composition d'applications"),
      it("methode", "Principe de récurrence simple, double et forte")
    ])
  ]),
  ch("Chapitre 3 : Polynômes et fractions rationnelles", [
    sec("Arithmétique des polynômes", [
      it("cours", "Anneau $\\mathbb{K}[X]$, degré, division euclidienne et algorithme d'Euclide"),
      it("loi", "Théorème de Bézout et factorisation en éléments irréductibles"),
      it("cours", "Racines et multiplicité, relations coefficients-racines"),
      it("cours", "Décomposition en éléments simples d'une fraction rationnelle sur $\\mathbb{R}$ et $\\mathbb{C}$")
    ])
  ]),
  ch("Chapitre 4 : Espaces vectoriels et applications linéaires", [
    sec("Algèbre linéaire générale", [
      it("definition", "Structure d'espace vectoriel, sous-espaces vectoriels, somme directe"),
      it("cours", "Familles libres, génératrices et bases"),
      it("cours", "Applications linéaires, noyau $\\ker(f)$ et image $\\text{Im}(f)$"),
      it("loi", "Théorème du rang : $\\dim(E) = \\dim(\\ker f) + \\text{rg}(f)$ en dimension finie")
    ])
  ]),
  ch("Chapitre 5 : Matrices et systèmes linéaires", [
    sec("Calcul matriciel", [
      it("cours", "Espace $\\mathcal{M}_{n,p}(\\mathbb{K})$, produit matriciel et transposée"),
      it("cours", "Matrice d'une application linéaire, formule de changement de base"),
      it("loi", "Résolution de systèmes linéaires par pivot de Gauss et calcul de l'inverse")
    ])
  ]),
  ch("Chapitre 6 : Déterminants", [
    sec("Formes multilinéaires alternées", [
      it("definition", "Déterminant d'une famille de vecteurs, d'une matrice carrée et d'un endomorphisme"),
      it("cours", "Propriétés : $\\det(AB) = \\det(A)\\det(B)$, développement selon une ligne ou une colonne"),
      it("application", "Caractérisation de l'inversibilité d'une matrice et formules de Cramer")
    ])
  ]),
  ch("Chapitre 7 : Suites réelles ou complexes", [
    sec("Topologie de R et limites", [
      it("cours", "Propriété de la borne supérieure dans $\\mathbb{R}$"),
      it("loi", "Théorème de Bolzano-Weierstrass et suites de Cauchy"),
      it("cours", "Suites adjacentes, comparaisons (Landau : $o, O, \\sim$) et développements asymptotiques")
    ])
  ]),
  ch("Chapitre 8 : Continuité et dérivabilité des fonctions", [
    sec("Analyse réelle d'une variable", [
      it("loi", "Théorème des bornes atteintes et théorème des valeurs intermédiaires"),
      it("loi", "Théorème de Rolle et théorème des accroissements finis (TAF)"),
      it("loi", "Formule de Taylor-Lagrange et développements limités (Taylor-Young)")
    ])
  ]),
  ch("Chapitre 9 : Intégration sur un segment", [
    sec("Intégrale de Riemann", [
      it("cours", "Fonctions continues par morceaux, sommes de Riemann"),
      it("loi", "Théorème fondamental de l'analyse : dérivation d'une intégrale par rapport à sa borne"),
      it("methode", "Intégration par parties et changement de variable")
    ])
  ]),
  ch("Chapitre 10 : Équations différentielles linéaires", [
    sec("Équations scalaires", [
      it("cours", "Équations linéaires d'ordre 1 : structure des solutions et variation de la constante"),
      it("cours", "Équations linéaires d'ordre 2 à coefficients constants, équation caractéristique")
    ])
  ]),
  ch("Chapitre 11 : Espaces préhilbertiens réels", [
    sec("Géométrie euclidienne", [
      it("definition", "Produit scalaire, norme euclidienne et inégalité de Cauchy-Schwarz"),
      it("loi", "Procédé d'orthonormalisation de Gram-Schmidt"),
      it("cours", "Projection orthogonale sur un sous-espace de dimension finie")
    ])
  ]),
  ch("Chapitre 12 : Dénombrement et probabilités discrètes", [
    sec("Espaces probabilisés finis", [
      it("cours", "Cardinaux, combinaisons, formule du crible de Poincaré"),
      it("loi", "Conditionnement, formule de Bayes et des probabilités totales"),
      it("cours", "Variables aléatoires finies, espérance, variance et covariance")
    ])
  ])
];

export const mathsCpge2ndYear = [
  ch("Chapitre 1 : Réduction des endomorphismes et des matrices", [
    sec("Diagonalisation et trigonalisation", [
      it("definition", "Valeurs propres, vecteurs propres et sous-espaces propres"),
      it("loi", "Polynôme caractéristique $\\chi_A(X) = \\det(XI - A)$"),
      it("loi", "Théorème de Cayley-Hamilton et polynôme minimal"),
      it("cours", "Critères nécessaires et suffisants de diagonalisation et trigonalisation"),
      it("application", "Puissances de matrices et systèmes différentiels linéaires")
    ])
  ]),
  ch("Chapitre 2 : Espaces vectoriels normés et topologie", [
    sec("Topologie de dimension finie", [
      it("definition", "Normes et distances, équivalence des normes en dimension finie"),
      it("cours", "Ouverts, fermés, voisinages, adhérence et intérieur"),
      it("loi", "Compacité : caractérisation par Bolzano-Weierstrass et fermés bornés"),
      it("cours", "Continuité des applications linéaires en dimension finie")
    ])
  ]),
  ch("Chapitre 3 : Séries numériques et vectorielles", [
    sec("Convergence et sommabilité", [
      it("cours", "Séries à termes positifs : règle de Riemann, d'Alembert et de Cauchy"),
      it("loi", "Théorème des séries alternées et majoration du reste"),
      it("definition", "Convergence absolue et semi-convergence")
    ])
  ]),
  ch("Chapitre 4 : Suites et séries de fonctions", [
    sec("Modes de convergence", [
      it("definition", "Convergence simple, uniforme et normale d'une série de fonctions"),
      it("loi", "Théorèmes d'interversion : continuité, intégration et dérivation de la somme"),
      it("cours", "Approximation uniforme par des polynômes (théorème de Weierstrass)")
    ])
  ]),
  ch("Chapitre 5 : Séries entières", [
    sec("Rayon de convergence et analyticité", [
      it("loi", "Lemme d'Abel et rayon de convergence $R$"),
      it("cours", "Dérivation et intégration terme à terme d'une série entière"),
      it("application", "Développements en série entière des fonctions usuelles ($e^x, \\ln(1+x), \\cos, \\sin, (1+x)^\\alpha$)")
    ])
  ]),
  ch("Chapitre 6 : Intégrales généralisées (ou impropres)", [
    sec("Intégration sur un intervalle quelconque", [
      it("definition", "Intégrabilité au sens de Riemann sur un intervalle non compact"),
      it("cours", "Critères de comparaison pour les fonctions positives (Riemann : $1/t^\\alpha$)"),
      it("loi", "Convergence absolue et intégrales dépendant d'un paramètre (continuité, dérivation sous le signe $\\int$)")
    ])
  ]),
  ch("Chapitre 7 : Espaces euclidiens et endomorphismes remarquables", [
    sec("Adjoint et théorème spectral", [
      it("definition", "Endomorphisme adjoint $u^*$ dans un espace euclidien"),
      it("cours", "Endomorphismes symétriques (autoadjoints) et matrices symétriques réelles"),
      it("loi", "Théorème spectral : toute matrice symétrique réelle est diagonalisable dans une base orthonormée"),
      it("cours", "Groupe orthogonal $O(n)$ et isométries vectorielles")
    ])
  ]),
  ch("Chapitre 8 : Probabilités sur un univers dénombrable", [
    sec("Variables aléatoires discrètes infinies", [
      it("definition", "Tribu d'événements, probabilité $\\sigma$-additive"),
      it("cours", "Loi géométrique $\\mathcal{G}(p)$ et loi de Poisson $\\mathcal{P}(\\lambda)$"),
      it("loi", "Inégalité de Markov, Bienaymé-Tchebychev et loi faible des grands nombres")
    ])
  ])
];

export const mathsCpgeCommercial = [
  ...mathsCpge1stYear.slice(0, 8),
  ch("Chapitre 9 : Fonctions de plusieurs variables et calcul différentiel", [
    sec("Optimisation multivariée", [
      it("cours", "Dérivées partielles, gradient $\\vec{\\nabla} f$ et matrice jacobienne"),
      it("cours", "Matrice hessienne et formule de Taylor à l'ordre 2"),
      it("application", "Recherche d'extremums libres et optimisation sous contrainte (multiplicateurs de Lagrange)")
    ])
  ]),
  ch("Chapitre 10 : Statistiques inférentielles et estimation", [
    sec("Échantillonnage et estimation", [
      it("cours", "Échantillons indépendants et identiquement distribués (i.i.d.)"),
      it("cours", "Estimateurs sans biais, convergent, méthode du maximum de vraisemblance"),
      it("cours", "Intervalles de confiance pour une moyenne et une proportion")
    ])
  ])
];
