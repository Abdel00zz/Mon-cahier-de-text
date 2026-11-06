import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

/*
 * Le premier affichage ne doit dépendre d'aucun réseau tiers. Les familles
 * utilisées par l'interface sont embarquées dans `src/styles/fonts.css` ;
 * Google Fonts ne doit donc jamais revenir dans la coque.
 */
test('index.html ne charge aucune ressource distante', () => {
  const html = readFileSync('index.html', 'utf8');
  assert.doesNotMatch(html, /fonts\.(?:googleapis|gstatic)\.com/);
  assert.doesNotMatch(html, /<link[^>]+href=["']https?:\/\//);
});

test('toutes les fontes déclarées existent dans public/', () => {
  for (const file of ['src/styles/fonts.css', 'src/styles/editor-surface.css']) {
    const css = readFileSync(file, 'utf8');
    for (const match of css.matchAll(/url\(['"]?(\/[^'")]+\.(?:ttf|otf|woff2?))/g)) {
      const asset = `public${match[1]}`;
      assert.ok(existsSync(asset), `${file} référence ${match[1]}, absent de public/`);
    }
  }
});

test('aucune fonte dupliquée entre public/ et public/fonts/', () => {
  for (const name of ['SamsungOneArabic-400.ttf']) {
    assert.equal(existsSync(`public/${name}`), false, `public/${name} doit rester unique`);
    assert.equal(existsSync(`public/fonts/${name}`), true, `public/fonts/${name} est la copie servie`);
  }
});
