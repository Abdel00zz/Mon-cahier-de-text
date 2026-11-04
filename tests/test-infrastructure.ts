import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { BUDGETS, evaluateBudgets } from '../scripts/validation/check-bundle-budget.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (path: string) => readFileSync(join(root, path), 'utf8');

test('budget de bundle : un fragment trop lourd est signalé, un bundle sain passe', () => {
    assert.deepEqual(evaluateBudgets({ js: [{ name: 'a.js', kb: 10 }], css: [{ name: 'a.css', kb: 4 }], jsTotalKb: 10, cssTotalKb: 4 }), []);
    const violations = evaluateBudgets({
        js: [{ name: 'gros.js', kb: BUDGETS.maxChunkKb + 1 }],
        css: [{ name: 'a.css', kb: BUDGETS.maxCssTotalKb + 1 }],
        jsTotalKb: BUDGETS.maxJsTotalKb + 1,
        cssTotalKb: BUDGETS.maxCssTotalKb + 1,
    });
    assert.equal(violations.length, 3);
    assert.match(violations[0], /gros\.js/);
});

test('intégration continue : chaque garde-fou local est rejoué avant toute livraison', () => {
    const workflow = read('.github/workflows/ci.yml');
    for (const step of ['npm ci', 'tsc --noEmit', 'check-architecture.mjs', 'check:i18n', 'check:headers', 'check:secrets', 'npm test', 'npm run build', 'check:bundle']) {
        assert.ok(workflow.includes(step), `étape absente de la CI : ${step}`);
    }
    assert.ok(read('.github/dependabot.yml').includes('package-ecosystem: npm'));
});

test('en-têtes de sécurité : la production refuse le cadrage externe et le HTTP simple', () => {
    const config = JSON.parse(read('vercel.json')) as { headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }> };
    const global = config.headers.find(block => block.source === '/(.*)');
    assert.ok(global, 'bloc global absent');
    const headers = new Map(global.headers.map(header => [header.key.toLowerCase(), header.value]));
    assert.equal(headers.get('strict-transport-security')?.includes('includeSubDomains'), true);
    assert.equal(headers.get('x-content-type-options'), 'nosniff');
    assert.ok(headers.get('content-security-policy')?.includes("frame-ancestors 'self'"));
    assert.ok(headers.get('permissions-policy')?.includes('camera=()'));
});

test('observabilité : les Core Web Vitals et les erreurs sont mesurés au démarrage', () => {
    const main = read('src/app/main.tsx');
    assert.match(main, /initWebVitals\(\)/);
    const boundary = read('src/app/App.tsx');
    assert.match(boundary, /<AppErrorBoundary onError=\{reportAppError\}>/);
    assert.match(read('.env.example'), /VITE_WEB_VITALS_ENDPOINT=\n?/);
});
