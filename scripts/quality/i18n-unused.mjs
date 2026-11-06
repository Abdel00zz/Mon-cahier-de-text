#!/usr/bin/env node
/**
 * Traductions potentiellement mortes : compare les clés définies dans
 * `src/i18n/` aux chaînes réellement présentes dans le reste de `src/`.
 *
 * Le scan est volontairement conservateur : une clé est considérée utilisée si
 * son littéral apparaît n'importe où (constante, test, table de libellés) ou si
 * un préfixe de template `\`foo.${…}\`` la couvre. Les résultats sont donc des
 * CANDIDATS à revue, pas une suppression automatique.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SRC = path.join(ROOT, 'src');
const I18N = path.join(SRC, 'i18n');
const OUTPUT = path.join(ROOT, 'artifacts', 'quality', 'i18n-unused.json');
const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'dist-android', 'tmp', 'artifacts', 'android']);

const walk = directory => {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
  return files;
};

const files = walk(ROOT);
const keyPattern = /['"]([a-z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9_-]+)+)['"]\s*:/g;
const keys = new Set();
for (const file of files.filter(file => file.startsWith(I18N))) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(keyPattern)) keys.add(match[1]);
}

const literals = new Set();
const prefixes = new Set();
for (const file of files.filter(file => !file.startsWith(I18N))) {
  const source = fs.readFileSync(file, 'utf8');
  // Les appels explicites priment : une clé peut vivre DANS un template
  // littéral (`${t('analysis.link.matchFor')}`), que le scan générique rate.
  for (const match of source.matchAll(/\bt\(\s*['"]([^'"]+)['"]/g)) literals.add(match[1]);
  for (const match of source.matchAll(/translateLocaleMessage\(\s*[^,]+,\s*['"]([^'"]+)['"]/g)) literals.add(match[1]);
  for (const match of source.matchAll(/['"`]([^'"`\n]+)['"`]/g)) literals.add(match[1]);
  // `evaluations.type.${kind}` -> préfixe `evaluations.type.`
  for (const match of source.matchAll(/`([^`\n]*?)\$\{/g)) {
    const prefix = match[1].trim();
    if (prefix.includes('.')) prefixes.add(prefix);
  }
}

const unused = [];
const used = [];
for (const key of [...keys].sort()) {
  const coveredByPrefix = [...prefixes].some(prefix => key.startsWith(prefix));
  if (literals.has(key) || coveredByPrefix) used.push(key);
  else unused.push(key);
}

const report = {
  defined: keys.size,
  used: used.length,
  unused: unused.length,
  prefixes: [...prefixes].sort(),
  candidates: unused,
  generatedAt: new Date().toISOString(),
};
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);

console.log(`i18n : ${keys.size} clés, ${used.length} utilisées, ${unused.length} candidate(s) au nettoyage.`);
for (const key of unused.slice(0, 40)) console.log(`  ${key}`);
if (unused.length > 40) console.log(`  … ${unused.length - 40} autres dans artifacts/quality/i18n-unused.json`);
process.exit(0);
