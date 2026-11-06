#!/usr/bin/env node
/**
 * Garde-fou de taille : aucun fichier de code ne doit dépasser 400 lignes.
 *
 * La dette existante est gelée dans `quality/file-size-baseline.json` : un
 * fichier déjà au-dessus peut seulement rétrécir ; un nouveau fichier au-delà
 * de 400 lignes échoue immédiatement. `--update` abaisse les plafonds et
 * supprime les entrées devenues conformes (cliquet).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const BASELINE = path.join(ROOT, 'quality', 'file-size-baseline.json');
const OUTPUT = path.join(ROOT, 'artifacts', 'quality', 'file-size.json');
const MAX_LINES = 400;
const EXTENSIONS = new Set(['.ts', '.tsx', '.css']);
const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'dist-android', 'tmp', 'artifacts', 'android']);
const args = new Set(process.argv.slice(2));
const update = args.has('--update');
const jsonOnly = args.has('--json');

const walk = directory => {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (EXTENSIONS.has(path.extname(entry.name))) files.push(full);
  }
  return files;
};

const countLines = source => {
  if (source.length === 0) return 0;
  let lines = 1;
  for (const character of source) if (character === '\n') lines += 1;
  return source.endsWith('\n') ? lines - 1 : lines;
};

const roots = ['src', 'api', 'server'].map(directory => path.join(ROOT, directory)).filter(fs.existsSync);
const files = roots.flatMap(walk)
  .map(file => ({
    file: path.relative(ROOT, file).replace(/\\/g, '/'),
    lines: countLines(fs.readFileSync(file, 'utf8')),
  }))
  .sort((a, b) => b.lines - a.lines || a.file.localeCompare(b.file));

const baseline = fs.existsSync(BASELINE)
  ? JSON.parse(fs.readFileSync(BASELINE, 'utf8'))
  : { max: MAX_LINES, files: {} };
if (!baseline.files) baseline.files = {};

const violations = [];
const warnings = [];
for (const entry of files) {
  if (entry.lines <= MAX_LINES) continue;
  const ceiling = baseline.files[entry.file];
  if (ceiling === undefined) {
    violations.push({ ...entry, ceiling: MAX_LINES, reason: 'nouveau fichier au-delà de 400 lignes' });
  } else if (entry.lines > ceiling) {
    violations.push({ ...entry, ceiling, reason: `dépasse son plafond gelé (${ceiling})` });
  } else if (entry.lines < ceiling) {
    warnings.push({ ...entry, ceiling, reason: 'peut être abaissé au prochain --update' });
  }
}

if (update) {
  const next = { max: MAX_LINES, files: {} };
  for (const entry of files) {
    if (entry.lines > MAX_LINES) next.files[entry.file] = entry.lines;
  }
  fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
  fs.writeFileSync(BASELINE, `${JSON.stringify(next, null, 2)}\n`);
}

const oversized = files
  .filter(entry => entry.lines > MAX_LINES)
  .map(entry => ({ ...entry, ceiling: baseline.files[entry.file] ?? MAX_LINES }));
const report = {
  max: MAX_LINES,
  scanned: files.length,
  oversized: oversized.length,
  violations,
  warnings,
  files: oversized,
  generatedAt: new Date().toISOString(),
};
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);

if (!jsonOnly) {
  console.log(`Taille : ${files.length} fichiers, ${oversized.length} au-delà de ${MAX_LINES} lignes.`);
  if (violations.length) {
    console.error('\nDépassements :');
    for (const violation of violations) console.error(`  ${violation.file} : ${violation.lines} (${violation.reason})`);
  }
  if (warnings.length) console.log(`${warnings.length} plafond(s) peuvent être abaissés (npm run quality:update).`);
}
process.exit(violations.length ? 1 : 0);
