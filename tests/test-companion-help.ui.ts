import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AssistantPopover } from '../src/features/assistant/AssistantPopover';
import { companionHelpCopy } from '../src/features/assistant/companionHelpCopy';

test('help action provides direct access to the guide without nested search or summary excerpt', () => {
  for (const locale of ['fr', 'ar', 'en'] as const) {
    const copy = companionHelpCopy(locale);
    let targetReference: object | null = null;
    const html = renderToStaticMarkup(createElement(AssistantPopover, {
      locale,
      message: { id: 'schedule', title: 'Schedule', detail: 'Vérifiez vos horaires.' },
      helpReference: { chapterId: 'dates', sectionId: 'assign' },
      onOpenGuide: async ref => { targetReference = ref; return true; },
    }));

    // The robot avatar is rendered
    assert.match(html, /<agent-robot-avatar/);

    // No intermediate search input, no nested status, no excerpt iframe/sub-panel
    assert.doesNotMatch(html, /type="search"/);
    assert.doesNotMatch(html, /assistant-help__search/);
    assert.doesNotMatch(html, /assistant-help__results/);
    assert.doesNotMatch(html, /assistant-help__back/);
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
