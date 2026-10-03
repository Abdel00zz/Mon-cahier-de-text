import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { spawnSync } from 'node:child_process';

// tsx resolves extensionless imports that Node's Vercel ESM runtime rejects.
// Emit the actual server dependency graph, then import every entry with Node.
const root = process.cwd();
const output = path.join(root, 'tmp', 'api-runtime-check');
fs.mkdirSync(output, { recursive: true });
const entries = fs.readdirSync(path.join(root, 'api')).filter(file => file.endsWith('.ts')).map(file => path.join(root, 'api', file));
const program = ts.createProgram(entries, {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
  resolveJsonModule: true, esModuleInterop: true, skipLibCheck: true, strict: true,
  rootDir: root, outDir: output, types: ['node'], baseUrl: root, paths: { '@/*': ['src/*'] },
});
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) {
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, { getCurrentDirectory: () => root, getCanonicalFileName: file => file, getNewLine: () => '\n' }));
  process.exit(1);
}
const extensionless = new Set();
const emitted = program.emit(undefined, (file, content) => {
  fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, content);
  if (!file.endsWith('.js')) return;
  const source = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const visit = node => {
    const module = (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) ? node.moduleSpecifier : undefined;
    if (module && ts.isStringLiteral(module) && module.text.startsWith('.') && !path.extname(module.text)) {
      extensionless.add(`${path.relative(output, file).replaceAll('\\', '/')} : ${module.text}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
});
if (emitted.emitSkipped) throw new Error('Server emit failed');
if (extensionless.size) { console.error('Node ESM requires explicit import extensions:\n' + [...extensionless].join('\n')); process.exit(1); }
fs.writeFileSync(path.join(output, 'package.json'), JSON.stringify({ type: 'module' }));
for (const entry of entries) {
  const url = pathToFileURL(path.join(output, 'api', path.basename(entry, '.ts') + '.js')).href;
  const result = spawnSync(process.execPath, ['--no-experimental-require-module', '--input-type=module', '-e', `await import(${JSON.stringify(url)})`], { stdio: 'pipe', windowsHide: true });
  if (result.status !== 0) {
    console.error(path.basename(entry), result.stderr.toString()); process.exit(1);
  }
}
console.log(`Node ESM runtime: ${entries.length} API modules imported successfully.`);
