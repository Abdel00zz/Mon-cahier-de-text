import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider } from '../i18n/LocaleProvider';
import { DualProgressBar } from '../components/ui/dual-progress-bar';
import type { AppLocale } from '../types';

const render = (value: number | null, target: number | null = 70, locale: AppLocale = 'fr') => renderToStaticMarkup(createElement(LocaleProvider, {
  locale, manageDocument: false, children: createElement(DualProgressBar, { value, target, label: 'Mon titre personnel' }),
}));

test('one two-tone track, no visible technical text, accessible personal title', () => {
  const html = render(40);
  assert.equal((html.match(/role="progressbar"/g) ?? []).length, 1);
  assert.match(html, /aria-label="Mon titre personnel"/);
  assert.match(html, /aria-valuenow="40"/);
  assert.match(html, /scaleX\(0\.4\)/);
  assert.match(html, /inset-inline-start:70%/);
  assert.equal(html.replace(/<[^>]*>/g, ''), '');
});

test('RTL reverses the fill origin, not the meaning of progress', () => {
  const html = render(40, 70, 'ar');
  assert.match(html, /dir="rtl"/);
  assert.match(html, /transform-origin:right/);
  assert.match(html, /aria-valuenow="40"/);
});

test('missing or invalid progress stays neutral, without a false zero or a warning', () => {
  for (const value of [null, Number.NaN, Number.POSITIVE_INFINITY]) {
    const html = render(value);
    assert.match(html, /bg-muted/);
    assert.doesNotMatch(html, /aria-valuenow|data-progress-fill|data-progress-target/);
    assert.equal(html.replace(/<[^>]*>/g, ''), '');
  }
});

test('zero, completion and exceeded bounds are safe; missing target is not fabricated', () => {
  assert.match(render(0), /aria-valuenow="0"/);
  assert.match(render(-20), /scaleX\(0\)/);
  assert.match(render(120), /scaleX\(1\)/);
  assert.doesNotMatch(render(40, null), /data-progress-target/);
  assert.doesNotMatch(render(40, 100), /data-progress-target/);
  assert.match(render(80, 60), /inset-inline-start:60%/);
  assert.match(render(40), /motion-reduce:transition-none/);
});

test('analysis modal keeps calendar warnings out of the progression workflow', () => {
  const source = readFileSync(new URL('../features/editor/modals/AnalysisModal.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /calendarWarnings|warningItems|TriangleAlert/);
  assert.match(source, /getDateWarnings\?:/);
});
