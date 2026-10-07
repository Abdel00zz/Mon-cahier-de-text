import type { LessonsData } from '../../types.js';
import { toDisplayText } from '../../lib/text/textValue.js';

/*
 * EXPORT PAR CHAPITRE — découper un cahier pour l'archiver ou l'échanger.
 *
 * Un cahier se lit par blocs de premier niveau : chapitres, évaluations, lignes
 * libres. C'est cette maille-là qui a du sens à l'export : un professeur veut
 * sauvegarder un chapitre précis, ou n'envoyer que deux blocs à un collègue —
 * pas un fichier de 12 Mo qu'il ne peut plus ni relire ni réimporter.
 *
 * Rien n'est recopié ni renuméroté : `selectExportableChapters` rend les blocs
 * D'ORIGINE, tels qu'ils sont dans le cahier. Le fichier produit reste donc
 * réimportable tel quel (mêmes formes, mêmes dates, même direction d'écriture).
 */

/** Types de STRUCTURE : un chapitre n'est pas un contenu, ses éléments le sont. */
const STRUCTURE_TYPES = new Set(['chapter', 'section', 'subsection', 'subsubsection']);
const CHILD_LISTS = ['items', 'sections', 'subsections', 'subsubsections'] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Contenus d'un bloc, récursivement : ce que le professeur compte vraiment. */
const countContents = (node: Record<string, unknown>): number => {
  let total = 0;
  /*
   * Le niveau se lit dans la LISTE qui porte le nœud, pas dans son `type` :
   * dans un cahier réel, une section n'a pas de champ `type` (elle n'est
   * reconnaissable que par la clé `sections` de son parent). La compter par son
   * type gonflerait chaque chapitre du nombre de ses sections.
   */
  const visit = (element: unknown, elementType: string): void => {
    if (!isRecord(element)) return;
    if (!STRUCTURE_TYPES.has(elementType) && !STRUCTURE_TYPES.has(String(element.type ?? ''))) total += 1;
    CHILD_LISTS.forEach(key => {
      if (key === 'items') return;
      const list = element[key];
      if (Array.isArray(list)) list.forEach(child => visit(child, key.replace(/s$/, '')));
    });
    const items = element.items;
    if (Array.isArray(items)) {
      items.forEach(child => visit(child, String((child as Record<string, unknown> | null)?.type ?? '') === 'chapter' ? 'chapter' : 'item'));
    }
  };
  visit(node, String(node.type ?? 'chapter'));
  return total;
};

/** Octets UTF-8 réels du bloc : l'aperçu de taille ne ment pas. */
const byteLength = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value) ?? '').byteLength;

export interface ExportableChapter {
  /** Position à la racine du cahier : l'identité d'un bloc dans CE cahier. */
  index: number;
  type: string;
  /** Nom affiché du bloc, vide si le professeur ne l'a pas nommé. */
  title: string;
  date: string;
  /** Contenus inclus, récursivement. */
  items: number;
  /** Poids du bloc dans le fichier. */
  bytes: number;
}

/** Les blocs de premier niveau, dans l'ordre du cahier, avec leur poids. */
export const listExportableChapters = (lessonsData: unknown): ExportableChapter[] => {
  if (!Array.isArray(lessonsData)) return [];
  return lessonsData.flatMap((node, index) => {
    if (!isRecord(node)) return [];
    return [{
      index,
      type: String(node.type ?? ''),
      title: toDisplayText(node.title ?? node.name).trim(),
      date: typeof node.date === 'string' ? node.date : '',
      items: countContents(node),
      bytes: byteLength(node),
    }];
  });
};

/**
 * Les blocs cochés, dans l'ordre du cahier et sans recopie superflue.
 * Rendre une liste vide est un cas NORMAL : c'est « rien de coché ».
 */
export const selectExportableChapters = (lessonsData: unknown, indices: readonly number[]): LessonsData => {
  if (!Array.isArray(lessonsData)) return [] as unknown as LessonsData;
  const wanted = new Set(indices);
  return lessonsData.filter((_, index) => wanted.has(index)) as unknown as LessonsData;
};
