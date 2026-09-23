import type { MathJax3Config } from 'better-react-mathjax';

// MathJax 4.1.3 (version fixée), chargé depuis jsDelivr. L'API de démarrage
// de la v4 reste compatible avec `version={3}` de better-react-mathjax (config
// `window.MathJax`, `startup.promise`, `typesetPromise`). Le composant combiné
// `tex-mml-chtml` inclut déjà entrée TeX/MathML + sortie CHTML (pas de `loader`).
export const MATHJAX_V4_SRC = 'https://cdn.jsdelivr.net/npm/mathjax@4.1.3/tex-mml-chtml.js';

export const mathJaxConfig: MathJax3Config = {
  // React owns the document; only MathText may typeset its own subtree.
  startup: { typeset: false },
  tex: {
    inlineMath: [["$", "$"], ["\\(", "\\)"]],
    displayMath: [["$$", "$$"], ["\\[", "\\]"]],
    // Macros de confort pour la saisie rapide des enseignants :
    // $\R$ ≡ $\mathbb{R}$, $\abs{x}$ ≡ $\left|x\right|$, etc. (voir README).
    macros: {
      R: "\\mathbb{R}",
      N: "\\mathbb{N}",
      Z: "\\mathbb{Z}",
      Q: "\\mathbb{Q}",
      C: "\\mathbb{C}",
      abs: ["\\left|#1\\right|", 1],
      norme: ["\\left\\lVert #1\\right\\rVert", 1],
      vect: ["\\overrightarrow{#1}", 1],
      e: "\\mathrm{e}",
      dif: "\\mathrm{d}",
      // Commandes courantes ABSENTES de MathJax (vérifiées à la sonde du
      // 23/09/2026) : elles arrivent par copier-coller LaTeX ou par conversion
      // automatique, et MathJax répondait « Undefined control sequence ».
      sout: ["\\cancel{#1}", 1], // \cancel est fourni, pas \sout (paquet ulem)
      itshape: ["\\mathit{#1}", 1], // italique dans une formule
      itsize: ["\\mathit{#1}", 1], // graphies rencontrées sur le terrain
      itesize: ["\\mathit{#1}", 1], // (idem : aucune n'est du LaTeX standard)
      ang: ["#1^\\circ", 1], // \ang{30} → 30°
      unit: ["#1\\,\\text{#2}", 2], // \unit{3}{m} → 3 m
      // Commandes de *document* écrites par erreur dans une formule : elles y
      // sont sans objet (la mise en page vit dans utils/textFormat.ts), mieux
      // vaut les ignorer que casser toute la formule.
      par: "",
      noindent: "",
      smallskip: "",
      medskip: "",
      bigskip: "",
      vspace: ["", 1],
    },
  },
  // NB : pas d'option `chtml.displayOverflow`, bien que MathJax 4 (chargé
  // ci-dessus) la supporte, le débordement des longues formules sur mobile
  // est géré en CSS (conteneurs overflow-x:auto) ; l'activer changerait la
  // mise en page existante des formules hors-gabarit.
};
