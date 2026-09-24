import { performance } from 'node:perf_hooks';
import { analyzeContentJson } from '../utils/contentDiagnostics';
import { prepareImportedLessons } from '../utils/importPipeline';
import { parseBoundedJson } from '../utils/jsonInput';

// Synthetic corpus, no teacher data. Run with NODE_ENV=production to omit logs.
for (const count of [100, 1_000, 5_000]) {
  const source = JSON.stringify({ lessonsData: [{ type: 'chapter', title: 'Fonctions', sections: [{ name: 'Cours', items: Array.from({ length: count }, (_, i) => ({ type: 'definition', title: `Notion ${i}`, description: 'Pour tout réel $x$, on considère $f(x)=x^2$.' })) }] }] });
  for (const [name, action] of [
    ['parse + normalisation', () => prepareImportedLessons(parseBoundedJson(source))],
    ['diagnostic complet', () => analyzeContentJson(source)],
  ] as const) {
    action();
    const samples = Array.from({ length: 20 }, () => { const start = performance.now(); action(); return performance.now() - start; }).sort((a, b) => a - b);
    console.log(JSON.stringify({ name, items: count, bytes: new TextEncoder().encode(source).length, medianMs: +samples[10].toFixed(2), p95Ms: +samples[18].toFixed(2) }));
  }
}
