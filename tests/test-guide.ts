import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { GUIDE_FR, GUIDE_AR, normalizeGuideSearch, searchGuide } from '../src/constants/guides';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GuideFigure } from '../src/features/guide/GuideFigure';
import { GuideText } from '../src/features/guide/GuideText';

assert.deepEqual(GUIDE_FR.map(entry => entry.id), GUIDE_AR.map(entry => entry.id), 'Same chapters and order in FR/AR');
const ids = new Set(GUIDE_FR.map(entry => entry.id));
assert.equal(ids.size, GUIDE_FR.length, 'Unique chapter IDs');
assert.ok(ids.size >= 18);
const assets = new Set<string>();
for (const [lang, entries] of [['fr', GUIDE_FR], ['ar', GUIDE_AR]] as const) {
  assert.deepEqual(searchGuide(entries, '  '), entries);
  assert.equal(searchGuide(entries, 'xyz-no-such-action-987').length, 0);
  for (const entry of entries) {
    assert.ok(entry.title && entry.summary && entry.sections.length, `${lang}/${entry.id}: complete content`);
    for (const related of entry.related) assert.ok(ids.has(related), `${lang}/${entry.id}: broken related link ${related}`);
    if (!entry.image) continue;
    assert.match(entry.image.key, /^[a-z-]+$/, 'Local, safe asset name');
    const path = new URL(`../public/guide/current/${entry.image.key}-${lang}.webp`, import.meta.url);
    const bytes = await readFile(path);
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', 'Real captured asset is present');
    assert.ok((await stat(path)).size > 1000);
    const figure = renderToStaticMarkup(createElement(GuideFigure, { image: entry.image, lang }));
    assert.ok(figure.includes(`/guide/current/${entry.image.key}-${lang}.webp`));
    assert.ok(figure.includes('aria-expanded="false"'), 'Image can be enlarged for reading');
    assert.ok(figure.includes('<img') && figure.includes('<figcaption>'));
    assert.doesNotMatch(figure, /guide-demo-|guide-illustration|data-guide-scene/, 'No invented interface');
    assert.ok(figure.includes(lang === 'ar' ? 'إصدار سابق' : 'version antérieure'), 'Historical capture is identified');
    assert.equal(bytes.toString('ascii', 12, 16), 'VP8 ');
    const width = bytes.readUInt16LE(26) & 0x3fff;
    const height = bytes.readUInt16LE(28) & 0x3fff;
    assert.ok(figure.includes(`width="${width}" height="${height}"`), 'Intrinsic dimensions match capture');
    assets.add(path.href);
  }
}
assert.equal(normalizeGuideSearch('Échéances'), normalizeGuideSearch('echeances'));
assert.equal(normalizeGuideSearch('إِشْعَارَات'), normalizeGuideSearch('اشعارات'));
assert.ok(searchGuide(GUIDE_FR, 'cycle').some(entry => entry.id === 'profile'));
assert.ok(searchGuide(GUIDE_AR, 'اشعارات').some(entry => entry.id === 'notifications'));
assert.ok(searchGuide(GUIDE_FR, 'date séance').length > 0);
assert.equal(assets.size, 14, 'Seven real captured screens in both languages');
for (const entries of [GUIDE_FR, GUIDE_AR]) {
  const allText = JSON.stringify(entries);
  assert.doesNotMatch(allText, /Ne plus avertir pour cette date|عدم التنبيه إلى هذا التاريخ مجدداً|monter\/descendre|Suivi pédagogique/);
  assert.ok(entries.some(entry => entry.id === 'students'));
  assert.ok(JSON.stringify(entries.find(entry => entry.id === 'students')).includes('؛'));
}
assert.ok(searchGuide(GUIDE_FR, 'élèves liste').some(entry => entry.id === 'students'));
assert.ok(searchGuide(GUIDE_AR, 'لائحة تلاميذ').some(entry => entry.id === 'students'));
assert.ok(searchGuide(GUIDE_FR, 'déplacement').some(entry => entry.id === 'editor'));
const richText = renderToStaticMarkup(createElement(GuideText, { children: 'Paramètres → Profil, الإعدادات, $x^2$ <script>alert(1)</script>' }));
assert.ok(richText.includes('<strong>Paramètres → Profil</strong>'));
assert.ok(richText.includes('<strong>الإعدادات</strong>'));
assert.ok(richText.includes('<code dir="ltr">$x^2$</code>'));
assert.ok(!richText.includes('<script>'), 'Guide text never injects HTML');
const modal = await readFile(new URL('../src/features/guide/GuideModal.tsx', import.meta.url), 'utf8');
assert.ok(modal.includes('<GuideFigure') && modal.includes('<GuideText'), 'Modal must use the image and emphasis renderers');
assert.ok(modal.includes('BOUDOUH ABDELMALEK') && modal.includes('بدوح عبد المالك'), 'Bilingual author credit');
assert.doesNotMatch(modal, /CircleHelp/, 'The guide heading has no duplicate question-mark icon');
console.log(`Guide OK: ${ids.size} bilingual chapters, search, links, ${assets.size} real screenshots with explicit provenance.`);
