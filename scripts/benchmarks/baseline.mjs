// Mesure reproductible des builds web et Android.
// Usage : node scripts/benchmarks/baseline.mjs [--label=baseline] [--no-build]
// Écrit docs/audits/<label>.json et docs/audits/<label>.md.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const label = process.argv.find(arg => arg.startsWith('--label='))?.slice(8) || 'baseline';
const skipBuild = process.argv.includes('--no-build');

const build = (args) => {
  const started = performance.now();
  const result = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', ...args],
    { cwd: root, encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error(`vite build ${args.join(' ')} failed:\n${result.stderr}`);
  return Math.round(performance.now() - started);
};

const walk = (dir, base = dir) => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full, base) : [{ file: path.relative(base, full).replaceAll('\\', '/'), bytes: fs.statSync(full).size }];
}) : [];

const kind = (file) => {
  if (/\.(woff2?|ttf|otf)$/i.test(file)) return 'fonts';
  if (/\.m?js$/i.test(file)) return 'js';
  if (/\.css$/i.test(file)) return 'css';
  if (/\.(png|jpe?g|webp|gif|svg|avif|ico)$/i.test(file)) return 'images';
  if (/\.json$/i.test(file)) return 'data';
  return 'other';
};

/** Fichiers chargés au démarrage : scripts, modulepreload et feuilles de style de index.html. */
const initialFiles = (dir) => {
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  const refs = [...html.matchAll(/(?:src|href)="\/?([^"]+\.(?:m?js|css))"/g)].map(match => match[1]);
  const external = [...html.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)].map(match => match[1]);
  return { refs: [...new Set(refs)], external: [...new Set(external)] };
};

const measure = (name, dir, buildMs) => {
  const files = walk(dir);
  const totals = {};
  for (const entry of files) totals[kind(entry.file)] = (totals[kind(entry.file)] ?? 0) + entry.bytes;
  const { refs, external } = initialFiles(dir);
  const sizes = new Map(files.map(entry => [entry.file, entry.bytes]));
  const js = files.filter(entry => kind(entry.file) === 'js');
  return {
    name, buildMs,
    totalBytes: files.reduce((sum, entry) => sum + entry.bytes, 0),
    fileCount: files.length, jsChunks: js.length, totals,
    initialBytes: refs.reduce((sum, ref) => sum + (sizes.get(ref) ?? 0), 0),
    initialFiles: refs.length,
    externalUrlsInIndex: external,
    largestJs: js.sort((a, b) => b.bytes - a.bytes).slice(0, 8),
  };
};

const webMs = skipBuild ? null : build([]);
const web = measure('web', path.join(root, 'dist'), webMs);
const androidMs = skipBuild ? null : build(['--mode', 'android']);
const android = measure('android', path.join(root, 'dist-android'), androidMs);

const variables = fs.readFileSync(path.join(root, 'android/variables.gradle'), 'utf8');
const sdk = (key) => Number(variables.match(new RegExp(`${key}\\s*=\\s*(\\d+)`))?.[1]) || null;
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const report = {
  label, measuredAt: new Date().toISOString(), version: pkg.version, versionCode: pkg.androidVersionCode,
  android: { minSdk: sdk('minSdkVersion'), targetSdk: sdk('targetSdkVersion'), compileSdk: sdk('compileSdkVersion') },
  builds: [web, android],
};

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} Ko`;
const row = (build) => `| ${build.name} | ${build.buildMs ?? '—'} ms | ${kb(build.totalBytes)} | ${build.fileCount} | ${build.jsChunks} | ${kb(build.initialBytes)} (${build.initialFiles}) | ${kb(build.totals.js ?? 0)} | ${kb(build.totals.css ?? 0)} | ${kb(build.totals.fonts ?? 0)} | ${build.externalUrlsInIndex.length} |`;
const markdown = `# Mesures : ${label}

Mesuré le ${report.measuredAt} sur la version ${report.version} (versionCode ${report.versionCode}).
Android : minSdk ${report.android.minSdk}, targetSdk ${report.android.targetSdk}, compileSdk ${report.android.compileSdk}.

| Build | Durée | Total | Fichiers | Chunks JS | Démarrage (fichiers) | JS | CSS | Polices | URL externes |
|---|---|---|---|---|---|---|---|---|---|
${report.builds.map(row).join('\n')}

## URL externes chargées par index.html
${report.builds.map(build => `- ${build.name} : ${build.externalUrlsInIndex.length ? build.externalUrlsInIndex.join(', ') : 'aucune'}`).join('\n')}

## Plus gros chunks JS
${report.builds.map(build => `### ${build.name}\n${build.largestJs.map(entry => `- \`${entry.file}\` : ${kb(entry.bytes)}`).join('\n')}`).join('\n\n')}
`;

const out = path.join(root, 'docs/audits');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, `${label}.json`), JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(path.join(out, `${label}.md`), markdown);
console.log(markdown);
