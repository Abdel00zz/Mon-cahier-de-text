import { NOTEBOOK_CONTAINERS } from '../notebook/notebookSchema.js';
import { walkNotebook } from '../notebook/notebookTraversal.js';
import { hasControlCharacters, hasUnclosedFormula } from '../notebook/textSignals.js';
import { fingerprintNode } from './fingerprint.js';

/*
 * CONSEILLER DE CAHIER — le moteur qui REGARDE le cahier et parle au professeur.
 *
 * Ce n'est pas un validateur : rien n'est refusé, rien n'est bloquant. C'est une
 * lecture intelligente d'un cahier (souvent importé d'ailleurs) qui repère en UNE
 * passe les défauts qui coûtent du temps plus tard :
 *
 *   • une formule ouverte et jamais fermée      → le TeX brut s'affiche ;
 *   • deux blocs identiques                     → import fait deux fois ;
 *   • des séances datées à l'envers             → relecture chronologique cassée ;
 *   • des contenus sans date                    → progression et projection aveugles ;
 *   • des chapitres ou sections vides           → plan annoncé mais pas rempli ;
 *   • des caractères de contrôle                → texte collé abîmé.
 *
 * Optimisation : un seul parcours (le moteur partagé), aucun tableau
 * intermédiaire par nœud, des compteurs numériques, un échantillon de chemin
 * par défaut. Le tri final porte sur six entrées au plus.
 */

const CODES = ['unclosedFormula', 'outOfOrderSessions', 'duplicateBlocks', 'emptyStructure', 'undatedContent', 'controlCharacters'] as const;
type AdviceCode = (typeof CODES)[number];
type AdviceSeverity = 'notice' | 'warning';

export interface NotebookAdvice {
  code: AdviceCode;
  severity: AdviceSeverity;
  count: number;
  /** Premier endroit concerné (chemin technique), pour situer le conseil. */
  samplePath?: string;
}

/** Ce qui doit se corriger d'abord (rupture) avant ce qui se complète (finition). */
const SEVERITY: Record<AdviceCode, AdviceSeverity> = {
  unclosedFormula: 'warning',
  outOfOrderSessions: 'warning',
  duplicateBlocks: 'warning',
  emptyStructure: 'notice',
  undatedContent: 'notice',
  controlCharacters: 'notice',
};

/**
 * Analyse un cahier et rend les conseils les plus utiles, les plus graves
 * d'abord (à nombre égal). `limit` borne le nombre de conseils rendus — un
 * professeur agit sur trois ou quatre remarques, pas sur trente.
 */
export const analyseNotebook = (nodes: unknown, limit = 4): NotebookAdvice[] => {
  const counts: Record<AdviceCode, number> = {
    unclosedFormula: 0, outOfOrderSessions: 0, duplicateBlocks: 0, emptyStructure: 0, undatedContent: 0, controlCharacters: 0,
  };
  const samples: Partial<Record<AdviceCode, string>> = {};
  const bump = (code: AdviceCode, path: string): void => {
    counts[code] += 1;
    if (!samples[code]) samples[code] = path;
  };

  let datedContents = 0;
  let currentChapter = -1;
  const lastDateByChapter = new Map<number, string>();
  const seenBlocks = new Set<string>();

  walkNotebook(nodes, {
    onNode: context => {
      const node = context.node;

      // Un bloc de premier niveau qui répète un frère à l'identique : import
      // fait deux fois, copier-coller de chapitre — le défaut le plus coûteux.
      if (context.container === null) {
        currentChapter = context.index;
        const print = fingerprintNode(node);
        if (seenBlocks.has(print)) bump('duplicateBlocks', context.path);
        else seenBlocks.add(print);
      }

      if (context.structural) {
        const hasChildren = NOTEBOOK_CONTAINERS.some(key => Array.isArray(node[key]) && (node[key] as unknown[]).length > 0);
        if (!hasChildren) bump('emptyStructure', context.path);
        return;
      }

      const date = typeof node.date === 'string' ? node.date.trim() : '';
      if (!date) { bump('undatedContent', context.path); return; }
      datedContents += 1;
      const previous = lastDateByChapter.get(currentChapter);
      if (previous !== undefined && date < previous) bump('outOfOrderSessions', context.path);
      lastDateByChapter.set(currentChapter, date);
    },
    onText: (context, field, value) => {
      if (typeof value !== 'string' || !value) return;
      const path = context.path ? `${context.path} › ${field}` : field;
      if (hasUnclosedFormula(value)) bump('unclosedFormula', path);
      if (hasControlCharacters(value)) bump('controlCharacters', path);
    },
  });

  // « Sans date » n'est un conseil que si l'auteur date ailleurs : un cahier
  // neuf entièrement vierge de dates n'a rien à se reprocher.
  if (datedContents === 0) counts.undatedContent = 0;

  return CODES
    .filter(code => counts[code] > 0)
    .map(code => ({ code, severity: SEVERITY[code], count: counts[code], samplePath: samples[code] }))
    .sort((a, b) => (a.severity === b.severity ? b.count - a.count : a.severity === 'warning' ? -1 : 1))
    .slice(0, limit);
};
