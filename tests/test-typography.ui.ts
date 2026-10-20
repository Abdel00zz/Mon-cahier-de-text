import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';
import { classTitleStyle, dashboardTitleStyle } from '../src/constants/classTitleTypography';

test('les titres des cartes, listes et pages respectent la politique commune de la langue', () => {
  for (const rtl of [false, true]) {
    for (const role of ['card', 'list', 'page'] as const) {
      const style = classTitleStyle(rtl, role);
      assert.equal(style.fontFamily, 'var(--font-display)');
      assert.equal(style.fontSize, undefined, 'la famille ne redimensionne pas le titre');
      assert.equal(style, classTitleStyle(rtl, role), 'le rendu réutilise sa recette');
    }
  }
  for (const locale of ['fr', 'ar', 'en'] as const) {
    assert.equal(dashboardTitleStyle(locale).fontFamily, 'var(--font-display)');
  }
});

test('les fontes arabes de titre et de lecture ne peuvent pas capturer le latin', () => {
  const families = new Set(['KOMission Black', 'KOMission', 'Elgharib Hayyakum Allah', 'Elgharib', 'Elgharib Hayyakum Allah Light', 'SamsungOne Arabic']);
  const seen = new Set<string>();
  postcss.parse(readFileSync('src/styles/fonts.css', 'utf8')).walkAtRules('font-face', face => {
    const declarations = new Map<string, string>();
    face.walkDecls(declaration => { declarations.set(declaration.prop, declaration.value); });
    const family = declarations.get('font-family')?.replaceAll("'", '');
    if (!family || !families.has(family)) return;
    seen.add(family);
    const ranges = (declarations.get('unicode-range') ?? '').split(',').map(range => {
      const [start, end = start] = range.trim().replace(/^U\+/i, '').split('-');
      return [Number.parseInt(start, 16), Number.parseInt(end, 16)];
    });
    const covers = (code: number) => ranges.some(([start, end]) => code >= start && code <= end);
    for (const character of 'ClasseÉéàç0123456789') assert.equal(covers(character.codePointAt(0)!), false, `${family} : ${character}`);
    for (const character of 'العربية') assert.equal(covers(character.codePointAt(0)!), true, `${family} : ${character}`);
  });
  assert.deepEqual(seen, families);
});
