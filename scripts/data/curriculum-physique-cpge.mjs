import { ch, sec, it } from '../curriculum-builder-helpers.mjs';

export const physiqueCpge1stYear = [
  ch("Chapitre 1 : Cinématique du point matériel", [
    sec("Repérages et vecteurs", [
      it("cours", "Coordonnées cartésiennes, cylindriques et sphériques"),
      it("cours", "Vecteur vitesse et accélération, base de Frenet"),
      it("application", "Trajectoires usuelles : rectiligne, circulaire, hélicoïdale")
    ])
  ]),
  ch("Chapitre 2 : Dynamique du point en référentiel galiléen", [
    sec("Lois de Newton et théorèmes fondamentaux", [
      it("loi", "Principe fondamental de la dynamique $\\sum \\vec{F} = m\\vec{a}$"),
      it("cours", "Théorème du moment cinétique : $\\frac{d\\vec{L}_O}{dt} = \\vec{\\mathcal{M}}_O(\\vec{F})$"),
      it("cours", "Mouvement à force centrale conservative : lois de Kepler et potentiel effectif")
    ])
  ]),
  ch("Chapitre 3 : Dynamique en référentiel non galiléen", [
    sec("Forces d'inertie", [
      it("cours", "Loi de composition des vitesses et des accélérations (accélération d'entraînement et de Coriolis)"),
      it("loi", "Forces d'inertie d'entraînement $\\vec{F}_{ie} = -m\\vec{a}_e$ et de Coriolis $\\vec{F}_{ic} = -m\\vec{a}_c$"),
      it("application", "Effets sur Terre : pendule de Foucault et déviation vers l'est")
    ])
  ]),
  ch("Chapitre 4 : Énergétique du point matériel", [
    sec("Théorèmes énergétiques", [
      it("definition", "Forces conservatives et énergie potentielle $\\vec{F} = -\\vec{\\nabla} E_p$"),
      it("loi", "Théorème de l'énergie mécanique et intégrales premières du mouvement"),
      it("cours", "Stabilité des positions d'équilibre et petites oscillations")
    ])
  ]),
  ch("Chapitre 5 : Circuits électriques linéaires en régime transitoire", [
    sec("Circuits du premier et second ordre", [
      it("loi", "Lois de Kirchhoff et représentations différentielles"),
      it("cours", "Réponse indicielle d'un circuit $RC$ et $RL$"),
      it("cours", "Circuit $RLC$ série : équation du second ordre, facteur de qualité $Q$, régimes apériodique, critique et oscillatoire")
    ])
  ]),
  ch("Chapitre 6 : Régime sinusoïdal forcé et résonance", [
    sec("Représentation complexe et filtres", [
      it("cours", "Impédance et admittance complexes $\\underline{Z}$"),
      it("cours", "Fonction de transfert $\\underline{H}(j\\omega)$, gain en décibels et phase"),
      it("cours", "Filtres usuels d'ordre 1 et 2 (passe-bas, passe-haut, passe-bande) et diagrammes de Bode")
    ])
  ]),
  ch("Chapitre 7 : Optique géométrique", [
    sec("Lois de Snell-Descartes et stigmatisme", [
      it("loi", "Lois de Snell-Descartes pour la réflexion et la réfraction"),
      it("cours", "Conditions de Gauss et stigmatisme approché"),
      it("cours", "Miroirs plans, sphériques et lentilles minces : foyers, plans focaux et constructions")
    ])
  ]),
  ch("Chapitre 8 : Thermodynamique : Premier et second principes", [
    sec("Systèmes thermodynamiques et bilans", [
      it("definition", "Description macroscopique, variables d'état et gaz parfait $PV=nRT$"),
      it("loi", "Premier principe de la thermodynamique : $\\Delta U = W + Q$, enthalpie $H = U + PV$"),
      it("loi", "Second principe : création d'entropie $\\Delta S = S_{ech} + S_{cree}$ ($S_{cree} \\ge 0$)"),
      it("application", "Cycles thermodynamiques et machines thermiques : théorème de Carnot")
    ])
  ]),
  ch("Chapitre 9 : Architecture de la matière et thermochimie", [
    sec("Structure atomique et équilibres", [
      it("cours", "Classification périodique, orbitales atomiques et modèle de Lewis / VSEPR"),
      it("loi", "Premier et second principe appliqués à la réaction chimique : enthalpies standard de réaction $\\Delta_r H^\\circ$ et affinité"),
      it("cours", "Loi d'action de masse et équilibres acido-basiques, de précipitation et d'oxydoréduction")
    ])
  ])
];

export const physiqueCpge2ndYear = [
  ch("Chapitre 1 : Électromagnétisme : Équations de Maxwell", [
    sec("Champ électromagnétique et lois fondamentales", [
      it("cours", "Opérateurs différentiels : gradient, divergence, rotationnel et laplacien"),
      it("loi", "Équations de Maxwell locales : Maxwell-Gauss, Maxwell-Thomson, Maxwell-Faraday et Maxwell-Ampère"),
      it("loi", "Conservation de la charge électrique : $\\text{div}\\vec{j} + \\frac{\\partial \\rho}{\\partial t} = 0$")
    ])
  ]),
  ch("Chapitre 2 : Énergie électromagnétique et propagation", [
    sec("Vecteur de Poynting et ondes planes", [
      it("definition", "Densité d'énergie électromagnétique $u_{em}$ et vecteur de Poynting $\\vec{\\Pi} = \\frac{\\vec{E}\\wedge\\vec{B}}{\\mu_0}$"),
      it("loi", "Équation de Poynting et bilan d'énergie électromagnétique"),
      it("cours", "Onde plane progressive monochromatique (OPPM) dans le vide et dans les milieux diélectriques")
    ])
  ]),
  ch("Chapitre 3 : Ondes et optique ondulatoire", [
    sec("Interférences lumineuses", [
      it("cours", "Modèle scalaire des ondes lumineuses et intensité"),
      it("loi", "Formule de Fresnel pour deux ondes cohérentes"),
      it("application", "Dispositif des trous d'Young : interfrange $i = \\frac{\\lambda D}{a}$"),
      it("cours", "Interféromètre de Michelson : configurations en lame d'air et en coin d'air")
    ])
  ]),
  ch("Chapitre 4 : Mécanique des fluides", [
    sec("Statique et dynamique des fluides", [
      it("loi", "Principe fondamental de la statique des fluides : $\\vec{\\nabla} P = \\rho\\vec{g}$"),
      it("cours", "Description eulérienne et lagrangienne d'un écoulement"),
      it("loi", "Équation de continuité et équation d'Euler pour un fluide parfait"),
      it("loi", "Théorème de Bernoulli pour un écoulement incompressible et stationnaire")
    ])
  ]),
  ch("Chapitre 5 : Physique quantique et physique statistique", [
    sec("Introduction au monde quantique", [
      it("cours", "Dualité onde-corpuscule et relation de de Broglie $\\lambda = \\frac{h}{p}$"),
      it("loi", "Inégalités d'Heisenberg spatiales et temporelles"),
      it("cours", "Équation de Schrödinger indépendante du temps et puits de potentiel infini")
    ])
  ])
];
