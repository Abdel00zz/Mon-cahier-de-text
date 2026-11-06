#!/usr/bin/env node
/**
 * Hygiène CSS : classes probablement mortes, sélecteurs dupliqués entre
 * feuilles, `!important` et URLs externes. Rapport ONLY : une classe peut être
 * appliquée par une librairie ou une expression dynamique.
 */
import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SRC = path.join(ROOT, 'src');
const OUTPUT = path.join(ROOT, 'artifacts', 'quality', 'css.json');
const IGNORED_CLASSES = new Set(['dark', 'print', 'katex', 'sr-only', 'group', 'peer', 'prose']);

const walk = directory => {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
};

const files = walk(SRC);
const cssFiles = files.filter(file => file.endsWith('.css'));
const code = files.filter(file => /\.(ts|tsx|html)$/.test(file)).map(file => fs.readFileSync(file, 'utf8')).join('\n');
const classUsage = new Map();
const selectorFiles = new Map();
const keyframes = new Map();
let important = 0;
let externalUrls = 0;

for (const file of cssFiles) {
  const source = fs.readFileSync(file, 'utf8');
  let root;
  try { root = postcss.parse(source, { from: file }); } catch { continue; }
  root.walkDecls(decl => {
    if (decl.important) important += 1;
    for (const match of decl.value.matchAll(/url\(\s*['"]?(https?:[^'")]+)/gi)) {
      externalUrls += 1;
      void match;
    }
  });
  root.walkAtRules('keyframes', rule => {
    const list = keyframes.get(rule.params) ?? [];
    list.push(file);
    keyframes.set(rule.params, list);
  });
  root.walkRules(rule => {
    if (rule.parent?.type === 'atrule' && rule.parent.name === 'keyframes') return;
    const selector = rule.selector.replace(/\s+/g, ' ').trim();
    const list = selectorFiles.get(selector) ?? [];
    list.push(file);
    selectorFiles.set(selector, list);
    for (const match of rule.selector.matchAll(/\.([a-zA-Z_][\w-]{3,})/g)) {
      const name = match[1];
      if (IGNORED_CLASSES.has(name)) continue;
      if (!classUsage.has(name)) classUsage.set(name, []);
      classUsage.get(name).push(file);
    }
  });
}

const deadCandidates = [...classUsage.keys()]
  .filter(name => !code.includes(name))
  .sort();
const duplicateSelectors = [...selectorFiles.entries()]
  .filter(([, list]) => new Set(list).size > 1)
  .map(([selector, list]) => ({ selector, files: [...new Set(list)] }))
  .sort((a, b) => a.selector.localeCompare(b.selector));
const duplicateKeyframes = [...keyframes.entries()]
  .filter(([, list]) => new Set(list).size > 1)
  .map(([name, list]) => ({ name, files: [...new Set(list)] }));

const report = {
  cssFiles: cssFiles.length,
  classes: classUsage.size,
  deadCandidates,
  duplicateSelectors,
  duplicateKeyframes,
  important,
  externalUrls,
  generatedAt: new Date().toISOString(),
};
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);

console.log(`CSS : ${cssFiles.length} feuilles, ${classUsage.size} classes, ${deadCandidates.length} candidate(s) morte(s).`);
console.log(`  ${important} !important, ${externalUrls} URL(s) externe(s), ${duplicateSelectors.length} sélecteur(s) dupliqué(s), ${duplicateKeyframes.length} keyframe(s) dupliquée(s).`);
for (const name of deadCandidates.slice(0, 40)) console.log(`  .${name}`);
if (deadCandidates.length > 40) console.log(`  … ${deadCandidates.length - 40} autres dans artifacts/quality/css.json`);
process.exit(0);
