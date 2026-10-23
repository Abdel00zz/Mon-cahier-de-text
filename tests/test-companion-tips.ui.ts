import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CompanionText, companionTextParts } from '../src/features/assistant/CompanionText';
import { AssistantTips } from '../src/features/assistant/AssistantTips';
import { pedagogicalTipForDay } from '../src/constants/pedagogicalTips';

test('multiple literal highlights preserve mixed Arabic/Latin text and escape user supplied markup', () => {
  const text = 'قسم PC 3 : rappel actif <img onerror="bad()">';
  const parts = companionTextParts(text, ['PC', 'PC 3', 'rappel actif', '', 'PC 3']);
  assert.equal(parts.map(part => part.text).join(''), text);
  assert.deepEqual(parts.filter(part => part.strong).map(part => part.text), ['PC 3', 'rappel actif']);
  const html = renderToStaticMarkup(createElement(CompanionText, { text, highlights: ['PC 3', 'rappel actif'] }));
  assert.equal((html.match(/<strong/g) ?? []).length, 2);
  assert.match(html, /<bdi>PC 3<\/bdi>/);
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img/);
});

test('tips disclose naturally with a source, a bold keyword and accessible native controls in each locale', () => {
  for (const locale of ['ar', 'fr', 'en'] as const) {
    const tip = pedagogicalTipForDay('2026-10-23');
    const html = renderToStaticMarkup(createElement(AssistantTips, { locale, day: '2026-10-23', initiallyOpen: true }));
    assert.match(html, /<details[^>]* open=""/);
    assert.match(html, /<summary>/);
    assert.ok(html.includes(tip.copy[locale].keyword));
    assert.match(html, /<strong/);
    assert.match(html, /rel="noopener noreferrer"/);
    assert.match(html, /type="button"/);
    assert.doesNotMatch(html, /<h[1-6]|assistant-panel__close/);
  }
});
