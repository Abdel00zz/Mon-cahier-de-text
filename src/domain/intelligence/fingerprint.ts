import { NOTEBOOK_CONTAINERS, NOTEBOOK_TEXT_FIELDS, isRecord } from '../notebook/notebookSchema.js';

/*
 * EMPREINTE DE NŒUD — identité de CONTENU, sans identité d'objet.
 *
 * Deux blocs sont « le même bloc » s'ils portent les mêmes textes, la même date
 * et la même structure — peu importe qu'ils soient deux objets distincts en
 * mémoire, et peu importe l'ordre des clés JSON. C'est ce que mesure
 * l'empreinte : un parcours canonique (ordre de champs fixe), deux couloirs
 * FNV-1a entrelacés, aucune allocation de chaîne intermédiaire.
 *
 * Volontairement EXCLU de l'empreinte : `_tempId` (identifiant de session,
 * aléatoire) et tout champ inconnu — sinon deux copies du même chapitre
 * paraîtraient différentes à cause d'un détail technique.
 */

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
/** Second couloir : un multiplicateur distinct rend les collisions corrélées improbables. */
const SECOND_PRIME = 0x85ebca6b;
/** Champs hors texte qui font partie de l'identité pédagogique. */
const IDENTITY_FIELDS = ['date'] as const;

/** Empreinte 64 bits (16 caractères hexadécimaux) d'un nœud de cahier. */
export const fingerprintNode = (node: unknown): string => {
  let low = FNV_OFFSET;
  let high = FNV_OFFSET;

  const write = (text: string): void => {
    for (let index = 0; index < text.length; index++) {
      const code = text.charCodeAt(index);
      low = Math.imul(low ^ code, FNV_PRIME);
      high = Math.imul(high ^ code, SECOND_PRIME);
    }
    // Séparateur : « ab »+« c » ne doit pas produire la même empreinte que « a »+« bc ».
    low = Math.imul(low ^ 0x1f, FNV_PRIME);
    high = Math.imul(high ^ 0x1f, SECOND_PRIME);
  };

  const visit = (value: unknown): void => {
    if (!isRecord(value)) { write('~'); return; }
    write(String(value.type ?? ''));
    for (const field of NOTEBOOK_TEXT_FIELDS) {
      if (Object.hasOwn(value, field)) { write(field); write(String(value[field] ?? '')); }
    }
    for (const field of IDENTITY_FIELDS) {
      if (Object.hasOwn(value, field)) { write(field); write(String(value[field] ?? '')); }
    }
    for (const key of NOTEBOOK_CONTAINERS) {
      const list = value[key];
      if (!Array.isArray(list)) continue;
      write(key);
      write(String(list.length));
      for (const child of list) visit(child);
    }
  };

  visit(node);
  return `${(low >>> 0).toString(16).padStart(8, '0')}${(high >>> 0).toString(16).padStart(8, '0')}`;
};
