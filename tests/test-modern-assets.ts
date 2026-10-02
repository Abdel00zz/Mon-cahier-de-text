import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import postcss, { list } from 'postcss';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { modernMathFonts } from '../build/vite/modern-math-fonts';
import { DeferredMount } from '../src/components/ui/DeferredMount';

test('KaTeX : toutes les familles et variantes conservées avec leur source WOFF2', async () => {
  const require = createRequire(import.meta.url);
  const source = readFileSync(require.resolve('katex/dist/katex.min.css'), 'utf8');
  const faces = (css: string) => {
    const result: string[][] = [];
    postcss.parse(css).walkAtRules('font-face', rule => {
      const declarations = new Map<string, string>();
      rule.walkDecls(declaration => { declarations.set(declaration.prop, declaration.value); });
      result.push(['font-family', 'font-style', 'font-weight', 'src'].map(key => declarations.get(key) ?? ''));
    });
    return result;
  };
  const before = faces(source);
  const after = faces((await postcss([modernMathFonts()]).process(source, { from: undefined })).css);
  assert.ok(before.length >= 20);
  assert.deepEqual(after.map(face => face.slice(0, 3)), before.map(face => face.slice(0, 3)));
  for (const [index, face] of after.entries()) {
    assert.deepEqual(list.comma(face[3]), list.comma(before[index][3]).filter(value => value.includes('woff2')));
    assert.doesNotMatch(face[3], /\.(?:ttf|woff)(?:["')])/);
  }
});

test('polices arabes et futures sources sans WOFF2 : aucun changement', async () => {
  const source = '@font-face{font-family:Arabic;src:url(arabic.ttf) format("truetype")}@font-face{font-family:KaTeX_Future;src:url(future.woff) format("woff")}';
  assert.equal((await postcss([modernMathFonts()]).process(source, { from: undefined })).css, source);
});

test('aide fermée : aucun rendu ni import paresseux avant la première ouverture', () => {
  let renders = 0;
  const Content = () => { renders++; return createElement('div', null, 'Aide'); };
  assert.equal(renderToStaticMarkup(createElement(DeferredMount, { active: false, children: createElement(Content) })), '');
  assert.equal(renders, 0);
  assert.match(renderToStaticMarkup(createElement(DeferredMount, { active: true, children: createElement(Content) })), /Aide/);
  assert.equal(renders, 1);
});
