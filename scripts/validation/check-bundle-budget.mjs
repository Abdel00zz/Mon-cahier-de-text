// Garde-fou de performance : le poids livré au navigateur ne peut pas dériver
// silencieusement. On mesure les fichiers gzippés de `dist/assets`, ce qui
// correspond à ce que reçoit réellement l'enseignant sur un réseau mobile.
//
// Usage : npm run build && npm run check:bundle
// Les budgets sont volontairement ~20 % au-dessus du poids actuel : un
// dépassement signale une régression, pas une simple variation de hachage.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const ASSETS = join(ROOT, 'dist', 'assets');

export const BUDGETS = {
    /** Poids gzippé maximal d'un fragment JavaScript isolé. */
    maxChunkKb: 90,
    /** Poids gzippé cumulé de tous les fragments JavaScript. */
    maxJsTotalKb: 1150,
    /** Poids gzippé cumulé des feuilles de style. */
    maxCssTotalKb: 160,
};

export function measureAssets(directory) {
    const files = readdirSync(directory);
    const measure = (name) => gzipSync(readFileSync(join(directory, name)), { level: 9 }).length / 1024;
    const js = files.filter(name => name.endsWith('.js')).map(name => ({ name, kb: measure(name) })).sort((a, b) => b.kb - a.kb);
    const css = files.filter(name => name.endsWith('.css')).map(name => ({ name, kb: measure(name) })).sort((a, b) => b.kb - a.kb);
    return {
        js,
        css,
        jsTotalKb: js.reduce((sum, file) => sum + file.kb, 0),
        cssTotalKb: css.reduce((sum, file) => sum + file.kb, 0),
    };
}

export function evaluateBudgets(assets, budgets = BUDGETS) {
    const violations = [];
    for (const file of assets.js) {
        if (file.kb > budgets.maxChunkKb) {
            violations.push(`${file.name} : ${file.kb.toFixed(1)} kB gzip (max ${budgets.maxChunkKb} kB)`);
        }
    }
    if (assets.jsTotalKb > budgets.maxJsTotalKb) {
        violations.push(`Total JS : ${assets.jsTotalKb.toFixed(1)} kB gzip (max ${budgets.maxJsTotalKb} kB)`);
    }
    if (assets.cssTotalKb > budgets.maxCssTotalKb) {
        violations.push(`Total CSS : ${assets.cssTotalKb.toFixed(1)} kB gzip (max ${budgets.maxCssTotalKb} kB)`);
    }
    return violations;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    if (!existsSync(ASSETS)) {
        console.error('dist/assets introuvable : lancez `npm run build` avant `npm run check:bundle`.');
        process.exit(1);
    }
    const assets = measureAssets(ASSETS);
    const violations = evaluateBudgets(assets);
    const heaviest = assets.js.slice(0, 5).map(file => `  ${file.kb.toFixed(1)} kB  ${file.name}`).join('\n');
    console.log(`Bundle : ${assets.js.length} JS / ${assets.css.length} CSS`);
    console.log(`Total JS ${assets.jsTotalKb.toFixed(1)} kB gzip (max ${BUDGETS.maxJsTotalKb}), CSS ${assets.cssTotalKb.toFixed(1)} kB gzip (max ${BUDGETS.maxCssTotalKb})`);
    console.log(`Fragments les plus lourds :\n${heaviest}`);
    if (violations.length) {
        console.error('\nBudgets de bundle dépassés :');
        for (const violation of violations) console.error(`  - ${violation}`);
        console.error('Réduire le fragment concerné (import dynamique, découpage, allègement) ou justifier le budget dans docs/infrastructure.md.');
        process.exit(1);
    }
    console.log('Budgets de bundle respectés.');
}
