import { readIndexCss } from './readIndexCss';
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
  const arabicFamilies = new Set(['SamsungOne Arabic']);
  const latinFamilies = new Set(['Latin Modern Sans', 'Source Sans 3']);
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

test('le tableau de contenu compose en Computer Modern Sans Serif (Medium, Demi Condensed, Oblique)', () => {
  const editor = readFileSync('src/features/editor/editorTypography.css', 'utf8');
  assert.match(editor, /--notebook-heading:\s*'Computer Modern Sans Serif Demi Condensed'/, 'les titres structurels utilisent Demi Condensed');
  assert.match(editor, /--notebook-paragraph:\s*'Computer Modern Sans Serif Medium'/, 'le corps utilise Medium');
  assert.match(editor, /--notebook-oblique:\s*'Computer Modern Sans Serif Oblique'/, 'les intitulés académiques utilisent Oblique');
  const fonts = readFileSync('src/styles/fonts.css', 'utf8');
  for (const family of ['Computer Modern Sans Serif Medium', 'Computer Modern Sans Serif Demi Condensed', 'Computer Modern Sans Serif Oblique']) {
    assert.ok(fonts.includes(`font-family: '${family}'`), `${family} déclarée`);
  }
  for (const file of ['cmu-sans-serif-medium', 'cmu-sans-serif-demi-condensed', 'cmu-sans-serif-oblique']) {
    assert.ok(fonts.includes(`/fonts/${file}.woff2`), `${file} embarquée, aucune requête réseau`);
  }
});

test('les cellules de date restent centrées et la typographie du cahier s’adapte au téléphone', () => {
  const surface = readFileSync('src/styles/editor-surface.css', 'utf8');
  const row = [
  'src/features/editor/TableRow.tsx',
  'src/features/editor/tableRowCells.tsx',
].map(path => readFileSync(path, 'utf8')).join('\n');
  const session = readFileSync('src/features/editor/SessionGroupRow.tsx', 'utf8');
  const table = readFileSync('src/features/editor/MainTable.tsx', 'utf8');

  assert.match(surface, /--editor-fs-date:\s*calc\(var\(--editor-scale\)\s*\*\s*0\.88\)/, 'les dates suivent la même échelle typographique');
  const phone = surface.slice(surface.indexOf('@media (max-width: 639px) and (pointer: coarse)'));
  assert.match(phone, /--editor-scale:\s*max\(0\.73rem,[\s\S]*?var\(--app-text-scale, 1\)/, 'le texte du téléphone descend sous 14 px sans ignorer le réglage de taille');
  const phoneLadder = ['--editor-fs-chapter', '--editor-fs-top', '--editor-fs-section', '--editor-fs-subsection',
    '--editor-fs-subsubsection', '--editor-fs-item-title', '--editor-fs-description', '--editor-fs-remark',
    '--editor-fs-table-main', '--editor-fs-table-side', '--editor-fs-badge'].map(token => {
      const match = phone.match(new RegExp(`${token}:\\s*calc\\(var\\(--editor-scale\\)\\s*\\*\\s*([0-9.]+)\\)`));
      assert.ok(match, `${token} défini pour le téléphone`);
      return Number.parseFloat(match[1]);
    });
  for (let i = 1; i < phoneLadder.length; i++) {
    assert.ok(phoneLadder[i - 1] > phoneLadder[i], 'la hiérarchie du téléphone reste strictement décroissante');
  }
  // Échelle réelle du téléphone ≈ 12 px : les niveaux de LECTURE doivent se
  // distinguer d’au moins 0,7 px, sinon deux titres se confondent.
  for (let i = 1; i < 7; i++) {
    assert.ok((phoneLadder[i - 1] - phoneLadder[i]) * 12 >= 0.7, `l’écart ${phoneLadder[i - 1]} → ${phoneLadder[i]} reste visible`);
  }
  // Les repères (remarque, colonne latérale, badge) peuvent être plus fins,
  // mais jamais sous 9,5 px : une date ou une pastille doit rester lisible.
  for (const multiplier of phoneLadder.slice(7)) {
    assert.ok(multiplier * 12 >= 9.5, `le repère ${multiplier} reste lisible sur téléphone`);
  }
  assert.match(row, /flex h-full min-h-\[48px\] w-full flex-col items-center justify-center/, 'les cellules date simples et fusionnées centrent leur contenu');
  assert.match(session, /data-session-cell="date"[\s\S]*?items-center justify-center/, 'la date d’une séance fusionnée reste centrée');
  assert.match(table, /data-absence-session[\s\S]*?items-center justify-center[\s\S]*?text-center editor-type-table-side/, 'les dates d’absence suivent le même alignement');
  assert.match(surface, /\[data-editor-table\] \.editor-date-value \{ justify-content: center; text-align: center; \}/, 'la date reste centrée même si une classe utilitaire manque');
});

test('les titres structurels restent centrés, le corps du cahier sur le bord de lecture', () => {
  const content = readFileSync('src/features/editor/ContentRenderer.tsx', 'utf8');
  assert.match(content, /editor-type-chapter my-3 flex w-full items-center justify-center text-center/, 'le titre de chapitre est centré');
  assert.match(content, /const justificationClass = 'justify-center text-center'/, 'l’évaluation de tête est centrée');
  assert.doesNotMatch(content, /isCenteredInApp/, 'plus de centrage conditionnel : une seule règle pour les titres de tête');
  const table = readFileSync('src/features/editor/MainTable.tsx', 'utf8');
  assert.match(table, /justify-center border-e border-border\/60 px-1 py-1\.5 text-center[\s\S]{0,140}editor\.date/, 'l’en-tête de la colonne date est centré');
  assert.match(content, /editor-type-section editor-indent-1 font-semibold tracking-tight text-foreground py-1 flex items-baseline gap-1\.5 sm:gap-2 text-start/, 'les sections gardent le bord de lecture');
});

test('tous les blocs de tête occupent la colonne et se centrent', () => {
  // Sans `w-full`, le titre se rétracte sur son texte : `justify-center` ne
  // centrait plus rien et le bloc restait collé au bord de lecture (≈ 48 px
  // d’écart mesurés). Chaque type de tête doit donc porter la largeur entière.
  const types = ['evaluation_diagnostic', 'devoir_maison', 'controle_continu', 'controle_court', 'controle_global',
    'oral', 'correction_devoir_maison', 'correction_controle_continu', 'examen_blanc', 'olympiade', 'concours', 'colle'];
  for (const type of types) {
    const html = renderToStaticMarkup(React.createElement(LocaleProvider, { locale: 'fr', manageDocument: false, children:
      React.createElement(ContentRenderer, {
        data: { type, title: 'Titre du bloc' },
        elementType: type as React.ComponentProps<typeof ContentRenderer>['elementType'],
        indices: { chapterIndex: 0, itemIndex: 0 },
        showDescriptions: true,
      }),
    }));
    assert.match(html, /class="editor-type-top w-full [^"]*justify-center text-center/, `${type} est centré sur toute la largeur de la colonne`);
  }
  const chapter = renderToStaticMarkup(React.createElement(LocaleProvider, { locale: 'fr', manageDocument: false, children:
    React.createElement(ContentRenderer, { data: { type: 'chapter', title: 'Chapitre 1' }, elementType: 'chapter', indices: { chapterIndex: 0 } }),
  }));
  assert.match(chapter, /editor-type-chapter my-3 flex w-full items-center justify-center text-center/, 'le chapitre est centré sur toute la largeur');
});

test('les remarques et les retours système utilisent la police de l’interface', () => {
  const typography = readFileSync('src/styles/typography.css', 'utf8');
  const editor = readFileSync('src/features/editor/editorTypography.css', 'utf8');
  assert.ok(typography.includes("--font-feedback: 'Readex Pro'"));
  assert.ok(!typography.includes(".editor-type-remark[dir='rtl']"));
  assert.ok(editor.includes("--notebook-reading: 'Readex Pro', system-ui, sans-serif"));
  assert.ok(editor.includes('.editor-type-remark, .editor-session-note'));
  assert.ok(editor.includes(':not(.katex, .katex *)'), 'les fontes mathématiques restent autonomes');
});

test('le tableau éditeur recalcule ses polices selon la langue du texte (dir="ltr" vs dir="rtl") même en interface arabe', () => {
  const typography = readFileSync('src/styles/typography.css', 'utf8');
  const indexCss = readIndexCss();

  assert.match(typography, /:where\(\[data-content-direction='ltr'\]\)[\s\S]*?--font-editor-title:\s*var\(--font-latin-display\)/, 'les titres de contenu LTR utilisent la famille de l’interface');
  assert.match(typography, /:where\(\[data-content-direction='ltr'\]\)[\s\S]*?--font-content:\s*var\(--font-latin-reading\)/, 'les blocs LTR reçoivent les polices françaises');
  assert.match(typography, /:where\(\[data-content-direction='rtl'\]\)[\s\S]*?--font-content:\s*var\(--font-arabic-body\)/, 'les blocs RTL reçoivent les polices arabes');
  assert.match(indexCss, /\.editor-type-item-title[\s\S]*?\{\s*font-family:\s*var\(--font-editor-title\);/, 'les titres de définitions/propriétés/exercices lient --font-editor-title (Roboto Slab en français)');
  assert.match(indexCss, /\.editor-type-section[\s\S]*?\{\s*font-family:\s*var\(--font-editor-title\);/, 'les titres de sections lient --font-editor-title');
  assert.match(indexCss, /\.editor-type-subsection[\s\S]*?\{\s*font-family:\s*var\(--font-editor-title\);/, 'les titres de sous-sections lient --font-editor-title');
  assert.match(indexCss, /\.editor-type-subsubsection[\s\S]*?\{\s*font-family:\s*var\(--font-editor-title\);/, 'les titres de sous-sous-sections lient --font-editor-title');
  assert.match(indexCss, /\.editor-type-description\s*\{\s*font-family:\s*var\(--font-content\);/, 'les descriptions lient --font-content sur leur propre direction');
  assert.match(indexCss, /\.editor-type-badge\s*\{\s*font-family:\s*var\(--font-secondary\);/, 'les badges lient --font-secondary sur leur propre direction');

  const hierarchyTokens = [
    '--editor-fs-chapter',
    '--editor-fs-top',
    '--editor-fs-section',
    '--editor-fs-subsection',
    '--editor-fs-subsubsection',
    '--editor-fs-item-title',
    '--editor-fs-description',
    '--editor-fs-remark',
    '--editor-fs-table-main',
    '--editor-fs-table-side',
    '--editor-fs-badge',
  ];
  const multipliers = hierarchyTokens.map(token => {
    const match = indexCss.match(new RegExp(`${token}:\\s*calc\\(var\\(--editor-scale\\)\\s*\\*\\s*([0-9.]+)\\)`));
    assert.ok(match, `${token} doit être proportionnel à --editor-scale`);
    return Number.parseFloat(match[1]);
  });
  for (let i = 1; i < multipliers.length; i++) {
    assert.ok(
      multipliers[i - 1] > multipliers[i],
      `la taille de ${hierarchyTokens[i - 1]} (${multipliers[i - 1]}) doit être strictement supérieure à ${hierarchyTokens[i]} (${multipliers[i]})`,
    );
  }

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
  assert.doesNotMatch(frenchChapterHtml, /font-sans/, 'aucun font-sans codé en dur ne remplace Roboto Slab sur le chapitre');

  const arabicChapterHtml = renderInArabicApp(
    React.createElement(ContentRenderer, {
      data: { type: 'chapter', title: 'الفصل الأول : النهايات والاتصال' },
      elementType: 'chapter',
      indices: { chapterIndex: 0 },
    }),
  );
  assert.match(arabicChapterHtml, /dir="rtl" class="editor-type-chapter/, 'le chapitre arabe est RTL');
});

