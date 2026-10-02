import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const directory = fileURLToPath(new URL('.', import.meta.url));
// The editor suite imports CSS; its existing esbuild runner handles those assets.
const suites = readdirSync(directory).filter(file => /^test-.*\.ts$/.test(file) && file !== 'test-editor-engine.ts').sort();
for (const args of [
  ['--import', 'tsx', '--test', ...suites.map(file => `tests/${file}`)],
  ['tests/run-editor-tests.mjs'],
]) {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
