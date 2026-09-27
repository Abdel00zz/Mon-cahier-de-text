import katex from 'katex';

/**
 * Moteur mathématique : KaTeX, embarqué dans le bundle (moteur + polices), donc
 * disponible hors ligne par construction — aucun CDN, aucun service worker
 * dédié, aucune attente de démarrage.
 *
 * Les macros sont portées TELLES QUELLES depuis l'ancienne configuration
 * MathJax : les cahiers existants continuent de s'afficher à l'identique
 * (commandes de confort $\R$, $\abs{}$… et rattrapage des commandes de
 * document écrites par erreur dans une formule).
 */
/**
 * Macros de confort, étendues avant le rendu (jamais confiées à KaTeX, voir
 * l'en-tête du fichier). Deux familles :
 *  - les ensembles usuels et l'italique, sans argument ;
 *  - les commandes à argument, lues avec leurs accolades équilibrées.
 */
const KATEX_SETS: Record<string, string> = {
  R: '\\mathbb{R}',
  N: '\\mathbb{N}',
  Z: '\\mathbb{Z}',
  Q: '\\mathbb{Q}',
  C: '\\mathbb{C}',
  e: '\\mathrm{e}',
  dif: '\\mathrm{d}',
};

/** \itshape existe nativement dans KaTeX : rien à étendre, on le documente ici. */
const KATEX_NATIVE = ['itshape'] as const;

/** Commandes de *document* écrites par erreur dans une formule : absorbées. */
const DROPPED = ['par', 'noindent', 'smallskip', 'medskip', 'bigskip'];

const WRAPPERS: Record<string, (argument: string) => string> = {
  abs: argument => `\\left|${argument}\\right|`,
  norme: argument => `\\left\\lVert ${argument}\\right\\rVert`,
  vect: argument => `\\overrightarrow{${argument}}`,
  sout: argument => `\\cancel{${argument}}`,
  itsize: argument => `\\mathit{${argument}}`,
  itesize: argument => `\\mathit{${argument}}`,
};

/** Contenu d'un groupe `{…}` équilibré, ou null si la formule est incomplète. */
const readGroup = (tex: string, start: number): { content: string; end: number } | null => {
  if (tex[start] !== '{') return null;
  let depth = 0;
  for (let index = start; index < tex.length; index += 1) {
    if (tex[index] === '{') depth += 1;
    else if (tex[index] === '}') {
      depth -= 1;
      if (depth === 0) return { content: tex.slice(start + 1, index), end: index + 1 };
    }
  }
  return null;
};

/** Étend les commandes de confort d'une formule, sans jamais ré-étendre. */
const expandComfortMacros = (tex: string): string => {
  let out = '';
  for (let index = 0; index < tex.length; index += 1) {
    if (tex[index] !== '\\') {
      out += tex[index];
      continue;
    }
    const match = /^\\\\([a-zA-Z]+)/.exec(tex.slice(index));
    if (!match) {
      out += tex[index];
      continue;
    }
    const name = match[1];
    const after = index + match[0].length;

    if (KATEX_SETS[name]) {
      out += KATEX_SETS[name];
      index = after - 1;
      continue;
    }
    if (DROPPED.includes(name)) {
      index = after - 1;
      continue;
    }

    if (name === 'ang' || name === 'unit' || name === 'vspace') {
      const first = readGroup(tex, after);
      if (first) {
        if (name === 'ang') out += `${first.content}^\\circ`;
        else if (name === 'vspace') out += '';
        else {
          const second = readGroup(tex, first.end);
          out += second ? `${first.content}\\,\\text{${second.content}}` : first.content;
          index = (second?.end ?? first.end) - 1;
          continue;
        }
        index = first.end - 1;
        continue;
      }
    }

    const wrapper = WRAPPERS[name];
    if (wrapper) {
      const group = readGroup(tex, after);
      if (group) {
        out += wrapper(group.content);
        index = group.end - 1;
        continue;
      }
    }

    out += match[0];
    index = after - 1;
  }
  return out;
};

const BASE_OPTIONS = {
  // Une commande inconnue ne casse JAMAIS le rendu : elle s'affiche en rouge à
  // sa place, le reste de la formule reste lisible.
  throwOnError: false,
  errorColor: '#b91c1c',
  strict: false,
  trust: false,
  // HTML + MathML : les lecteurs d'écran et la copie restent corrects.
  output: 'htmlAndMathml' as const,
};

/**
 * Les segments mathématiques arrivent AVEC leurs délimiteurs (`$…$`, `$$…$$`,
 * `\(…\)`, `\[…\]`) : KaTeX attend le contenu seul, sinon il lit le `$` comme
 * une commande et refuse la formule. On retire donc le délimiteur ici, une fois
 * pour toutes, plutôt que chez chaque appelant.
 */
const stripMathDelimiters = (tex: string): string => {
  const value = tex.trim();
  const pairs: [string, string][] = [['$$', '$$'], ['\\[', '\\]'], ['\\(', '\\)'], ['$', '$']];
  for (const [open, close] of pairs) {
    if (value.length > open.length + close.length - 1
      && value.startsWith(open) && value.endsWith(close)) {
      return value.slice(open.length, value.length - close.length);
    }
  }
  return value;
};

/** Rendu synchrone d'une formule : aucune promesse, donc aucun état de
 *  chargement, aucun scintillement de TeX brut, aucun décalage de mise en page. */
export const renderKatexHtml = (tex: string, displayMode?: boolean): string => {
  const trimmed = tex.trim();
  const value = expandComfortMacros(stripMathDelimiters(tex));
  if (!value) return '';
  try {
    return katex.renderToString(value, {
      ...BASE_OPTIONS,
      // Sans indication, c'est le délimiteur qui décide de l'affichage en bloc.
      displayMode: displayMode ?? (trimmed.startsWith('$$') || trimmed.startsWith('\\[')),
    });
  } catch {
    return '';
  }
};
