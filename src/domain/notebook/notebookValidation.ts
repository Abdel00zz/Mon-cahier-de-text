import { IMPORT_LIMITS } from './importLimits.js';
import { textFieldLimit } from './notebookSchema.js';
import { walkNotebook } from './notebookTraversal.js';

/**
 * Valide SANS normaliser : la synchronisation et les sauvegardes doivent
 * préserver la mise en forme voulue. Le parcours et les budgets sont ceux du
 * moteur partagé ; seule la politique (lever une erreur) est locale.
 */
export function assertNotebookStructure(value: unknown): asserts value is unknown[] {
    if (!Array.isArray(value)) throw new Error('Données de cahier invalides.');
    if (value.length > IMPORT_LIMITS.nodes) throw new Error('Cahier trop volumineux.');
    walkNotebook(value, {
        onInvalidNode: () => { throw new Error('Élément de cours invalide.'); },
        onBudgetExceeded: reason => {
            throw new Error(reason === 'depth'
                ? 'Structure de cahier trop profonde.'
                : 'Cahier trop volumineux. Répartissez le contenu entre plusieurs cahiers.');
        },
        onText: (_context, field, text) => {
            if (text === undefined || text === null) return;
            // Les valeurs héritées page/number sont numériques : jamais réécrites pendant la synchro.
            if ((field === 'page' || field === 'number') && typeof text === 'number' && Number.isFinite(text)) return;
            if (typeof text !== 'string' || text.length > textFieldLimit(field)) {
                throw new Error(`Champ « ${field} » invalide ou trop long.`);
            }
        },
        onContainer: (_context, key, _value, isArray) => {
            if (!isArray) throw new Error(`Conteneur « ${key} » invalide.`);
        },
    });
}
