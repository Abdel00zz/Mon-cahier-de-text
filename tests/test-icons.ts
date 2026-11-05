import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(path, 'utf8');

// `index.html` annonce `/icons/favicon.ico` ; les navigateurs demandent aussi
// `/favicon.ico` par défaut. Sans fichier, ces requêtes tombaient sur la page
// HTML de secours : icône cassée et erreur visible dans la console et dans le
// service worker.
test('les icônes déclarées par index.html existent réellement', () => {
  const html = read('index.html');
  const declared = [...html.matchAll(/<link[^>]+rel="(?:icon|shortcut icon|apple-touch-icon)"[^>]*href="([^"]+)"/g)]
    .map(([, href]) => href.replace(/^\//, ''));
  assert.ok(declared.length >= 3, 'les icônes d’onglet et d’écran d’accueil sont déclarées');
  for (const path of declared) {
    assert.ok(existsSync(`public/${path}`), `fichier absent pour ${path}`);
  }
  assert.ok(existsSync('public/favicon.ico'), 'la requête par défaut /favicon.ico doit trouver une icône');
});

test('l’icône ICO est un vrai fichier image, pas la page HTML de secours', () => {
  for (const path of ['public/favicon.ico', 'public/icons/favicon.ico']) {
    const icon = readFileSync(path);
    assert.equal(icon.readUInt16LE(2), 1, `${path} : type ICO`);
    assert.equal(icon.readUInt16LE(4), 1, `${path} : une image`);
    assert.ok(icon.length > 1000, `${path} : image réellement embarquée`);
  }
});
