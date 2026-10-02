import { build } from 'esbuild';
import { mkdtemp, rm, rmdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Compile TS without a second loader or a new test dependency.
const directory = await mkdtemp(join(resolve('.'), '.editor-tests-'));
const outfile = join(directory, 'tests.cjs');
try {
  await build({ entryPoints: ['tests/test-editor-engine.ts'], outfile, bundle: true, platform: 'node', format: 'cjs', packages: 'external', logLevel: 'silent' });
  await import(pathToFileURL(outfile).href);
} finally {
  await rm(outfile, { force: true });
  await rm(join(directory, 'tests.css'), { force: true });
  await rmdir(directory);
}
