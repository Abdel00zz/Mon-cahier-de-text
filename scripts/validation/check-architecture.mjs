import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../..', import.meta.url));
const relative = file => path.relative(root, file).replaceAll('\\', '/');
const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const full = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(full) : /\.(ts|tsx)$/.test(full) ? [full] : [];
});
const config = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
const { options } = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const cache = ts.createModuleResolutionCache(root, file => file, options);
const files = walk(path.join(root, 'src'));
const dependencies = new Map();
const violations = [];
for (const file of files) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const imports = [];
  const visit = node => {
    let specifier;
    let typeOnly = false;
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      specifier = node.moduleSpecifier;
      typeOnly = node.isTypeOnly || node.importClause?.isTypeOnly || node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings) && node.importClause.namedBindings.elements.length > 0 && node.importClause.namedBindings.elements.every(element => element.isTypeOnly) && !node.importClause.name;
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      specifier = node.arguments[0];
    }
    if (specifier && ts.isStringLiteralLike(specifier) && !typeOnly) {
      const module = specifier.text;
      // TypeScript returns forward slashes on Windows; the graph uses native paths.
      const resolved = ts.resolveModuleName(module, file, options, ts.sys, cache).resolvedModule?.resolvedFileName;
      const target = resolved ? path.normalize(resolved) : undefined;
      imports.push({module, target});
      if (target && relative(target).startsWith('api/')) violations.push(`${relative(file)} importe du code serveur privé (${module}).`);
      if (relative(file).startsWith('src/components/ui/') && target && /^src\/(features|admin|app)\//.test(relative(target))) violations.push(`${relative(file)} dépend d’un écran (${module}).`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  dependencies.set(file, imports);
}
for (const file of files.filter(file => relative(file).startsWith('src/domain/'))) {
  const seen = new Set();
  const visit = (current, chain) => {
    if (seen.has(current)) return;
    seen.add(current);
    for (const dependency of dependencies.get(current) ?? []) {
      const next = [...chain, dependency.module];
      if (/^(react|react-dom|framer-motion)(\/|$)/.test(dependency.module) || dependency.target && /^src\/(features|components|contexts|admin|app)\//.test(relative(dependency.target))) {
        violations.push(`${relative(file)} dépend de l’interface : ${next.join(' → ')}.`);
      } else if (dependency.target && dependencies.has(dependency.target)) visit(dependency.target, next);
    }
  };
  visit(file, []);
}
for (const legacy of ['App.tsx', 'index.tsx', 'index.css', 'types.ts', 'constants.ts', 'utils', 'features', 'components', 'hooks', 'contexts', 'admin', 'i18n', 'pwa', 'config', 'constants', 'lib']) {
  if (fs.existsSync(path.join(root, legacy))) violations.push(`Ancien emplacement à la racine : ${legacy}.`);
}
if (violations.length) {
  console.error([...new Set(violations)].join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Architecture valide : ${files.length} modules ; domaine indépendant de React, UI indépendante des écrans, aucun import client vers api/.`);
}
