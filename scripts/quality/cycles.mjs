#!/usr/bin/env node
/**
 * Détecte les cycles d'imports TypeScript/TSX de `src/`.
 *
 * Les cycles existants sont gelés dans `quality/cycles-baseline.json` ; tout
 * nouveau cycle échoue. Un cycle n'est pas toujours un bug, mais il rend les
 * modules difficiles à tester et à découper : il doit être justifié.
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SRC = path.join(ROOT, 'src');
const BASELINE = path.join(ROOT, 'quality', 'cycles-baseline.json');
const OUTPUT = path.join(ROOT, 'artifacts', 'quality', 'cycles.json');
const args = new Set(process.argv.slice(2));
const update = args.has('--update');

const walk = directory => {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
  return files;
};

const files = walk(SRC);
const fileSet = new Set(files);
const resolveImport = (specifier, from) => {
  let base;
  let relative;
  if (specifier.startsWith('@/')) {
    base = SRC;
    relative = specifier.slice(2);
  } else if (specifier.startsWith('.')) {
    base = path.dirname(from);
    relative = specifier;
  } else return null;
  const candidate = path.resolve(base, relative);
  const names = [
    candidate,
    `${candidate}.ts`, `${candidate}.tsx`,
    path.join(candidate, 'index.ts'), path.join(candidate, 'index.tsx'),
  ];
  if (/\.(?:js|jsx)$/.test(candidate)) {
    const without = candidate.replace(/\.(?:js|jsx)$/, '');
    names.push(`${without}.ts`, `${without}.tsx`, path.join(without, 'index.ts'), path.join(without, 'index.tsx'));
  }
  return names.find(name => fileSet.has(name)) ?? null;
};

const graph = new Map(files.map(file => [file, new Set()]));
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const visit = node => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const resolved = resolveImport(node.moduleSpecifier.text, file);
      if (resolved) graph.get(file).add(resolved);
    }
    // Les imports dynamiques sont des arêtes paresseuses : elles ne participent
    // pas à l'initialisation d'un module et ne doivent pas créer de faux cycles.
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

// Tarjan: composantes fortement connexes.
let index = 0;
const indices = new Map();
const low = new Map();
const stack = [];
const onStack = new Set();
const components = [];
const strongConnect = node => {
  indices.set(node, index);
  low.set(node, index);
  index += 1;
  stack.push(node);
  onStack.add(node);
  for (const next of graph.get(node)) {
    if (!indices.has(next)) {
      strongConnect(next);
      low.set(node, Math.min(low.get(node), low.get(next)));
    } else if (onStack.has(next)) {
      low.set(node, Math.min(low.get(node), indices.get(next)));
    }
  }
  if (low.get(node) === indices.get(node)) {
    const component = [];
    let current;
    do {
      current = stack.pop();
      onStack.delete(current);
      component.push(current);
    } while (current !== node);
    if (component.length > 1) components.push(component);
  }
};
for (const file of files) if (!indices.has(file)) strongConnect(file);

const cycles = components.map(component => {
  const group = component.map(file => path.relative(ROOT, file).replace(/\\/g, '/')).sort();
  return { key: group.join(' -> '), files: group };
}).sort((a, b) => a.key.localeCompare(b.key));

const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : { cycles: [] };
const known = new Set((baseline.cycles ?? []).map(item => typeof item === 'string' ? item : item.key));
const fresh = cycles.filter(cycle => !known.has(cycle.key));
const fixed = [...known].filter(key => !cycles.some(cycle => cycle.key === key));

if (update) {
  fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
  fs.writeFileSync(BASELINE, `${JSON.stringify({ cycles: cycles.map(cycle => cycle.key) }, null, 2)}\n`);
}

const report = {
  scanned: files.length,
  edges: [...graph.values()].reduce((sum, set) => sum + set.size, 0),
  cycles,
  fresh,
  fixed,
  generatedAt: new Date().toISOString(),
};
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Cycles : ${cycles.length} composante(s) cyclique(s) sur ${files.length} fichiers.`);
for (const cycle of cycles) console.log(`  ${cycle.key}`);
if (fresh.length) {
  console.error(`\n${fresh.length} nouveau(x) cycle(s) hors baseline :`);
  for (const cycle of fresh) console.error(`  ${cycle.key}`);
}
if (fixed.length) console.log(`${fixed.length} cycle(s) de baseline ont disparu : relancer quality:update.`);
process.exit(fresh.length ? 1 : 0);
