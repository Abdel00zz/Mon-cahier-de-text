import type { MathJax3Config } from 'better-react-mathjax';

// MathJax 4.1.3 (dernière version), chargé depuis jsDelivr. L'API de démarrage
// de la v4 reste compatible avec `version={3}` de better-react-mathjax (config
// `window.MathJax`, `startup.promise`, `typesetPromise`). Le composant combiné
// `tex-mml-chtml` inclut déjà entrée TeX/MathML + sortie CHTML (pas de `loader`).
export const MATHJAX_V4_SRC = 'https://cdn.jsdelivr.net/npm/mathjax@4.1.3/tex-mml-chtml.js';

export const mathJaxConfig: MathJax3Config = {
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
    },
  },
  // NB : pas d'option `chtml.displayOverflow`, bien que MathJax 4 (chargé
  // ci-dessus) la supporte, le débordement des longues formules sur mobile
  // est géré en CSS (conteneurs overflow-x:auto) ; l'activer changerait la
  // mise en page existante des formules hors-gabarit.
};
