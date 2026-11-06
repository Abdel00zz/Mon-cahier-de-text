#!/usr/bin/env node
/**
 * Code mort : s'appuie sur Knip (fichiers, exports, types, membres d'enum,
 * dépendances) et ne retient que les chemins de `src/`.
 *
 * La baseline gèle les éléments historiques ; un nouvel export mort échoue.
 * `--update` régénère la baseline (à faire uniquement après revue).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const BASELINE = path.join(ROOT, 'quality', 'dead-code-baseline.json');
const OUTPUT = path.join(ROOT, 'artifacts', 'quality', 'dead-code.json');
const args = new Set(process.argv.slice(2));
const update = args.has('--update');
const knipEntry = path.join(ROOT, 'node_modules', 'knip', 'bin', 'knip.js');

let raw = '';
try {
  raw = execFileSync(process.execPath, [knipEntry, '--reporter', 'json'], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
} catch (error) {
  raw = error.stdout ?? '';
  if (!raw.trim()) {
    console.error('Knip n’a produit aucune sortie JSON.', error.stderr ?? error.message);
    process.exit(2);
  }
}

let parsed;
try { parsed = JSON.parse(raw); }
catch (error) {
  console.error('Sortie Knip illisible.', error.message);
  process.exit(2);
}

const isSrc = value => typeof value === 'string' && (value === 'src' || value.startsWith('src/'));
const items = [];
for (const issue of parsed.issues ?? []) {
  const file = issue.file ?? '';
  for (const entry of issue.files ?? []) {
    if (isSrc(entry.name)) items.push({ kind: 'fichier', file: entry.name, name: entry.name });
  }
  for (const entry of issue.exports ?? []) {
    if (isSrc(file)) items.push({ kind: 'export', file, name: entry.symbol ?? entry.name ?? '?' });
  }
  for (const entry of issue.types ?? []) {
    if (isSrc(file)) items.push({ kind: 'type', file, name: entry.symbol ?? entry.name ?? '?' });
  }
  for (const entry of issue.enumMembers ?? []) {
    if (isSrc(file)) items.push({ kind: 'enum', file, name: entry.symbol ?? entry.name ?? '?' });
  }
  for (const entry of issue.duplicates ?? []) {
    if (isSrc(file)) items.push({ kind: 'doublon', file, name: entry.symbol ?? entry.name ?? '?' });
  }
}
items.sort((a, b) => `${a.file}:${a.kind}:${a.name}`.localeCompare(`${b.file}:${b.kind}:${b.name}`));

const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : { items: [] };
const known = new Set((baseline.items ?? []).map(item => typeof item === 'string' ? item : `${item.file}:${item.kind}:${item.name}`));
const fresh = items.filter(item => !known.has(`${item.file}:${item.kind}:${item.name}`));
const fixed = [...known].filter(key => !items.some(item => `${item.file}:${item.kind}:${item.name}` === key));

if (update) {
  fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
  fs.writeFileSync(BASELINE, `${JSON.stringify({ items }, null, 2)}\n`);
}

const report = { scanned: parsed.issues?.length ?? 0, items, fresh, fixed, generatedAt: new Date().toISOString() };
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Code mort : ${items.length} élément(s) dans src/.`);
for (const item of items) console.log(`  ${item.file} [${item.kind}] ${item.name}`);
if (fresh.length) {
  console.error(`\n${fresh.length} nouvel(aux) élément(s) mort(s) hors baseline :`);
  for (const item of fresh) console.error(`  ${item.file} [${item.kind}] ${item.name}`);
}
if (fixed.length) console.log(`${fixed.length} élément(s) de baseline ont disparu : relancer quality:update.`);
process.exit(fresh.length ? 1 : 0);
