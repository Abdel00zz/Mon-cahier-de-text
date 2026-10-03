import { IMPORT_LIMITS } from './importLimits.js';

const containers = ['sections', 'subsections', 'subsubsections', 'items'] as const;
const textFields = ['title', 'name', 'type', 'number', 'page', 'description', 'remark', 'content'] as const;

/** Validate without normalizing: sync and backups must preserve intentional formatting. */
export function assertNotebookStructure(value: unknown): asserts value is unknown[] {
  if (!Array.isArray(value)) throw new Error('Données de cahier invalides.');
  if (value.length > IMPORT_LIMITS.nodes) throw new Error('Cahier trop volumineux.');
  const pending = value.map(node => ({ node, depth: 0 }));
  let count = 0;
  while (pending.length) {
    const { node, depth } = pending.pop()!;
    if (++count > IMPORT_LIMITS.nodes) throw new Error('Cahier trop volumineux. Répartissez le contenu entre plusieurs cahiers.');
    if (depth > IMPORT_LIMITS.depth) throw new Error('Structure de cahier trop profonde.');
    if (!node || typeof node !== 'object' || Array.isArray(node)) throw new Error('Élément de cours invalide.');
    const record = node as Record<string, unknown>;
    for (const field of textFields) {
      const text = record[field];
      if (text === undefined || text === null) continue;
      // Legacy page/number values are numeric; never rewrite them during sync.
      if ((field === 'page' || field === 'number') && typeof text === 'number' && Number.isFinite(text)) continue;
      const limit = field === 'description' || field === 'remark' || field === 'content' ? IMPORT_LIMITS.text : IMPORT_LIMITS.label;
      if (typeof text !== 'string' || text.length > limit) throw new Error(`Champ « ${field} » invalide ou trop long.`);
    }
    for (const field of containers) {
      const nested = record[field];
      if (nested === undefined) continue;
      if (!Array.isArray(nested)) throw new Error(`Conteneur « ${field} » invalide.`);
      if (count + pending.length + nested.length > IMPORT_LIMITS.nodes) throw new Error('Cahier trop volumineux.');
      for (const child of nested) pending.push({ node: child, depth: depth + 1 });
    }
  }
}
