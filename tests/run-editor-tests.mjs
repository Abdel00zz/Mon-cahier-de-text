import { build } from 'esbuild';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Compile TS without a second loader or a new test dependency. Suites that import CSS or
// components (test-editor-engine.ts and every test-*.ui.ts) run here instead of under tsx.
const suites = ['test-editor-engine.ts', ...(await readdir('tests')).filter(file => /^test-.*\.ui\.ts$/.test(file)).sort()];
const directory = await mkdtemp(join(resolve('.'), '.editor-tests-'));
try {
  await build({
    entryPoints: suites.map(file => `tests/${file}`), outdir: directory, outExtension: { '.js': '.cjs' },
    bundle: true, platform: 'node', format: 'cjs', packages: 'external', logLevel: 'silent',
  });
  for (const file of suites) await import(pathToFileURL(join(directory, file.replace(/\.ts$/, '.cjs'))).href);
} finally {
  await rm(directory, { recursive: true, force: true });
}
