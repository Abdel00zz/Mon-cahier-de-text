import katex from 'katex';
import { highlightMathSource } from '../lib/text/highlightMarkers';

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
 * \itshape est native dans KaTeX et ne nécessite pas de remplacement.
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
    if (tex[index] === '\\') { index += 1; continue; }
    if (tex[index] === '{') depth += 1;
    else if (tex[index] === '}') {
      depth -= 1;
      if (depth === 0) return { content: tex.slice(start + 1, index), end: index + 1 };
    }
  }
  return null;
};

/** Étend les arguments imbriqués, sans réinterpréter les remplacements générés. */
const expandComfortMacros = (tex: string, depth = 0): string => {
  if (depth >= 32) return tex;
  let out = '';
  for (let index = 0; index < tex.length; index += 1) {
    if (tex[index] !== '\\') {
      out += tex[index];
      continue;
    }
    if (tex[index + 1] === '\\') { out += '\\\\'; index += 1; continue; }
    const match = /^\\([a-zA-Z]+)/.exec(tex.slice(index));
    if (!match) {
      out += tex[index];
      continue;
    }
    const name = match[1];
    const after = index + match[0].length;
    let argumentStart = after;
    while (/\s/.test(tex[argumentStart] ?? '') && argumentStart < tex.length) argumentStart++;

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
      const first = readGroup(tex, argumentStart);
      if (first) {
        if (name === 'ang') out += `${expandComfortMacros(first.content, depth + 1)}^\\circ`;
        else if (name === 'vspace') out += '';
        else {
          let secondStart = first.end;
          while (/\s/.test(tex[secondStart] ?? '') && secondStart < tex.length) secondStart++;
          const second = readGroup(tex, secondStart);
          const value = expandComfortMacros(first.content, depth + 1);
          out += second ? `${value}\\,\\text{${second.content}}` : value;
          index = (second?.end ?? first.end) - 1;
          continue;
        }
        index = first.end - 1;
        continue;
      }
    }

    const wrapper = WRAPPERS[name];
    if (wrapper) {
      const group = readGroup(tex, argumentStart);
      if (group) {
        out += wrapper(expandComfortMacros(group.content, depth + 1));
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
  maxExpand: 1000,
  maxSize: 20,
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
  // Sans indication, c'est le délimiteur qui décide de l'affichage en bloc.
  const display = displayMode ?? (trimmed.startsWith('$$') || trimmed.startsWith('\\['));
  try {
    const value = highlightMathSource(expandComfortMacros(stripMathDelimiters(tex)), display);
    if (!value) return '';
    return katex.renderToString(value, {
      ...BASE_OPTIONS,
      displayMode: display,
    });
  } catch {
    // A rendering failure must never silently erase the teacher's formula.
    const escaped = tex.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<span class="katex-error">${escaped}</span>`;
  }
};
