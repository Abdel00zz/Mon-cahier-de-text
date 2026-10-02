import type { Plugin } from 'vite';
import { BUNDLE_OPTIMIZATION } from '../optimization';

/*
 * Budget de performance : avertit toujours, et devient bloquant en mode
 * `analyze` (npm run analyze). Sans ce mode, une régression au-delà du budget
 * passait en silence ; l'exécuter à la demande donne un vrai garde-fou sans
 * casser les builds de production ordinaires.
 */
export const premiumPerformancePlugin = (options: { strict?: boolean; report?: boolean } = {}): Plugin => ({
    name: 'premium-performance-budget',
    apply: 'build',
    generateBundle(_, bundle) {
        const budgetKb = BUNDLE_OPTIMIZATION.CHUNK_WARN_LIMIT_KB;
        const budgetBytes = budgetKb * 1024;
        const chunks: Array<{ file: string; kb: number }> = [];
        const oversized: string[] = [];

        Object.entries(bundle).forEach(([fileName, asset]) => {
            if (asset.type !== 'chunk') return;
            const size = Buffer.byteLength(asset.code, 'utf8');
            chunks.push({ file: fileName, kb: size / 1024 });
            if (size <= budgetBytes) return;

            oversized.push(`${fileName} (${(size / 1024).toFixed(1)} kB)`);
            this.warn(
                `[performance-budget] ${fileName} = ${(size / 1024).toFixed(1)} kB ` +
                `(budget ${budgetKb} kB). Consider lazy-loading this surface.`
            );
        });

        if (options.report) {
            chunks.sort((a, b) => b.kb - a.kb)
                .forEach(chunk => this.warn(`[bundle-size] ${chunk.file} = ${chunk.kb.toFixed(1)} kB`));
        }
        if (options.strict && oversized.length > 0) {
            this.error(`[performance-budget] Budget de ${budgetKb} kB dépassé : ${oversized.join(', ')}`);
        }
    }
});
