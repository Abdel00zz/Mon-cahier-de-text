// Audit i18n : (1) parité FR/EN/AR, (2) clés t('...') utilisées dans le code
// mais absentes des messages (affichage de la clé brute).
// Usage : node scripts/audit-i18n.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const LOCALE_FILE = join(ROOT, 'i18n', 'LocaleProvider.tsx');

const file = readFileSync(LOCALE_FILE, 'utf8');

const extract = (name) => {
  const startMarker = `  ${name}: {\n`;
  const start = file.indexOf(startMarker);
  const bodyStart = start + startMarker.length;
  const end = file.indexOf('\n  },', bodyStart);
  return file.slice(bodyStart, end);
};

const decode = (s) => s.replace(/\\'/g, "'").replace(/\\n/g, '\n').replace(/\\\\/g, '\\');

const parsePairs = (text) => {
  const map = new Map();
  const re = /'((?:[^'\\]|\\.)*)'\s*:\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const raw = m[2];
    const value = raw[0] === "'" ? decode(raw.slice(1, -1).replace(/\\'/g, "'")) : decode(raw.slice(1, -1).replace(/\\"/g, '"'));
    map.set(decode(m[1]), value);
  }
  return map;
};

const fr = parsePairs(extract('fr'));
const en = parsePairs(extract('en'));
const ar = parsePairs(extract('ar'));

// ---- (1) parité ----
const onlyIn = (a, b, label) => [...a.keys()].filter((k) => !b.has(k)).map((k) => `${label} : ${k}`);
const parity = [
  ...onlyIn(en, fr, 'EN sans FR'),
  ...onlyIn(ar, fr, 'AR sans FR'),
  ...onlyIn(fr, en, 'FR sans EN'),
  ...onlyIn(fr, ar, 'FR sans AR'),
];
console.log(`Clés : FR=${fr.size} EN=${en.size} AR=${ar.size}`);
console.log(`\n[Parité] différences (${parity.length}) :`);
for (const p of parity) console.log('  ' + p);

// ---- (2) clés utilisées dans le code ----
const walk = (dir, out = []) => {
  for (const entry of readdirSync(dir)) {
    if (['node_modules', 'dist', '.git', '.qwen'].includes(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (['.ts', '.tsx'].includes(extname(entry))) out.push(full);
  }
  return out;
};

const usedKeys = new Map(); // key -> [files]
const addKey = (key, filePath) => {
  if (!key) return;
  const rel = filePath.replace(ROOT, '');
  if (!usedKeys.has(key)) usedKeys.set(key, []);
  if (!usedKeys.get(key).includes(rel)) usedKeys.get(key).push(rel);
};

const keyRe = [
  /\bt\(\s*'((?:[^'\\]|\\.)*)'/g,
  /\bt\(\s*"((?:[^"\\]|\\.)*)"/g,
  /translateLocaleMessage\(\s*[^,]+,\s*'((?:[^'\\]|\\.)*)'/g,
];

for (const filePath of walk(ROOT)) {
  const src = readFileSync(filePath, 'utf8');
  for (const re of keyRe) {
    let m;
    while ((m = re.exec(src)) !== null) addKey(decode(m[1]), filePath);
  }
}

const missing = [...usedKeys.keys()].filter((k) => !fr.has(k)).sort();
console.log(`\n[Code] clés t('...') absentes des messages (${missing.length}) :`);
for (const k of missing) {
  console.log(`  ${k}`);
  for (const f of usedKeys.get(k)) console.log(`      <- ${f}`);
}
