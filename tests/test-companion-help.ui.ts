import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GUIDE_AR, GUIDE_FR } from '../src/constants/guides';
import { AssistantGuideExcerpt } from '../src/features/assistant/AssistantGuideExcerpt';
import { AssistantGuideHelp } from '../src/features/assistant/AssistantGuideHelp';
import { AssistantPopover } from '../src/features/assistant/AssistantPopover';

test('help excerpts preserve the whole source, its language and warnings, without HTML injection', () => {
  for (const [lang, entries] of [['fr', GUIDE_FR], ['ar', GUIDE_AR]] as const) {
    const chapter = entries.find(entry => entry.id === 'devices')!;
    const section = chapter.sections.find(entry => entry.id === 'data-safety')!;
    const html = renderToStaticMarkup(createElement(AssistantGuideExcerpt, { chapter, section, lang }));
    assert.ok(html.includes(`lang="${lang}"`));
    assert.ok(html.includes(`dir="${lang === 'ar' ? 'rtl' : 'ltr'}"`));
    assert.ok(html.includes(lang === 'fr' ? 'Ne videz pas' : 'تجنب مسح'));
    const unsafe = renderToStaticMarkup(createElement(AssistantGuideExcerpt, {
      chapter: { ...chapter, summary: '<script>unsafe()</script>' }, lang,
      section: { title: '<img onerror="bad">', steps: ['<b>raw</b>', 'Last safety step'] },
    }));
    assert.doesNotMatch(unsafe, /<script>|<img|<b>raw/);
    assert.match(unsafe, /&lt;script&gt;/);
    assert.match(unsafe, /Last safety step/);
  }
});

test('opening help has immediate status, an accessible search field and a return action', () => {
  for (const locale of ['fr', 'ar', 'en'] as const) {
    const html = renderToStaticMarkup(createElement(AssistantGuideHelp, {
      locale, reference: { chapterId: 'dates', sectionId: 'assign' }, onBack: () => {},
      onOpenGuide: async () => true, onGuideOpened: () => {},
    }));
    assert.match(html, /role="status"/);
    assert.match(html, /type="search" aria-label="[^"]+"/);
    assert.match(html, /maxLength="160"/);
    assert.match(html, /assistant-help__back/);
    assert.doesNotMatch(html, /iframe|contenteditable/);
  }
});

test('help remains optional and closed with the robot; loading documentation does not change its appearance', () => {
  const html = renderToStaticMarkup(createElement(AssistantPopover, {
    locale: 'ar', message: { id: 'schedule', title: 'الحصص', detail: 'ضبط الحصص' },
    helpReference: { chapterId: 'schedule' }, onOpenGuide: async () => true,
  }));
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /<agent-robot-avatar/);
  assert.doesNotMatch(html, /type="search"|role="status"/);
});
