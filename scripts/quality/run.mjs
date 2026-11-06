#!/usr/bin/env node
/**
 * Orchestrateur qualité : taille, cycles, code mort, i18n et CSS.
 *
 * Gates bloquants : taille (cliquet 400 lignes), cycles (baseline), code mort
 * (baseline). Les analyses i18n/CSS sont advisory : elles produisent des
 * candidats à revue, jamais une suppression automatique.
 *
 * Usage : node scripts/quality/run.mjs [--update] [--ci]
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const QUALITY = path.join(ROOT, 'artifacts', 'quality');
const args = new Set(process.argv.slice(2));
const update = args.has('--update');
const ci = args.has('--ci');

const steps = [
  { name: 'file-size', script: 'file-size.mjs', strict: true, label: 'Taille des fichiers' },
  { name: 'cycles', script: 'cycles.mjs', strict: true, label: 'Cycles d’imports' },
  { name: 'dead-code', script: 'dead-code.mjs', strict: true, label: 'Code mort' },
  { name: 'i18n-unused', script: 'i18n-unused.mjs', strict: false, label: 'Traductions inutilisées' },
  { name: 'css', script: 'css-dead.mjs', strict: false, label: 'Hygiène CSS' },
];

fs.mkdirSync(QUALITY, { recursive: true });
const results = [];
for (const step of steps) {
  const script = path.join(ROOT, 'scripts', 'quality', step.script);
  const command = [script, ...(update && step.strict ? ['--update'] : [])];
  let status = 0;
  try {
    execFileSync(process.execPath, command, { cwd: ROOT, stdio: 'inherit' });
  } catch (error) {
    status = error.status ?? 1;
  }
  results.push({ ...step, status });
}

const readJson = name => {
  try { return JSON.parse(fs.readFileSync(path.join(QUALITY, `${name}.json`), 'utf8')); }
  catch { return null; }
};
const size = readJson('file-size');
const cycles = readJson('cycles');
const dead = readJson('dead-code');
const i18n = readJson('i18n-unused');
const css = readJson('css');

const strictFailures = results.filter(result => result.strict && result.status !== 0);
const lines = [
  '# Rapport qualité',
  '',
  `Généré : ${new Date().toISOString()}`,
  '',
  '| Contrôle | Résultat |',
  '| --- | --- |',
  `| Fichiers > 400 lignes | ${size?.oversized ?? '?'} (${size?.violations?.length ?? '?'} hors baseline) |`,
  `| Cycles | ${cycles?.cycles?.length ?? '?'} (${cycles?.fresh?.length ?? '?'} nouveaux) |`,
  `| Code mort dans src/ | ${dead?.items?.length ?? '?'} (${dead?.fresh?.length ?? '?'} nouveaux) |`,
  `| Clés i18n candidates | ${i18n?.unused ?? '?'} / ${i18n?.defined ?? '?'} |`,
  `| Classes CSS candidates | ${css?.deadCandidates?.length ?? '?'} |`,
  `| !important | ${css?.important ?? '?'} |`,
  '',
  `Gate : ${strictFailures.length ? `ÉCHEC (${strictFailures.map(result => result.name).join(', ')})` : 'OK'}`,
];

if (size?.files?.length) {
  lines.push('', '## Fichiers au-delà de 400 lignes', '', '| Fichier | Lignes | Plafond |', '| --- | ---: | ---: |');
  for (const file of size.files.slice(0, 50)) lines.push(`| \`${file.file}\` | ${file.lines} | ${file.ceiling ?? 400} |`);
}

if (i18n?.candidates?.length) {
  lines.push('', '## Traductions candidates au nettoyage', '');
  for (const key of i18n.candidates.slice(0, 80)) lines.push(`- \`${key}\``);
  if (i18n.candidates.length > 80) lines.push(`- … ${i18n.candidates.length - 80} autres dans \`artifacts/quality/i18n-unused.json\``);
}

if (css?.deadCandidates?.length) {
  lines.push('', '## Classes CSS candidates', '');
  for (const name of css.deadCandidates.slice(0, 80)) lines.push(`- \`.${name}\``);
  if (css.deadCandidates.length > 80) lines.push(`- … ${css.deadCandidates.length - 80} autres dans \`artifacts/quality/css.json\``);
}

const report = lines.join('\n') + '\n';
fs.writeFileSync(path.join(QUALITY, 'report.md'), report);
fs.writeFileSync(path.join(QUALITY, 'report.json'), `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  steps: results,
  size: size ? { oversized: size.oversized, violations: size.violations } : null,
  cycles: cycles ? { count: cycles.cycles.length, fresh: cycles.fresh } : null,
  dead: dead ? { count: dead.items.length, fresh: dead.fresh } : null,
  i18n: i18n ? { defined: i18n.defined, unused: i18n.unused } : null,
  css: css ? { classes: css.classes, deadCandidates: css.deadCandidates.length, important: css.important } : null,
  strictFailures: strictFailures.map(result => result.name),
}, null, 2)}\n`);

if (ci && process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
}

console.log(`\nQualité : ${strictFailures.length ? 'ÉCHEC' : 'OK'} — rapport artifacts/quality/report.md`);
process.exit(strictFailures.length ? 1 : 0);
