import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const pathOf = (path: string) => fileURLToPath(new URL(`../${path}`, import.meta.url));
const exists = (path: string) => existsSync(pathOf(path));

/* L'administration est une interface WEB : elle est publiée sur Vercel et ne
   doit jamais être embarquée dans l'APK, où elle ouvrirait le tableau de bord
   de la direction depuis l'application. */

test('l’administration est publiée sur le web, à /admin.html', () => {
  assert.ok(exists('admin.html'), 'entrée HTML admin à la racine du projet');
  assert.match(read('admin.html'), /\/src\/admin\/index\.tsx/, 'l’entrée admin monte son propre bundle');
  const vercel = JSON.parse(read('vercel.json')) as { rewrites?: Array<{ source: string; destination: string }> };
  assert.ok(
    vercel.rewrites?.some(rule => rule.source === '/admin' && rule.destination === '/admin.html'),
    '/admin mène bien à admin.html',
  );
});

test('l’APK n’embarque jamais l’administration', () => {
  const vite = read('vite.config.ts');
  assert.match(vite, /const nativeBuild = mode === 'android'/, 'le mode natif est explicite');
  assert.match(
    vite,
    /if \(!nativeBuild\) entries\.admin = path\.resolve\(PROJECT_ROOT, 'admin\.html'\)/,
    'l’entrée admin n’existe qu’en compilation web',
  );
  assert.equal(exists('public/admin.html'), false, 'admin.html n’est jamais un actif public copié dans le natif');
  const apk = read('scripts/android/build-apk.mjs');
  assert.match(apk, /must never ship inside the app/, 'la release refuse une administration embarquée');
});

test('un build Android local ne contient aucun fichier d’administration', t => {
  if (!exists('dist-android/assets')) {
    t.skip('aucun build natif local');
    return;
  }
  assert.equal(exists('dist-android/admin.html'), false, 'aucune page admin dans dist-android');
  const assets = readdirSync(pathOf('dist-android/assets'));
  assert.equal(assets.some(name => /^admin[-.]/i.test(name)), false, 'aucun chunk admin dans les actifs natifs');
});
