import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import postcss from 'postcss';
import { classTitleStyle, dashboardTitleStyle } from '../src/constants/classTitleTypography';
import { ContentRenderer } from '../src/features/editor/ContentRenderer';
import { LocaleProvider } from '../src/i18n/LocaleProvider';

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

test('les fontes arabes et latines ont des plages unicode disjointes sans mélange', () => {
  const arabicFamilies = new Set(['KOMission Black', 'KOMission', 'Elgharib Hayyakum Allah', 'Elgharib', 'Elgharib Hayyakum Allah Light', 'SamsungOne Arabic']);
  const latinFamilies = new Set(['Inter', 'Roboto Slab', 'Latin Modern Sans', 'Source Sans 3']);
  const seenArabic = new Set<string>();
  const seenLatin = new Set<string>();
  postcss.parse(readFileSync('src/styles/fonts.css', 'utf8')).walkAtRules('font-face', face => {
    const declarations = new Map<string, string>();
    face.walkDecls(declaration => { declarations.set(declaration.prop, declaration.value); });
    const family = declarations.get('font-family')?.replaceAll("'", '');
    if (!family) return;
    const parseRanges = () => (declarations.get('unicode-range') ?? '').split(',').map(range => {
      const [start, end = start] = range.trim().replace(/^U\+/i, '').split('-');
      return [Number.parseInt(start, 16), Number.parseInt(end, 16)];
    });
    const covers = (ranges: number[][], code: number) => ranges.some(([start, end]) => code >= start && code <= end);
    if (arabicFamilies.has(family)) {
      seenArabic.add(family);
      const ranges = parseRanges();
      for (const character of 'ClasseÉéàç0123456789') assert.equal(covers(ranges, character.codePointAt(0)!), false, `${family} : ${character}`);
      for (const character of 'العربية') assert.equal(covers(ranges, character.codePointAt(0)!), true, `${family} : ${character}`);
    }
    if (latinFamilies.has(family)) {
      seenLatin.add(family);
      const ranges = parseRanges();
      for (const character of 'ClasseÉéàç') assert.equal(covers(ranges, character.codePointAt(0)!), true, `${family} : ${character}`);
      for (const character of 'العربية') assert.equal(covers(ranges, character.codePointAt(0)!), false, `${family} : ${character}`);
    }
  });
  assert.deepEqual(seenArabic, arabicFamilies);
  assert.deepEqual(seenLatin, latinFamilies);
});

test('les toasts et le statut de synchronisation utilisent la police Samsung en arabe', () => {
  const typography = readFileSync('src/styles/typography.css', 'utf8');
  assert.match(typography, /--font-feedback:\s*'SamsungOne Arabic',\s*'SamsungOne'/, 'jeton de police Samsung pour les retours');
  assert.match(typography, /\[data-sonner-toaster\]:lang\(ar\)[\s\S]*?\[data-sonner-toast\]:lang\(ar\)[\s\S]*?\.editor-sync-status:lang\(ar\)\s*\{\s*font-family:\s*var\(--font-feedback\);/, 'toasts et statut de synchronisation en arabe');
});

test('le tableau éditeur recalcule ses polices selon la langue du texte (dir="ltr" vs dir="rtl") même en interface arabe', () => {
  const typography = readFileSync('src/styles/typography.css', 'utf8');
  const indexCss = readFileSync('src/styles/index.css', 'utf8');

  assert.match(typography, /:where\(\[data-content-direction='ltr'\]\)[\s\S]*?--font-content:\s*var\(--font-latin-reading\)/, 'les blocs LTR reçoivent les polices françaises');
  assert.match(typography, /:where\(\[data-content-direction='rtl'\]\)[\s\S]*?--font-content:\s*var\(--font-arabic-body\)/, 'les blocs RTL reçoivent les polices arabes');
  assert.match(indexCss, /\.editor-type-item-title\s*\{\s*font-family:\s*var\(--font-content\);/, 'les titres de définitions/propriétés/exercices lient --font-content sur leur propre direction');
  assert.match(indexCss, /\.editor-type-description\s*\{\s*font-family:\s*var\(--font-content\);/, 'les descriptions lient --font-content sur leur propre direction');
  assert.match(indexCss, /\.editor-type-badge\s*\{\s*font-family:\s*var\(--font-secondary\);/, 'les badges lient --font-secondary sur leur propre direction');

  const renderInArabicApp = (element: React.ReactElement) =>
    renderToStaticMarkup(React.createElement(LocaleProvider, { locale: 'ar', manageDocument: false, children: element }));

  const frenchItemHtml = renderInArabicApp(
    React.createElement(ContentRenderer, {
      data: {
        type: 'definition',
        number: '1',
        title: 'Continuité d’une fonction sur un intervalle',
        description: 'Soit $f$ une fonction définie sur $I$.\n1) $f$ est continue sur $I$.',
        page: '42',
      },
      elementType: 'item',
      indices: { chapterIndex: 0, itemIndex: 0 },
      showDescriptions: true,
    }),
  );

  assert.match(frenchItemHtml, /dir="ltr" class="editor-lesson-row/, 'la ligne française est détectée LTR en app arabe');
  assert.match(frenchItemHtml, /editor-kind-badge editor-type-badge[^"]*" dir="ltr"/, 'le badge DÉF reste LTR');
  assert.match(frenchItemHtml, /dir="ltr" class="editor-type-item-title/, 'le titre français reste LTR');
  assert.match(frenchItemHtml, /editor-type-description[^"]*"[^>]*dir="ltr"><bdi dir="ltr">Soit/, 'la description française reste LTR');
  assert.match(frenchItemHtml, /dir="ltr" class="col-start-2 editor-type-page/, 'la référence de page reste LTR');

  const arabicItemHtml = renderInArabicApp(
    React.createElement(ContentRenderer, {
      data: {
        type: 'propriete',
        number: '2',
        title: 'اتصال دالة على مجال',
        description: 'لتكن $f$ دالة معرفة على مجال $I$.',
      },
      elementType: 'item',
      indices: { chapterIndex: 0, itemIndex: 1 },
      showDescriptions: true,
    }),
  );

  assert.match(arabicItemHtml, /dir="rtl" class="editor-lesson-row/, 'la ligne arabe est détectée RTL');
  assert.match(arabicItemHtml, /dir="rtl" class="editor-type-item-title/, 'le titre arabe est RTL');
  assert.match(arabicItemHtml, /editor-type-description[^"]*"[^>]*dir="rtl"><bdi dir="rtl">لتكن/, 'la description arabe est RTL');

  const frenchChapterHtml = renderInArabicApp(
    React.createElement(ContentRenderer, {
      data: { type: 'chapter', title: 'Chapitre 1 : Limites et continuité' },
      elementType: 'chapter',
      indices: { chapterIndex: 0 },
    }),
  );
  assert.match(frenchChapterHtml, /dir="ltr" class="editor-type-chapter/, 'le chapitre français reste LTR en app arabe');

  const arabicChapterHtml = renderInArabicApp(
    React.createElement(ContentRenderer, {
      data: { type: 'chapter', title: 'الفصل الأول : النهايات والاتصال' },
      elementType: 'chapter',
      indices: { chapterIndex: 0 },
    }),
  );
  assert.match(arabicChapterHtml, /dir="rtl" class="editor-type-chapter/, 'le chapitre arabe est RTL');
});

