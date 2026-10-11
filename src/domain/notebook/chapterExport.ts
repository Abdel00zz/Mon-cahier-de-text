import type { LessonsData } from '../../types.js';
import { toDisplayText } from '../../lib/text/textValue.js';
import { isRecord } from './notebookSchema.js';
import { walkNotebook } from './notebookTraversal.js';

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

/**
 * Contenus d'un bloc, récursivement : ce que le professeur compte vraiment.
 * Un nœud de structure (chapitre, section, sous-section) n'est pas un contenu.
 * Le parcours et la définition du niveau vivent dans le moteur partagé.
 */
const countContents = (node: Record<string, unknown>): number => walkNotebook([node]).contents;

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
